import { describe, expect, it, vi } from "vitest";
// @ts-expect-error Diagnostic is intentionally a standalone Node ESM script.
import { probe, runDiagnostic } from "../../scripts/jaspic-shiga-diagnostic.mjs";

const incident = [{ id: "synthetic-1", city_code: "000", address: "架空町", occurrence_dt: "2026-11-04" }];
const geo = { features: [{ properties: { city_code: "000", full_name: "架空市" } }] };

describe("Shiga read-only source diagnostic", () => {
  it("reports transport/UTF-8/schema metadata without exposing record values", async () => {
    const mock = vi.fn(async (url: string) =>
      Response.json(url.includes("/geo/") ? geo : incident));
    const result = await runDiagnostic({ request: mock, dns: async () => [{ address: "127.0.0.1" }], now: () => 123 });
    expect(result.dns).toBe("resolved");
    expect(result.probes).toHaveLength(4);
    expect(result.probes.map((p: { query: string }) => p.query)).toEqual(["none", "timestamp", "none", "timestamp"]);
    expect(result.probes.every((p: { http: number; json: string }) => p.http === 200 && p.json === "valid")).toBe(true);
    expect(result.probes[0].count).toBe(1);
    expect(JSON.stringify(result)).not.toContain("synthetic-1");
    expect(JSON.stringify(result)).not.toContain("架空町");
    expect(mock.mock.calls.every(call => call[0].startsWith("https://map.police.shiga.dsvc.jp/"))).toBe(true);
    expect(mock.mock.calls.every(call => call[1].redirect === "error")).toBe(true);
  });

  it("distinguishes HTTP 404, invalid UTF-8, invalid JSON and DNS failure", async () => {
    const missing = await probe("/data/map/suspicious_person_full.json", "incidents", {
      request: async () => new Response("missing", { status: 404 }),
    });
    expect(missing.http).toBe(404);
    expect(missing.json).toBe(null);
    const brokenUtf8 = await probe("/data/map/suspicious_person_full.json", "incidents", {
      request: async () => new Response(new Uint8Array([0xff, 0xfe])),
    });
    expect(brokenUtf8.error).toBe("invalid_utf8");
    const brokenJson = await probe("/data/map/suspicious_person_full.json", "incidents", {
      request: async () => new Response("{bad"),
    });
    expect(brokenJson.error).toBe("invalid_json");
    const offline = await runDiagnostic({
      dns: async () => { throw new Error("private dns detail"); },
      request: async () => { throw new Error("private network detail"); },
    });
    expect(offline.dns).toBe("failed");
    expect(offline.probes.every((p: { error: string }) => p.error === "network_error")).toBe(true);
    expect(JSON.stringify(offline)).not.toContain("private");
  });
});
