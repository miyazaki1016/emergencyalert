/**
 * Consent URL preparation only. No HTTP, token exchange, storage or mail.
 * Intentionally requests identity scopes only, NOT gmail.send.
 */
export const JASPIC_GOOGLE_CALLBACK = "https://emergencyalert.news/jaspic/oauth/callback";
const GOOGLE_CLIENT_ID = /^[A-Za-z0-9_.-]+\.apps\.googleusercontent\.com$/;
function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}
export async function prepareJaspicIdentityConsent(clientId: string): Promise<{
  authorizationUrl: string; state: string; codeVerifier: string;
}> {
  if (!GOOGLE_CLIENT_ID.test(clientId)) throw new Error("Invalid Google OAuth web client ID");
  const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const codeVerifier = base64url(crypto.getRandomValues(new Uint8Array(48)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  const params = new URLSearchParams({
    client_id: clientId, redirect_uri: JASPIC_GOOGLE_CALLBACK,
    response_type: "code", scope: "openid email",
    state, code_challenge: base64url(new Uint8Array(digest)),
    code_challenge_method: "S256", access_type: "offline", prompt: "consent",
  });
  return { authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?" + params, state, codeVerifier };
}
