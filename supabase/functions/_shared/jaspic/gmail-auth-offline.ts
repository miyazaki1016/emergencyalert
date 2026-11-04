/**
 * Offline-only Gmail OAuth2 configuration and response validation.
 * This module has NO fetch, SMTP, token persistence, or send capability.
 * Never log credentials or return them as part of error strings.
 */
export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send" as const;
export type GmailOAuthSecrets = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};
export type GmailTokenRequest = {
  url: "https://oauth2.googleapis.com/token";
  method: "POST";
  headers: { "Content-Type": "application/x-www-form-urlencoded" };
  body: string;
};
function required(value: string): string {
  if (!value || value.trim() !== value || /[\r\n\0]/.test(value)) throw new Error("Invalid OAuth configuration");
  return value;
}
/** Builds an inert request descriptor. The caller MUST NOT execute it in production without separate approval. */
export function prepareRefreshRequestOffline(secrets: GmailOAuthSecrets): GmailTokenRequest {
  const params = new URLSearchParams({
    client_id: required(secrets.clientId),
    client_secret: required(secrets.clientSecret),
    refresh_token: required(secrets.refreshToken),
    grant_type: "refresh_token",
  });
  return {
    url: "https://oauth2.googleapis.com/token",
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  };
}
export type GmailAccessToken = { accessToken: string; expiresInSeconds: number; tokenType: "Bearer" };
/** No network and no secret-bearing error messages. */
export function validateRefreshResponseOffline(input: unknown): GmailAccessToken {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid OAuth response");
  const value = input as Record<string, unknown>;
  if (typeof value.access_token !== "string" || !value.access_token ||
      value.token_type !== "Bearer" ||
      typeof value.expires_in !== "number" || !Number.isSafeInteger(value.expires_in) ||
      value.expires_in < 1 || value.expires_in > 86400) {
    throw new Error("Invalid OAuth response");
  }
  return { accessToken: required(value.access_token), expiresInSeconds: value.expires_in, tokenType: "Bearer" };
}
/** Minimal state-only guard; requires separate persistent transactional implementation before delivery. */
export type DeliveryState = "NEW" | "LEASED" | "ACCEPTED" | "UNKNOWN" | "FAILED";
export function nextDeliveryState(current: DeliveryState, action: "lease" | "accepted" | "unknown" | "failed"): DeliveryState {
  const allowed: Record<DeliveryState, Partial<Record<typeof action, DeliveryState>>> = {
    NEW: { lease: "LEASED" },
    LEASED: { accepted: "ACCEPTED", unknown: "UNKNOWN", failed: "FAILED" },
    ACCEPTED: {}, UNKNOWN: {}, FAILED: {},
  };
  const next = allowed[current]?.[action];
  if (!next) throw new Error("Invalid delivery transition; automatic retry prohibited");
  return next;
}
