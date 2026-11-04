/**
 * Supabase Auth identity adapter for a future JASPIC admin-only OAuth route.
 * Not invoked by a deployed HTTP endpoint. No credentials or Google calls.
 *
 * IMPORTANT: instantiate the injected auth client on the server with a trusted
 * Supabase project URL and anon key. The caller MUST pass an access token
 * extracted from its Authorization header, never an unverified client claim.
 * Supabase auth.getUser(token) makes a remote Auth request to validate it.
 */
import type { TrustedServerIdentity } from "./gmail-oauth-admin-offline.ts";

type AuthUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
};
type AuthGetUserResponse = {
  data: { user: AuthUser | null };
  error: { message: string } | null;
};

export interface SupabaseAuthVerifier {
  auth: {
    getUser(accessToken: string): Promise<AuthGetUserResponse>;
  };
}

export type SupabaseIdentityConfig = {
  /** Must be an exact trusted Supabase Auth issuer, configured server-side. */
  issuer: string;
};

/**
 * Returns a trusted identity only after remote Supabase Auth getUser succeeds.
 * Does not take email/subject from a request body, query string or JWT decode.
 */
export async function verifyJaspicSupabaseIdentity(
  supabase: SupabaseAuthVerifier,
  accessToken: string,
  config: SupabaseIdentityConfig,
): Promise<TrustedServerIdentity> {
  const deny = (): never => { throw new Error("JASPIC login required"); };
  if (!accessToken || accessToken.length > 8192 || /[\r\n\0]/.test(accessToken) ||
      !/^https:\/\/[a-z0-9-]+\.supabase\.co\/auth\/v1$/.test(config.issuer)) deny();
  const result: AuthGetUserResponse = await supabase.auth.getUser(accessToken).catch(() => deny());
  if (result.error || !result.data?.user) throw new Error("JASPIC login required");
  const user = result.data.user;
  if (!/^[0-9a-fA-F-]{36}$/.test(user.id) ||
      typeof user.email !== "string" ||
      !user.email_confirmed_at ||
      Number.isNaN(Date.parse(user.email_confirmed_at))) deny();
  return {
    subject: user.id,
    verifiedEmail: user.email,
    issuer: config.issuer,
    sessionVerified: true,
  };
}
