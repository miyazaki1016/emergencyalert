import { describe, expect, it } from "vitest";
import { GET as start, POST as startPost } from "../../app/jaspic/oauth/start/route";
import { NextRequest } from "next/server";
import { GET as callback } from "../../app/jaspic/oauth/callback/route";

describe("JASPIC iPhone OAuth HTTP endpoints remain locked", () => {
  it("does not redirect to Google before real server-side owner auth exists", async () => {
    const response = await start();
    expect(response.status).toBe(503);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(JSON.stringify(await response.json())).not.toContain("client_secret");
  });

  it("denies POST by default without contacting Google or Supabase", async () => {
    const response = await startPost(new NextRequest("https://emergencyalert.news/jaspic/oauth/start", {
      method: "POST",
      headers: { origin: "https://emergencyalert.news", authorization: "Bearer abcdefghijklmnopqrstuvwxyz" },
    }));
    expect(response.status).toBe(503);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("does not echo a returned authorization code or callback state", async () => {
    const response = await callback();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    const body = await response.text();
    expect(body).not.toContain("code=");
    expect(body).not.toContain("state=");
    expect(body).not.toContain("access_token");
  });
});
