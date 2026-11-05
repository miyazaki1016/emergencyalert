/**
 * iPhone/browser-compatible Gmail OAuth2 Authorization Code + PKCE preparation.
 * Pure/offline: no fetch, no token exchange, no cookies, no secrets, no sending.
 *
 * A production web callback MUST be guarded by authenticated admin access,
 * a short-lived HttpOnly Secure SameSite=Lax state/verifier cookie or server state,
 * single-use CSRF validation and server-only secret storage before activation.
 */
import { GMAIL_SEND_SCOPE } from "./gmail-auth-offline.ts";

export const JASPIC_GOOGLE_CALLBACK = "https://emergencyalert.news/jaspic/oauth/callback" as const;

function base64url(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += alphabet[n >>> 18] + alphabet[(n >>> 12) & 63];
    out += i + 1 < bytes.length ? alphabet[(n >>> 6) & 63] : "=";
    out += i + 2 < bytes.length ? alphabet[n & 63] : "=";
  }
  return out.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function randomUrlSafe(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64url(arr);
}
export type OfflineWebOAuthStart = {
  authorizationUrl: string;
  state: string;
  codeVerifier: string;
  callback: typeof JASPIC_GOOGLE_CALLBACK;
};
/**
 * Creates an authorization URL for a new WEB application OAuth client.
 * Never put codeVerifier in a URL, browser localStorage, or GitHub.
 */
export async function prepareGmailWebConsentOffline(clientId: string): Promise<OfflineWebOAuthStart> {
  if (!/^[A-Za-z0-9_.-]+\.apps\.googleusercontent\.com$/.test(clientId)) {
    throw new Error("Invalid OAuth web client ID");
  }
  const codeVerifier = randomUrlSafe(48);
  const state = randomUrlSafe(32);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  const challenge = base64url(new Uint8Array(digest));
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: JASPIC_GOOGLE_CALLBACK,
    response_type: "code",
    scope: GMAIL_SEND_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return { authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?" + query, state, codeVerifier, callback: JASPIC_GOOGLE_CALLBACK };
}
export type OfflineCallback = { code: string };
/** Validates callback parameters only; does NOT exchange a code. */
export function validateGmailWebCallbackOffline(url: string, expectedState: string): OfflineCallback {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(expectedState)) throw new Error("Invalid stored OAuth state");
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error("Invalid OAuth callback URL"); }
  if (parsed.origin !== "https://emergencyalert.news" || parsed.pathname !== "/jaspic/oauth/callback" ||
      parsed.hash || parsed.searchParams.getAll("state").length !== 1 ||
      parsed.searchParams.getAll("code").length !== 1 || parsed.searchParams.has("error") ||
      parsed.searchParams.get("state") !== expectedState) {
    throw new Error("OAuth callback refused");
  }
  const code = parsed.searchParams.get("code") ?? "";
  if (!/^[A-Za-z0-9_\/.~-]{1,4096}$/.test(code)) throw new Error("Invalid OAuth authorization code");
  return { code };
}
