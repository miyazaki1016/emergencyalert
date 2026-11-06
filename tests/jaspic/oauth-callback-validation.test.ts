import { describe, expect, it } from "vitest";
import { validateJaspicOAuthCallback } from "../../lib/jaspic/oauth-callback-validation";
import { JASPIC_GOOGLE_CALLBACK } from "../../lib/jaspic/oauth-consent-preparation";

const state = "a".repeat(43);
const valid = JASPIC_GOOGLE_CALLBACK + "?state=" + state + "&code=valid-code";
describe("JASPIC OAuth callback validation (offline)", () => {
  it("accepts only exact callback and matching state", () => {
    expect(validateJaspicOAuthCallback(valid, state)).toEqual({ code: "valid-code" });
  });
  it("rejects wrong origin, wrong path, mismatched state and replay-style duplicates", () => {
    for (const candidate of [
      valid.replace("emergencyalert.news", "evil.example"),
      valid.replace("/callback", "/other"),
      valid.replace("state=" + state, "state=" + "b".repeat(43)),
      valid + "&state=" + state,
      valid + "&code=other",
      valid + "#fragment",
      valid + "&error=access_denied",
      valid.replace("code=valid-code", "code="),
    ]) {
      expect(() => validateJaspicOAuthCallback(candidate, state)).toThrow();
    }
  });
  it("rejects malformed expected state", () => {
    expect(() => validateJaspicOAuthCallback(valid, "short")).toThrow();
  });
});
