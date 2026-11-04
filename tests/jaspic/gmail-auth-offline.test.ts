import { describe, expect, it } from "vitest";
import {
  GMAIL_SEND_SCOPE, prepareRefreshRequestOffline,
  validateRefreshResponseOffline, nextDeliveryState,
} from "../../supabase/functions/_shared/jaspic/gmail-auth-offline";

describe("Gmail OAuth offline-only preparation", () => {
  it("builds a form request without executing any network operation", () => {
    const request = prepareRefreshRequestOffline({
      clientId: "test-client", clientSecret: "fake-only-secret", refreshToken: "fake-only-token",
    });
    expect(request.method).toBe("POST");
    expect(request.url).toBe("https://oauth2.googleapis.com/token");
    expect(request.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    const form = new URLSearchParams(request.body);
    expect(form.get("grant_type")).toBe("refresh_token");
    expect(form.get("client_id")).toBe("test-client");
    expect(form.get("client_secret")).toBe("fake-only-secret");
    expect(form.get("refresh_token")).toBe("fake-only-token");
    expect(GMAIL_SEND_SCOPE).toBe("https://www.googleapis.com/auth/gmail.send");
  });
  it("refuses invalid credentials without echoing them", () => {
    for (const bad of ["", " x", "x\r\nInjected: y"]) {
      expect(() => prepareRefreshRequestOffline({
        clientId: "client", clientSecret: bad, refreshToken: "dummy",
      })).toThrow("Invalid OAuth configuration");
    }
  });
  it("validates token responses and fails closed without disclosing tokens", () => {
    expect(validateRefreshResponseOffline({
      access_token: "dummy-access-token", token_type: "Bearer", expires_in: 3599,
    })).toEqual({ accessToken: "dummy-access-token", tokenType: "Bearer", expiresInSeconds: 3599 });
    for (const bad of [
      null, {}, { error: "invalid_grant", error_description: "private-secret" },
      { access_token: "private-secret", token_type: "mac", expires_in: 3000 },
      { access_token: "private-secret", token_type: "Bearer", expires_in: 0 },
    ]) {
      try {
        validateRefreshResponseOffline(bad);
        throw new Error("Expected rejection");
      } catch (e) {
        expect(String(e)).not.toContain("private-secret");
        expect(String(e)).toContain("Invalid OAuth response");
      }
    }
  });
  it("guards against automatic retry after unknown delivery", () => {
    expect(nextDeliveryState("NEW", "lease")).toBe("LEASED");
    expect(nextDeliveryState("LEASED", "accepted")).toBe("ACCEPTED");
    expect(nextDeliveryState("LEASED", "unknown")).toBe("UNKNOWN");
    expect(nextDeliveryState("LEASED", "failed")).toBe("FAILED");
    for (const state of ["ACCEPTED", "UNKNOWN", "FAILED"] as const) {
      expect(() => nextDeliveryState(state, "lease")).toThrow();
    }
    expect(() => nextDeliveryState("NEW", "accepted")).toThrow();
  });
});
