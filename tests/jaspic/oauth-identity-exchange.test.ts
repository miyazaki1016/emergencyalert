import { describe, expect, it } from "vitest";
import { prepareJaspicIdentityCodeExchange } from "../../lib/jaspic/oauth-identity-exchange";
const valid = {
  clientId: "123.apps.googleusercontent.com", clientSecret: "server-secret",
  code: "authorization-code", codeVerifier: "a".repeat(64),
};
describe("offline OAuth identity exchange request", () => {
  it("uses only Google's token endpoint and exact callback", () => {
    const request = prepareJaspicIdentityCodeExchange(valid);
    expect(request.url).toBe("https://oauth2.googleapis.com/token");
    expect(request.method).toBe("POST");
    const params = new URLSearchParams(request.body);
    expect(params.get("grant_type")).toBe("authorization_code");
    expect(params.get("redirect_uri")).toBe("https://emergencyalert.news/jaspic/oauth/callback");
    expect(params.get("code_verifier")).toBe(valid.codeVerifier);
    expect(params.has("scope")).toBe(false);
  });
  it("fails closed on invalid credentials and verifier", () => {
    for (const input of [
      { ...valid, clientId: "invalid" }, { ...valid, clientSecret: "" },
      { ...valid, clientSecret: "x\nInjected: yes" },
      { ...valid, code: "" }, { ...valid, codeVerifier: "short" },
    ]) expect(() => prepareJaspicIdentityCodeExchange(input)).toThrow();
  });
});
