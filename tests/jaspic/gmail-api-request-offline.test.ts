import { describe, expect, it } from "vitest";
import { prepareGmailSendRequestOffline } from "../../supabase/functions/_shared/jaspic/gmail-api-request-offline";

describe("Gmail API send descriptor (offline only)", () => {
  it("prepares the documented users.me.messages.send request without sending", () => {
    const request = prepareGmailSendRequestOffline("ZmFrZV9lbWw", "synthetic-token");
    expect(request.url).toBe("https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
    expect(request.method).toBe("POST");
    expect(request.headers).toEqual({
      Authorization: "Bearer synthetic-token", "Content-Type": "application/json",
    });
    expect(JSON.parse(request.body)).toEqual({ raw: "ZmFrZV9lbWw" });
  });
  it("fails closed for invalid raw or token without leaking token", () => {
    const token = "synthetic-private-token";
    for (const badRaw of ["", "not/base64", "a=b", "a\r\nInjected: yes"]) {
      expect(() => prepareGmailSendRequestOffline(badRaw, token)).toThrow("Invalid encoded MIME payload");
    }
    for (const badToken of ["", "injected\r\nHeader: value", "contains space"]) {
      expect(() => prepareGmailSendRequestOffline("ZmFrZQ", badToken)).toThrow("Invalid OAuth access token");
    }
  });
});
