/**
 * Offline-only server-authenticated JASPIC OAuth administrator authorization.
 * The caller MUST obtain identity by independently verifying a server-side
 * session/JWT. Never pass identity values from query/body/cookies as trusted.
 * No network, database connection, Gmail token handling or mail sending.
 */
export type TrustedServerIdentity = Readonly<{
  /** Stable Supabase Auth subject, extracted after server-side JWT verification. */
  subject: string;
  /** Verified email from the authoritative identity provider, not user_metadata. */
  verifiedEmail: string;
  /** Issuer associated with a verified JWT/session. */
  issuer: string;
  /** Indicates upstream server-side signature, audience and expiry verification. */
  sessionVerified: true;
}>;

export type AdminAuthorizationConfig = Readonly<{
  expectedSubject: string;
  expectedEmail: string;
  expectedIssuer: string;
}>;

export type ApprovedJaspicAdmin = Readonly<{
  ownerId: string;
}>;

function assertIdentifier(value: string): void {
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(value)) throw new Error("JASPIC admin access denied");
}

/**
 * Fail-closed local policy on top of independently verified identity.
 * This function does NOT itself verify a JWT or authenticate a user.
 */
export function authorizeJaspicAdminOffline(
  identity: TrustedServerIdentity | null,
  config: AdminAuthorizationConfig,
): ApprovedJaspicAdmin {
  if (!identity || identity.sessionVerified !== true ||
      !config.expectedIssuer || !config.expectedEmail ||
      !identity.issuer || !identity.verifiedEmail) {
    throw new Error("JASPIC admin access denied");
  }
  assertIdentifier(identity.subject);
  assertIdentifier(config.expectedSubject);
  if (identity.subject !== config.expectedSubject ||
      identity.verifiedEmail !== config.expectedEmail ||
      identity.issuer !== config.expectedIssuer) {
    throw new Error("JASPIC admin access denied");
  }
  return { ownerId: identity.subject };
}
