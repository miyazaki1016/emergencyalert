import { prepareJaspicIdentityConsent } from "./oauth-consent-preparation";
import { sealGmailWebSessionOffline, GMAIL_OAUTH_COOKIE_POLICY } from "./oauth-session-offline";
import { registerOAuthStateOffline, type OAuthOnceStore } from "./oauth-once-offline";

/**
 * Server-only staging orchestrator. The HTTP route MUST verify Supabase admin
 * and the deployment feature flag before calling this function.
 * No Google requests, Gmail scopes, token exchange, or email sending.
 */
export async function prepareJaspicAdminIdentityStart(input: {
  verifiedOwnerId: string;
  adminUserId: string | undefined;
  clientId: string;
  cookieEncryptionKey: string;
  stateStore: OAuthOnceStore;
  now?: number;
}): Promise<{ authorizationUrl: string; sealedCookie: string; cookiePolicy: typeof GMAIL_OAUTH_COOKIE_POLICY }> {
  if (!input.adminUserId || input.verifiedOwnerId !== input.adminUserId ||
      !/^[a-f0-9-]{36}$/i.test(input.verifiedOwnerId)) throw new Error("Unauthorized owner");
  const now = input.now ?? Date.now();
  if (!Number.isSafeInteger(now) || now <= 0) throw new Error("Invalid OAuth clock");
  const consent = await prepareJaspicIdentityConsent(input.clientId);
  const sealedCookie = await sealGmailWebSessionOffline(
    consent.state, consent.codeVerifier, input.cookieEncryptionKey, now, input.verifiedOwnerId,
  );
  // Durable state must be registered before the consent URL is disclosed.
  await registerOAuthStateOffline(
    input.stateStore, consent.state, input.verifiedOwnerId,
    now + GMAIL_OAUTH_COOKIE_POLICY.maxAge * 1000,
  );
  return {
    authorizationUrl: consent.authorizationUrl,
    sealedCookie,
    cookiePolicy: GMAIL_OAUTH_COOKIE_POLICY,
  };
}
