import { setTimeout as delay } from "node:timers/promises";
import { blueskyPostRecord, type CasePost } from "./nationalBlueskyCasePosts";

const collection = "app.bsky.feed.post";
const videoOrigin = "https://video.bsky.app";

type Session = { did: string; accessJwt: string; didDoc?: { service?: { id: string; serviceEndpoint: string }[] } };
type VideoStatus = { jobId?: string; state?: string; blob?: unknown };

export function blueskyRecordKey(micros: string, postId: string) {
  const alphabet = "234567abcdefghijklmnopqrstuvwxyz";
  let value = (BigInt(micros) << 10n) | (BigInt("0x" + postId.slice(0, 3)) & 1023n);
  if (value <= 0n || value >= (1n << 63n)) throw new Error("BLUESKY_RECORD_TIME_INVALID");
  let tid = "";
  for (let i = 0; i < 13; i++) {
    tid = alphabet[Number(value & 31n)] + tid;
    value >>= 5n;
  }
  return tid;
}

export async function openBlueskySender({
  identifier, appPassword, signal, fetcher = fetch,
}: { identifier: string; appPassword: string; signal: AbortSignal; fetcher?: typeof fetch }) {
  async function request(url: string | URL, options: RequestInit = {}, bound = signal) {
    return fetcher(url, { ...options, redirect: "error", signal: AbortSignal.any([bound, AbortSignal.timeout(8_000)]) });
  }
  const login = await request("https://bsky.social/xrpc/com.atproto.server.createSession", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password: appPassword }),
  });
  if (!login.ok) throw new Error("BLUESKY_AUTH_FAILED");
  const session: Session = await login.json();
  const service = session.didDoc?.service?.find(item => item.id.endsWith("#atproto_pds"));
  const origin = new URL(service?.serviceEndpoint ?? "https://bsky.social");
  if (origin.protocol !== "https:" || origin.port || origin.username || origin.password
    || !(origin.hostname === "bsky.social" || origin.hostname.endsWith(".host.bsky.network"))
    || !session.did?.startsWith("did:") || !session.accessJwt) throw new Error("BLUESKY_SESSION_INVALID");
  const bearer = { Authorization: `Bearer ${session.accessJwt}` };

  async function videoBlob(bytes: Buffer, id: string) {
    const bound = AbortSignal.any([signal, AbortSignal.timeout(18_000)]);
    const authorization = new URL("/xrpc/com.atproto.server.getServiceAuth", origin);
    authorization.search = new URLSearchParams({ aud: `did:web:${origin.host}`, lxm: "com.atproto.repo.uploadBlob",
      exp: String(Math.floor(Date.now() / 1000) + 1800) }).toString();
    const auth = await request(authorization, { headers: bearer }, bound);
    if (!auth.ok) throw new Error("BLUESKY_VIDEO_AUTH_FAILED");
    const { token } = await auth.json() as { token?: string };
    if (!token) throw new Error("BLUESKY_VIDEO_TOKEN_MISSING");
    const upload = new URL("/xrpc/app.bsky.video.uploadVideo", videoOrigin);
    upload.search = new URLSearchParams({ did: session.did, name: `rain-${id}.mp4` }).toString();
    const response = await request(upload, { method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "video/mp4" },
      body: new Uint8Array(bytes) }, bound);
    const started = await response.json() as VideoStatus & { jobStatus?: VideoStatus };
    let job = started.jobStatus ?? started;
    while (!job.blob) {
      if (!job.jobId || job.state === "JOB_STATE_FAILED") throw new Error("BLUESKY_VIDEO_PROCESSING_FAILED");
      await delay(1000, undefined, { signal: bound });
      const poll = new URL("/xrpc/app.bsky.video.getJobStatus", videoOrigin);
      poll.searchParams.set("jobId", job.jobId);
      const status = await request(poll, {}, bound);
      if (!status.ok) throw new Error("BLUESKY_VIDEO_STATUS_FAILED");
      job = (await status.json() as { jobStatus: VideoStatus }).jobStatus;
    }
    return job.blob;
  }

  return async function send(post: CasePost, micros: string, buildVideo: () => Promise<Buffer>, now = Date.now()) {
    const key = blueskyRecordKey(micros, post.id);
    const lookup = new URL("/xrpc/com.atproto.repo.getRecord", origin);
    lookup.search = new URLSearchParams({ repo: session.did, collection, rkey: key }).toString();
    const existing = await request(lookup, { headers: bearer });
    if (existing.ok) {
      const saved = await existing.json() as { uri?: string; value?: { text?: string; embed?: unknown } };
      if (!saved.uri || saved.value?.text !== post.text) throw new Error("BLUESKY_RECORD_CONFLICT");
      return { uri: saved.uri, videoStatus: saved.value.embed ? "attached" : post.kind === "individual" ? "text_fallback" : "not_applicable" };
    }
    const missing = existing.status === 404 || (existing.status === 400 &&
      (await existing.json() as { error?: string }).error === "RecordNotFound");
    if (!missing) throw new Error("BLUESKY_RECORD_LOOKUP_FAILED");
    if (Date.parse(post.expires_at) <= now) return { uri: null, videoStatus: "expired" };

    let blob: unknown;
    let videoStatus = "not_applicable";
    if (post.kind === "individual") {
      try {
        blob = await videoBlob(await buildVideo(), key);
        videoStatus = "attached";
      } catch {
        videoStatus = "text_fallback";
      }
    }
    if (Date.parse(post.expires_at) <= Date.now()) return { uri: null, videoStatus };
    try {
      const created = await request(new URL("/xrpc/com.atproto.repo.createRecord", origin), {
        method: "POST", headers: { ...bearer, "Content-Type": "application/json" },
        body: JSON.stringify({ repo: session.did, collection, rkey: key, record: blueskyPostRecord(post.text, new Date(now).toISOString(), blob) }),
      });
      if (!created.ok) return { uri: null, videoStatus, retry: true };
      const result = await created.json() as { uri?: string };
      if (result.uri) return { uri: result.uri, videoStatus };
    } catch {
      // The response may have been lost after creation. The next attempt looks up the same key first.
    }
    return { uri: null, videoStatus, retry: true };
  };
}
