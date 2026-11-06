import { isJaspicAdmin } from "./admin-authorization";

/**
 * Pure, fail-closed gate for a future Gmail OAuth start endpoint.
 * No network access, Google consent, tokens, state writes, or mail sending.
 * Caller MUST first verify the bearer token with Supabase auth.getUser(token).
 */
export function authorizeJaspicOAuthStart(
  verifiedUser: { id?: string; app_metadata?: Record<string, unknown> } | null | undefined,
  adminUserId: string | undefined,
  enabled: string | undefined,
): { ownerId: string } | null {
  if (enabled !== "true" || !isJaspicAdmin(verifiedUser, adminUserId)) return null;
  return { ownerId: verifiedUser!.id! };
}
