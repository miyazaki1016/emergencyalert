/**
 * Offline-only Google OpenID Connect sender-identity verification.
 * Uses the minimal `openid email` scopes alongside gmail.send.
 * Never obtains mailbox contents, sends mail, or logs OAuth tokens.
 */
export const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo" as const;

export function validateGoogleSenderIdentityOffline(
  response: unknown,
  expectedEmail: string,
): { googleSubject: string; verifiedEmail: string } {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(expectedEmail) ||
      expectedEmail.length > 254 ||
      !response || typeof response !== "object" || Array.isArray(response)) {
    throw new Error("Google account identity unavailable");
  }
  const data = response as Record<string, unknown>;
  if (typeof data.sub !== "string" || !/^[0-9]{1,255}$/.test(data.sub) ||
      data.email_verified !== true ||
      typeof data.email !== "string" || data.email.length > 254 ||
      data.email.toLowerCase() !== expectedEmail.toLowerCase()) {
    throw new Error("Google account identity unavailable");
  }
  return { googleSubject: data.sub, verifiedEmail: data.email };
}
