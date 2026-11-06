/**
 * Gmail send-only consent preparation. Offline helper, NOT wired to HTTP routes.
 * No token exchange, token persistence, SMTP, or Gmail API sending.
 * Existing identity-only production OAuth is deliberately unchanged.
 */
import { JASPIC_GOOGLE_CALLBACK } from "./oauth-consent-preparation";

const CLIENT_ID = /^[A-Za-z0-9_.-]+\.apps\.googleusercontent\.com$/;
export const JASPIC_GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

function encode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

/** Caller must separately verify the Supabase administrator and use a one-time state store. */
export async function prepareJaspicGmailSendConsentOffline(clientId: string): Promise<{
  authorizationUrl: string; state: string; codeVerifier: string;
}> {
  if (!CLIENT_ID.test(clientId)) throw new Error("Invalid Google OAuth client ID");
  const state = encode(crypto.getRandomValues(new Uint8Array(32)));
  const codeVerifier = encode(crypto.getRandomValues(new Uint8Array(48)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: JASPIC_GOOGLE_CALLBACK,
    response_type: "code",
    scope: "openid email " + JASPIC_GMAIL_SEND_SCOPE,
    state,
    code_challenge: encode(new Uint8Array(digest)),
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
  });
  return {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString(),
    state, codeVerifier,
  };
}
