import { setTimeout as delay } from "node:timers/promises";

const COLLECTION = "app.bsky.feed.post";
const ALPHABET = "234567abcdefghijklmnopqrstuvwxyz";

type Account = { handle: string; did: string; appPassword: string };
type ForecastPost = { text: string; key: string; validUntil: number };

class RpcError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(`Bluesky RPC failed (${status})`);
  }
}

/** One valid AT Protocol TID per forecast cycle for this publisher. */
export function lightRainRecordKey(baseTimeMs: number): string {
  if (!Number.isSafeInteger(baseTimeMs) || baseTimeMs <= 0 || baseTimeMs % 300_000 !== 0) {
    throw new Error("Invalid five-minute JMA basetime");
  }
  let value = (BigInt(baseTimeMs) * 1000n << 10n) | 219n;
  let key = "";
  for (let i = 0; i < 13; i++) {
    key = ALPHABET[Number(value & 31n)] + key;
    value >>= 5n;
  }
  if (value) throw new Error("Basetime exceeds the record-key range");
  return key;
}

/** Use createRecord so an existing key can never overwrite a post. */
export async function deliverLightRainPost(
  account: Account,
  post: ForecastPost,
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now,
  wait: (ms: number) => Promise<unknown> = delay,
): Promise<string> {
  if (!account.appPassword || !/^[a-z0-9.-]+$/.test(account.handle) ||
    !/^did:(plc|web):[a-z0-9.:%-]+$/.test(account.did)) {
    throw new Error("Bluesky account and existing app password are required");
  }
  if (!post.text || Buffer.byteLength(post.text) > 3000 ||
    [...new Intl.Segmenter("ja").segment(post.text)].length > 300 ||
    !/^[234567a-z]{13}$/.test(post.key)) {
    throw new Error("Invalid Bluesky post");
  }
  const assertFresh = () => {
    if (!Number.isFinite(post.validUntil) || now() >= post.validUntil) {
      throw new Error("Forecast expired before Bluesky delivery");
    }
  };
  const rpc = async (method: string, input: RequestInit) => {
    let response: Response;
    try {
      response = await fetcher("https://bsky.social/xrpc/" + method, {
        ...input,
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new RpcError(0, "TransportError");
    }
    const body = await response.json().catch(() => null);
    if (!response.ok || !body) throw new RpcError(response.status, body?.error ?? "");
    return body;
  };

  assertFresh();
  const session = await rpc("com.atproto.server.createSession", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: account.handle, password: account.appPassword }),
  });
  if (session.did !== account.did || session.handle !== account.handle || typeof session.accessJwt !== "string") {
    throw new Error("Bluesky authenticated account differs from the expected account");
  }
  const headers = { authorization: `Bearer ${session.accessJwt}` };
  const identity = { repo: account.did, collection: COLLECTION, rkey: post.key };
  const uri = `at://${account.did}/${COLLECTION}/${post.key}`;
  const publicUrl = `https://bsky.app/profile/${account.did}/post/${post.key}`;
  const readExisting = async () => {
    try {
      const found = await rpc("com.atproto.repo.getRecord?" + new URLSearchParams(identity), { headers });
      if (found.uri !== uri || !found.cid || found.value?.text !== post.text) {
        throw new Error("Bluesky record key is already associated with different content");
      }
      return true;
    } catch (error) {
      if (error instanceof RpcError && [400, 404].includes(error.status) && error.code === "RecordNotFound") return false;
      throw error;
    }
  };
  const record = { $type: COLLECTION, text: post.text, createdAt: new Date(now()).toISOString(), langs: ["ja"] };
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await readExisting()) return publicUrl;
    assertFresh();
    try {
      const created = await rpc("com.atproto.repo.createRecord", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ ...identity, record, validate: true }),
      });
      if (created.uri === uri && created.cid) return publicUrl;
      throw new RpcError(0, "UnconfirmedWrite");
    } catch (error) {
      // Reconcile ambiguous responses and races before considering another write.
      if (await readExisting()) return publicUrl;
      if (!(error instanceof RpcError) || ![0, 429, 500, 502, 503, 504].includes(error.status) || attempt === 2) throw error;
      await wait(1000 * (attempt + 1));
    }
  }
  throw new Error("Bluesky delivery unconfirmed");
}
