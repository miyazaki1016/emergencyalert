/**
 * Validate an identity-only Google OAuth code exchange response.
 * This is deliberately incompatible with the legacy gmail.send validator.
 * Pure/offline; no HTTP calls, token storage, Gmail scopes, or sending.
 */
export function validateJaspicIdentityTokenResponse(value: unknown): {
  accessToken: string; expiresInSeconds: number;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid token response");
  const data = value as Record<string, unknown>;
  const scopes = typeof data.scope === "string" ? data.scope.trim().split(/\s+/) : null;
  // Google may omit scope when the granted scopes match the requested scopes.
  // When present, require identity scopes and reject any Gmail permissions.
  if (typeof data.access_token !== "string" || !/^[A-Za-z0-9_.~-]{8,8192}$/.test(data.access_token) ||
      data.token_type !== "Bearer" ||
      typeof data.expires_in !== "number" || !Number.isSafeInteger(data.expires_in) ||
      data.expires_in < 1 || data.expires_in > 86400 ||
      (scopes !== null && (!scopes.includes("openid") ||
        !scopes.some(s => s === "email" || s === "https://www.googleapis.com/auth/userinfo.email") ||
        scopes.some(s => s.includes("gmail.") || s === "https://mail.google.com/")))) {
    throw new Error("Invalid identity-only token response");
  }
  return { accessToken: data.access_token, expiresInSeconds: data.expires_in };
}
