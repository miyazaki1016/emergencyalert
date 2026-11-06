/**
 * Offline validation for a future Gmail send-only consent callback.
 * This module does not call Google, persist tokens, or send messages.
 * Never log or serialize returned credentials to a browser response.
 */
import { JASPIC_GMAIL_SEND_SCOPE } from "./oauth-gmail-send-consent-offline";

export type JaspicGmailSendCredentials = {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
};

export function validateJaspicGmailSendTokenOffline(value: unknown): JaspicGmailSendCredentials {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid Gmail grant");
  }
  const data = value as Record<string, unknown>;
  const scopes = typeof data.scope === "string" ? data.scope.trim().split(/\s+/) : [];
  const allowed = new Set([JASPIC_GMAIL_SEND_SCOPE, "openid", "email",
    "https://www.googleapis.com/auth/userinfo.email"]);
  if (typeof data.access_token !== "string" || data.access_token.length < 8 ||
      typeof data.refresh_token !== "string" || data.refresh_token.length < 8 ||
      data.token_type !== "Bearer" ||
      !Number.isSafeInteger(data.expires_in) || (data.expires_in as number) < 1 ||
      (data.expires_in as number) > 86400 ||
      !scopes.includes(JASPIC_GMAIL_SEND_SCOPE) || scopes.some(scope => !allowed.has(scope))) {
    throw new Error("Invalid Gmail send-only grant");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresInSeconds: data.expires_in as number,
  };
}
