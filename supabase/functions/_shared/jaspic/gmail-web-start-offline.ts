/**
 * Pure orchestration for starting the iPhone Gmail OAuth consent.
 * This does not launch a browser, call Supabase or Google, or set cookies.
 * A server-only HTTP adapter must verify the admin's actual session first,
 * set a Secure HttpOnly cookie and enforce a feature flag.
 */
import { authorizeJaspicAdminOffline, type AdminAuthorizationConfig, type TrustedServerIdentity } from "./gmail-oauth-admin-offline.ts";
import { registerOAuthStateOffline, type OAuthOnceStore } from "./gmail-oauth-once-offline.ts";
import { prepareGmailWebConsentOffline } from "./gmail-web-oauth-offline.ts";
import { GMAIL_OAUTH_COOKIE_POLICY, sealGmailWebSessionOffline } from "./gmail-web-session-offline.ts";

export type GmailOAuthStartRequest = Readonly<{
  identity: TrustedServerIdentity | null;
  adminPolicy: AdminAuthorizationConfig;
  clientId: string;
  sessionEncryptionKey: string;
  stateStore: OAuthOnceStore;
  now?: number;
}>;

export type GmailOAuthStartResult = Readonly<{
  authorizationUrl: string;
  sealedCookie: string;
  cookiePolicy: typeof GMAIL_OAUTH_COOKIE_POLICY;
}>;

/**
 * Register state before disclosing the consent URL. Fails closed if persistent
 * storage is unavailable; never fall back to process-local memory.
 */
export async function prepareAdminGmailOAuthStart(
  request: GmailOAuthStartRequest,
): Promise<GmailOAuthStartResult> {
  const admin = authorizeJaspicAdminOffline(request.identity, request.adminPolicy);
  const now = request.now ?? Date.now();
  if (!Number.isSafeInteger(now) || now <= 0) throw new Error("Invalid OAuth start clock");
  const { state, codeVerifier, authorizationUrl } =
    await prepareGmailWebConsentOffline(request.clientId);
  const sealedCookie = await sealGmailWebSessionOffline(
    state, codeVerifier, request.sessionEncryptionKey, now,
  );
  await registerOAuthStateOffline(
    request.stateStore, state, admin.ownerId, now + GMAIL_OAUTH_COOKIE_POLICY.maxAge * 1000,
  );
  return {
    authorizationUrl,
    sealedCookie,
    cookiePolicy: GMAIL_OAUTH_COOKIE_POLICY,
  };
}
