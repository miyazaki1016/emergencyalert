import { describe, expect, it, vi } from "vitest";
import { blueskyPostRecord, linkCasePostItems, planCasePosts, type PublicationCase } from "./nationalBlueskyCasePosts";
import type { ForecastPostCandidate } from "./nationalForecastBluesky";
import { blueskyRecordKey, openBlueskySender } from "./nationalBlueskySender";

const now = Date.UTC(2026, 10, 28, 4, 26);
const iso = (time: number) => new Date(time).toISOString();
const cases: PublicationCase[] = Array.from({ length: 7 }, (_, i) => ({
  slug: `1000${i}-20261128-1300`, municipality_code: `1000${i}`, municipality: `検証市${i}`,
  prefecture: i === 6 ? "別県" : "検証県", status: "forecast", first_base: iso(now - 12_000),
}));
const candidates = cases.map((incident, i): ForecastPostCandidate => ({
  key: String(i), municipalityCode: incident.municipality_code, intensity: i === 0 ? 80 : i < 5 ? 50 : 30,
  validTime: iso(now + 15 * 60_000), text: "テスト🌧️".repeat(100),
}));

describe("case-linked Bluesky publications", () => {
  it("uses active slug links, requires three 50mm cases to group, and closes the 30mm digest at the hour", () => {
    const items = linkCasePostItems(candidates, cases.filter((_, i) => i !== 4), now);
    expect(items).toHaveLength(6);
    const urgent = planCasePosts(items, now);
    expect(urgent.map(post => [post.kind, post.items.length])).toEqual([["individual", 1], ["prefecture", 3]]);
    const digest = planCasePosts(items, Date.UTC(2026, 10, 28, 5));
    expect(digest.map(post => [post.kind, post.items.length])).toEqual([["digest", 2]]);
    expect(digest[0].text).toContain("14:00締め");
    for (const post of [...urgent, ...digest]) {
      expect([...new Intl.Segmenter().segment(post.text)].length).toBeLessThanOrEqual(300);
      expect(blueskyPostRecord(post.text, iso(now)).facets).toHaveLength(post.items.length);
      expect(post.items.every(item => post.text.includes(`/cases/${item.slug}`))).toBe(true);
    }
    expect(planCasePosts(items, now, new Set([urgent[0].items[0].item_key]))[0].kind).toBe("prefecture");
  });

  it("uses a stable record ID, recovers an acknowledged post and does not call create again", async () => {
    const post = planCasePosts(linkCasePostItems(candidates, cases, now), now)[0];
    const fetcher = vi.fn(async (url: string | URL) => String(url).includes("createSession")
      ? Response.json({ did: "did:plc:test", accessJwt: "fixture-only" })
      : Response.json({ uri: "at://did:plc:test/app.bsky.feed.post/fixture", value: { text: post.text, embed: {} } }));
    const send = await openBlueskySender({ identifier: "fixture.test", appPassword: "fixture-only", signal: AbortSignal.timeout(5000),
      fetcher: fetcher as typeof fetch });
    const buildVideo = vi.fn();
    expect((await send(post, "1795839960000000", buildVideo, now)).videoStatus).toBe("attached");
    expect(buildVideo).not.toHaveBeenCalled();
    expect(String(fetcher.mock.calls[1][0])).toContain(blueskyRecordKey("1795839960000000", post.id));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("attaches a processed MP4 blob for an individual post with a scoped service token", async () => {
    const now = Date.now();
    const post = planCasePosts(linkCasePostItems([{ ...candidates[0], validTime: iso(now + 60_000) }],
      [{ ...cases[0], first_base: iso(now - 60_000) }], now), now)[0];
    const blob = { $type: "blob", ref: { $link: "mock-cid" }, mimeType: "video/mp4", size: 8 };
    const fetcher = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = new URL(input);
      if (url.pathname.endsWith(".createSession")) {
        return Response.json({ did: "did:plc:test", accessJwt: "test-token",
          didDoc: { service: [{ id: "#atproto_pds", serviceEndpoint: "https://fixture.host.bsky.network" }] } });
      }
      if (url.pathname.endsWith(".getRecord")) return Response.json({ error: "RecordNotFound" }, { status: 404 });
      if (url.pathname.endsWith(".getServiceAuth")) {
        expect(url.searchParams.get("aud")).toBe("did:web:fixture.host.bsky.network");
        expect(url.searchParams.get("lxm")).toBe("com.atproto.repo.uploadBlob");
        return Response.json({ token: "upload-only" });
      }
      if (url.pathname.endsWith(".uploadVideo")) {
        expect(url.hostname).toBe("video.bsky.app");
        expect(new Headers(init?.headers).get("authorization")).toBe("Bearer upload-only");
        return Response.json({ jobStatus: { blob } });
      }
      expect(JSON.parse(String(init?.body)).record.embed.video).toEqual(blob);
      return Response.json({ uri: "at://did:plc:test/app.bsky.feed.post/fixture" });
    });
    const send = await openBlueskySender({ identifier: "fixture.test", appPassword: "fixture-only",
      signal: AbortSignal.timeout(5000), fetcher: fetcher as typeof fetch });
    expect(await send(post, "1795839960000000", async () => Buffer.from("mock-mp4"), now))
      .toMatchObject({ videoStatus: "attached" });
    expect(fetcher).toHaveBeenCalledTimes(5);
  });

  it("falls back to an individual text post when MP4 generation fails", async () => {
    const at = Date.now();
    const post = planCasePosts(linkCasePostItems([{ ...candidates[0], validTime: iso(at + 60_000) }],
      [{ ...cases[0], first_base: iso(at - 60_000) }], at), at)[0];
    const fetcher = vi.fn(async (url: string | URL, init?: RequestInit) => {
      if (String(url).includes("createSession")) return Response.json({ did: "did:plc:test", accessJwt: "fixture-only" });
      if (String(url).includes("getRecord")) return Response.json({ error: "RecordNotFound" }, { status: 404 });
      const payload = JSON.parse(String(init?.body));
      expect(payload.rkey).toBe(blueskyRecordKey("1795839960000000", post.id));
      expect(payload.record.embed).toBeUndefined();
      return Response.json({ uri: "at://did:plc:test/app.bsky.feed.post/fixture" });
    });
    const send = await openBlueskySender({ identifier: "fixture.test", appPassword: "fixture-only",
      signal: AbortSignal.timeout(5000), fetcher: fetcher as typeof fetch });
    expect(await send(post, "1795839960000000", async () => { throw new Error("fixture encoder failure"); }, at))
      .toMatchObject({ videoStatus: "text_fallback", uri: expect.stringMatching(/^at:/) });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
