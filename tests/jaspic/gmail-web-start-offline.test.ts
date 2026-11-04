import { describe, expect, it } from "vitest";
import { prepareAdminGmailOAuthStart } from "../../supabase/functions/_shared/jaspic/gmail-web-start-offline";
import { openGmailWebSessionOffline } from "../../supabase/functions/_shared/jaspic/gmail-web-session-offline";
import { hashGmailOAuthStateOffline, type OAuthOnceStore } from "../../supabase/functions/_shared/jaspic/gmail-oauth-once-offline";

const owner = "owner_subject_1234";
const identity = {subject:owner,verifiedEmail:"owner@example.invalid",issuer:"https://auth.example.invalid",sessionVerified:true as const};
const policy = {expectedSubject:owner,expectedEmail:identity.verifiedEmail,expectedIssuer:identity.issuer};
const key = "a".repeat(43);
const now = 1_800_000_000_000;

function testStore() {
  const registrations: Array<{stateHash:string;ownerId:string;expiresAt:number}> = [];
  const store: OAuthOnceStore = {
    create: async (v) => { registrations.push(v); },
    consumeAtomically: async () => "invalid_or_expired",
  };
  return {store,registrations};
}
describe("admin-only OAuth start orchestration (offline)", () => {
  it("registers the opaque state before providing a Google URL and sealed cookie", async () => {
    const {store,registrations} = testStore();
    const result = await prepareAdminGmailOAuthStart({
      identity, adminPolicy:policy, clientId:"test.apps.googleusercontent.com",
      sessionEncryptionKey:key,stateStore:store,now,
    });
    const consent = new URL(result.authorizationUrl);
    expect(consent.origin).toBe("https://accounts.google.com");
    expect(result.cookiePolicy).toMatchObject({httpOnly:true,secure:true,sameSite:"lax",maxAge:300});
    const state = consent.searchParams.get("state")!;
    expect(registrations).toEqual([{
      stateHash:await hashGmailOAuthStateOffline(state),ownerId:owner,expiresAt:now+300_000,
    }]);
    const session = await openGmailWebSessionOffline(result.sealedCookie,state,key,now+1000);
    expect(session.state).toBe(state);
    expect(consent.searchParams.get("code_challenge")).not.toBe(session.codeVerifier);
    expect(result.authorizationUrl).not.toContain(session.codeVerifier);
  });
  it("does not attempt state registration for an unrecognized admin", async () => {
    const {store,registrations} = testStore();
    await expect(prepareAdminGmailOAuthStart({
      identity:{...identity,subject:"another_subject_1234"},adminPolicy:policy,
      clientId:"test.apps.googleusercontent.com",sessionEncryptionKey:key,stateStore:store,now,
    })).rejects.toThrow("JASPIC admin access denied");
    expect(registrations).toHaveLength(0);
  });
  it("fails closed if the persistent state backend fails", async () => {
    const store: OAuthOnceStore = {
      create: async () => {throw new Error("backend unavailable");},
      consumeAtomically: async () => "invalid_or_expired",
    };
    await expect(prepareAdminGmailOAuthStart({
      identity,adminPolicy:policy,clientId:"test.apps.googleusercontent.com",
      sessionEncryptionKey:key,stateStore:store,now,
    })).rejects.toThrow("backend unavailable");
  });
});
