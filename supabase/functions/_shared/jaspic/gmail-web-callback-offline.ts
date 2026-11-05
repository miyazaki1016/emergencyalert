/**
 * Composes offline OAuth callback checks, for a future server-only handler.
 * No HTTP route, Google request, credentials, token storage or mail sending.
 *
 * WARNING: supplying a TrustedServerIdentity requires independently verified
 * server-side auth (signature/aud/iss/expiry). The DB adapter must be a durable
 * atomic consume, NOT an in-memory store. Do not expose the returned code.
 */
import { authorizeJaspicAdminOffline, type AdminAuthorizationConfig, type TrustedServerIdentity } from "./gmail-oauth-admin-offline.ts";
import { consumeOAuthStateOffline, type OAuthOnceStore } from "./gmail-oauth-once-offline.ts";
import { validateGmailWebCallbackOffline } from "./gmail-web-oauth-offline.ts";
import { openGmailWebSessionOffline } from "./gmail-web-session-offline.ts";

export type OfflineCallbackInput = Readonly<{
  callbackUrl: string;
  encryptedCookie: string;
  cookieEncryptionKey: string;
  /** Identified by the trusted HTTP auth adapter, never by query params. */
  identity: TrustedServerIdentity | null;
  adminPolicy: AdminAuthorizationConfig;
  store: OAuthOnceStore;
  now?: number;
}>;
export type VerifiedOfflineCallback = Readonly<{
  authorizationCode: string;
  codeVerifier: string;
  ownerId: string;
}>;

export async function verifyGmailWebCallbackOffline(
  input: OfflineCallbackInput,
): Promise<VerifiedOfflineCallback> {
  const admin = authorizeJaspicAdminOffline(input.identity, input.adminPolicy);
  const parsed = new URL(input.callbackUrl);
  if (parsed.searchParams.getAll("state").length !== 1) {
    throw new Error("OAuth callback rejected");
  }
  const state = parsed.searchParams.get("state") ?? "";
  const session = await openGmailWebSessionOffline(
    input.encryptedCookie, state, input.cookieEncryptionKey, input.now,
  );
  const callback = validateGmailWebCallbackOffline(input.callbackUrl, session.state);
  const consumed = await consumeOAuthStateOffline(
    input.store, session.state, admin.ownerId, input.now,
  );
  if (!consumed) throw new Error("OAuth callback rejected");
  // Server-only values: NEVER serialize these into HTML, JSON or logs.
  return { authorizationCode: callback.code, codeVerifier: session.codeVerifier, ownerId: admin.ownerId };
}
