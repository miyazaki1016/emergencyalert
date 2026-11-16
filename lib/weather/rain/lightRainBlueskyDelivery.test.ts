import { describe, expect, it, vi } from "vitest";
import { deliverLightRainPost, lightRainRecordKey } from "./lightRainBlueskyDelivery";

const base = Date.parse("2026-11-12T16:45:00Z");
const account = { did: "did:plc:test", handle: "test.bsky.social", appPassword: "example" };
const post = { text: "雨の予報", key: lightRainRecordKey(base), validUntil: base + 300_000 };
const uri = `at://${account.did}/app.bsky.feed.post/${post.key}`;
const publicUrl = `https://bsky.app/profile/${account.did}/post/${post.key}`;
const session = () => Response.json({ did: account.did, handle: account.handle, accessJwt: "example" });
const absent = () => Response.json({ error: "RecordNotFound" }, { status: 400 });
const existing = (text = post.text) => Response.json({ uri, cid: "example", value: { text } });
const wait = () => Promise.resolve();

describe("Bluesky light-rain delivery", () => {
  it("uses one valid record key per basetime", () => {
    expect(post.key).toMatch(/^[234567a-z]{13}$/);
    expect(lightRainRecordKey(base + 300_000)).not.toBe(post.key);
  });

  it("reconciles a successful write with a lost response without reposting", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(session()).mockResolvedValueOnce(absent())
      .mockRejectedValueOnce(new Error("connection lost")).mockResolvedValueOnce(existing());
    await expect(deliverLightRainPost(account, post, fetcher, () => base, wait)).resolves.toBe(publicUrl);
    expect(fetcher.mock.calls.filter(([url]) => String(url).includes("createRecord"))).toHaveLength(1);
  });

  it("retries a transient failure only with the same record key", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(session()).mockResolvedValueOnce(absent())
      .mockResolvedValueOnce(Response.json({}, { status: 503 }))
      .mockResolvedValueOnce(absent()).mockResolvedValueOnce(absent())
      .mockResolvedValueOnce(Response.json({ uri, cid: "example" }));
    await expect(deliverLightRainPost(account, post, fetcher, () => base, wait)).resolves.toBe(publicUrl);
    const writes = fetcher.mock.calls.filter(([url]) => String(url).includes("createRecord"));
    expect(writes.map(([, init]) => JSON.parse(String(init?.body)).rkey)).toEqual([post.key, post.key]);
  });

  it("stops on a record collision without attempting a write", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(session()).mockResolvedValueOnce(existing("別の投稿"));
    await expect(deliverLightRainPost(account, post, fetcher, () => base, wait)).rejects.toThrow("different content");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("stops when the authenticated account differs or the forecast is expired", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(session());
    await expect(deliverLightRainPost({ ...account, did: "did:plc:other" }, post, fetcher, () => base))
      .rejects.toThrow("differs");
    await expect(deliverLightRainPost(account, post, fetcher, () => post.validUntil)).rejects.toThrow("expired");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
