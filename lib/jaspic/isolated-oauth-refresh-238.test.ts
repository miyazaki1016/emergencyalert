import { describe, expect, it, vi } from "vitest";
import { refreshIsolatedGmailAccessToken } from "./isolated-oauth-refresh-238";
const credentials = {clientId:"client",clientSecret:"secret",refreshToken:"refresh"};
describe("Issue #238 isolated OAuth refresh",()=>{
  it("uses only Google's token endpoint and does not expose the refresh token in the result",async()=>{
    const request=vi.fn(async (_url:string, init?:RequestInit)=>{
      expect(_url).toBe("https://oauth2.googleapis.com/token");
      expect(init?.method).toBe("POST");
      expect(init?.redirect).toBe("error");
      const params=new URLSearchParams(init?.body as URLSearchParams);
      expect(params.get("grant_type")).toBe("refresh_token");
      expect(params.get("refresh_token")).toBe("refresh");
      return new Response(JSON.stringify({access_token:"valid-token-value",token_type:"Bearer"}),{status:200});
    });
    expect(await refreshIsolatedGmailAccessToken(credentials,request as typeof fetch)).toBe("valid-token-value");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("fails closed on invalid credentials",async()=>{
    const request=vi.fn();
    await expect(refreshIsolatedGmailAccessToken({...credentials,refreshToken:""},request as typeof fetch))
      .rejects.toThrow("ISOLATED_OAUTH_NOT_CONFIGURED");
    expect(request).not.toHaveBeenCalled();
  });
  it("fails closed on rejected refresh",async()=>{
    const request=vi.fn(async()=>new Response("{}",{status:401}));
    await expect(refreshIsolatedGmailAccessToken(credentials,request as typeof fetch))
      .rejects.toThrow("ISOLATED_OAUTH_REFRESH_FAILED");
  });
  it("rejects malformed token response",async()=>{
    const request=vi.fn(async()=>new Response(JSON.stringify({access_token:"short",token_type:"Bearer"}),{status:200}));
    await expect(refreshIsolatedGmailAccessToken(credentials,request as typeof fetch))
      .rejects.toThrow("ISOLATED_OAUTH_RESPONSE_INVALID");
  });
});
