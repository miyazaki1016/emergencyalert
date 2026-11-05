import { describe, expect, it } from "vitest";
import fixtures from "./mime-fixtures.json";
import { generateEml } from "../../supabase/functions/_shared/jaspic/mime";
import { JASPIC_GMAIL_FROM, prepareGmailRawOffline } from "../../supabase/functions/_shared/jaspic/gmail-dry-run";
import type { Kind, RecordData } from "../../supabase/functions/_shared/jaspic/mail";

const identity = { date: "Wed, 04 Nov 2026 18:00:00 +0900", messageId: "test@localhost.invalid" };
describe("offline Gmail API envelope preparation (no network)", () => {
  for (const f of fixtures) {
    it(f.kind + (f.previous === null ? "-new" : "-update"), () => {
      const original = Buffer.from(generateEml(f.kind as Kind, f.current as RecordData,
        f.previous as RecordData | null, f, "eight-bit", identity));
      const result = prepareGmailRawOffline(original);
      const base64 = result.raw.replace(/-/g, "+").replace(/_/g, "/");
      const output = Buffer.from(base64, "base64").toString("utf8");
      const oldText = original.toString("utf8");
      const divider = "\r\n\r\n";
      expect(result.from).toBe(JASPIC_GMAIL_FROM);
      expect(output).toContain("From: miyazaki1016@gmail.com\r\n");
      expect(output.slice(output.indexOf(divider) + divider.length)).toBe(
        oldText.slice(oldText.indexOf(divider) + divider.length));
      expect(output.replace("From: miyazaki1016@gmail.com", "From: hppmap@kishibojim.online"))
        .toBe(oldText);
      expect(result.raw).toMatch(/^[a-zA-Z0-9_-]+$/);
    });
  }
  it("refuses unexpected From, added routing header, and broken MIME", () => {
    const f = fixtures[0];
    const src = Buffer.from(generateEml(f.kind as Kind, f.current as RecordData,
      f.previous as RecordData | null, f, "eight-bit", identity)).toString("utf8");
    for (const bad of [
      src.replace("From: hppmap@kishibojim.online", "From: attacker@example.org"),
      src.replace("From:", "Return-Path: spoof@example.org\r\nFrom:"),
      src.replace("\r\n\r\n", "\n\n"),
    ]) expect(() => prepareGmailRawOffline(new TextEncoder().encode(bad))).toThrow();
  });
});
