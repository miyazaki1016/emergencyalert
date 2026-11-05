import { describe, expect, it } from "vitest";
import fixtures from "./mime-fixtures.json";
import { generateEml } from "../../supabase/functions/_shared/jaspic/mime";
import { prepareGmailRawOffline } from "../../supabase/functions/_shared/jaspic/gmail-dry-run";
import { prepareGmailSendRequestOffline } from "../../supabase/functions/_shared/jaspic/gmail-api-request-offline";
import { simulateGmailDelivery, type SimulatedDelivery } from "../../supabase/functions/_shared/jaspic/gmail-transport-simulator";
import type { Kind, RecordData } from "../../supabase/functions/_shared/jaspic/mail";

const identity = { date: "Wed, 04 Nov 2026 18:00:00 +0900", messageId: "offline-test@localhost.invalid" };
const decode = (raw: string): string => Buffer.from(raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");

describe("end-to-end Gmail preparation (OFFLINE; no API/SMTP connection)", () => {
  for (const f of fixtures) {
    it(`${f.kind}: ${f.previous === null ? "new" : "update"} raw/body preservation`, () => {
      const old = Buffer.from(generateEml(f.kind as Kind, f.current as RecordData,
        f.previous as RecordData | null, f, "eight-bit", identity)).toString("utf8");
      const prepared = prepareGmailRawOffline(new TextEncoder().encode(old));
      const request = prepareGmailSendRequestOffline(prepared.raw, "fake-token");
      const newMail = decode(JSON.parse(request.body).raw as string);
      expect(request.method).toBe("POST");
      expect(newMail.split("\r\n\r\n").slice(1).join("\r\n\r\n"))
        .toBe(old.split("\r\n\r\n").slice(1).join("\r\n\r\n"));
      expect(newMail).toBe(old.replace("From: hppmap@kishibojim.online",
        "From: miyazaki1016@gmail.com"));
      expect(newMail).not.toContain("fake-token");
    });
  }
  it("prevents retry after synthetic ambiguous response", () => {
    const initial: SimulatedDelivery = { key: "shiga-person:synthetic-42", state: "NEW", attempted: false };
    const result = simulateGmailDelivery(initial, { scenario: "timeout" });
    expect(result.state).toBe("UNKNOWN");
    expect(() => simulateGmailDelivery(result, { scenario: "accepted",
      syntheticMessageId: "synthetic-42" })).toThrow();
  });
});
