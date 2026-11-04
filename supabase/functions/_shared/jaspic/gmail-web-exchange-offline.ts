/**
 * Offline-only Google web OAuth authorization code exchange preparation.
 * Does NOT call Google, read secrets, store credentials or enable mail sending.
 * Never log request bodies, OAuth authorization codes or token responses.
 */
import { JASPIC_GOOGLE_CALLBACK } from "./gmail-web-oauth-offline.ts";

export type WebOAuthExchangeRequest = {
  url: "https://oauth2.googleapis.com/token";
  method: "POST";
  headers: { "Content-Type": "application/x-www-form-urlencoded" };
  body: string;
};

export type WebOAuthCredentials = {
  clientId: string;
  clientSecret: string;
  code: string;
  codeVerifier: string;
};

/** Caller may only execute this in a separately authorized server-side workflow. */
export function prepareWebOAuthExchangeOffline(credentials: WebOAuthCredentials): WebOAuthExchangeRequest {
  const { clientId, clientSecret, code, codeVerifier } = credentials;
  if (!/^[A-Za-z0-9_.-]+\.apps\.googleusercontent\.com$/.test(clientId) ||
      !clientSecret || clientSecret.length > 8192 || /[\r\n\0]/.test(clientSecret) ||
      !/^[A-Za-z0-9_\/.~-]{1,4096}$/.test(code) ||
      !/^[A-Za-z0-9_-]{43,128}$/.test(codeVerifier)) {
    throw new Error("Invalid web OAuth exchange input");
  }
  const form = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    code_verifier: codeVerifier,
    redirect_uri: JASPIC_GOOGLE_CALLBACK,
    grant_type: "authorization_code",
  });
  return {
    url: "https://oauth2.googleapis.com/token",
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  };
}

export type WebOAuthTokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  tokenType: "Bearer";
  scope: string;
};

/**
 * A first-time consent must yield a refresh token. Do not silently accept
 * an access-token-only response for unattended daily operation.
 */
export function validateWebOAuthTokenOffline(input: unknown): WebOAuthTokenResponse {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid web OAuth token response");
  }
  const obj = input as Record<string, unknown>;
  if (typeof obj.access_token !== "string" || !obj.access_token ||
      typeof obj.refresh_token !== "string" || !obj.refresh_token ||
      typeof obj.expires_in !== "number" || !Number.isSafeInteger(obj.expires_in) ||
      obj.expires_in < 1 || obj.expires_in > 86400 || obj.token_type !== "Bearer" ||
      typeof obj.scope !== "string" ||
      !obj.scope.split(" ").includes("https://www.googleapis.com/auth/gmail.send")) {
    throw new Error("Invalid web OAuth token response");
  }
  return {
    accessToken: obj.access_token,
    refreshToken: obj.refresh_token,
    expiresInSeconds: obj.expires_in,
    tokenType: "Bearer",
    scope: obj.scope,
  };
}
