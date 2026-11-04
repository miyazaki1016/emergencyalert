/**
 * Server-side, offline OAuth session-cookie sealing for browser-based Gmail
 * consent. No Google request, secret persistence, or email delivery.
 *
 * MUST NOT be used as a complete OAuth callback: durable one-time replay
 * prevention and owner authentication are required before production.
 */
const SESSION_TTL_MS = 5 * 60 * 1000;
const CONTEXT = "jaspic-gmail-oauth-v1";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type GmailWebSession = {
  state: string;
  codeVerifier: string;
  issuedAt: number;
  expiresAt: number;
  ownerId?: string;
};

function decodeBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid session cookie");
  const base = value.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(base + "=".repeat((4 - base.length % 4) % 4));
  return Uint8Array.from(decoded, (c) => c.charCodeAt(0));
}

function encodeBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (const byte of bytes) s += String.fromCharCode(byte);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sessionKey(secret: string): Promise<CryptoKey> {
  // The deployment must provide 32 bytes of key material, encoded as base64url.
  const bytes = decodeBase64Url(secret);
  if (bytes.length !== 32) throw new Error("Invalid OAuth session key");
  return crypto.subtle.importKey("raw", bytes as BufferSource, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function validSession(value: unknown, now: number): value is GmailWebSession {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  return typeof s.state === "string" && /^[A-Za-z0-9_-]{40,100}$/.test(s.state) &&
    typeof s.codeVerifier === "string" && /^[A-Za-z0-9_-]{43,128}$/.test(s.codeVerifier) &&
    typeof s.issuedAt === "number" && Number.isSafeInteger(s.issuedAt) &&
    typeof s.expiresAt === "number" && Number.isSafeInteger(s.expiresAt) &&
    s.issuedAt <= now && s.expiresAt > now &&
    s.expiresAt - s.issuedAt <= SESSION_TTL_MS &&
    (s.ownerId === undefined || (typeof s.ownerId === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(s.ownerId)));
}

/** Creates encrypted, short-lived cookie payload; caller sets strict cookie attributes. */
export async function sealGmailWebSessionOffline(
  state: string,
  codeVerifier: string,
  key: string,
  now = Date.now(),
  ownerId?: string,
): Promise<string> {
  const session: GmailWebSession = { state, codeVerifier, issuedAt: now, expiresAt: now + SESSION_TTL_MS, ...(ownerId ? {ownerId} : {}) };
  if (!validSession(session, now)) throw new Error("Invalid OAuth session");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = encoder.encode(JSON.stringify(session));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource, additionalData: encoder.encode(CONTEXT) as BufferSource },
    await sessionKey(key),
    encoded,
  );
  return "v1." + encodeBase64Url(iv) + "." + encodeBase64Url(new Uint8Array(ciphertext));
}

/** Rejects malformed, tampered, expired and mismatched OAuth state cookies. */
export async function openGmailWebSessionOffline(
  cookie: string,
  expectedState: string,
  key: string,
  now = Date.now(),
): Promise<GmailWebSession> {
  try {
    const parts = cookie.split(".");
    if (parts.length !== 3 || parts[0] !== "v1" || cookie.length > 4096) throw new Error();
    const iv = decodeBase64Url(parts[1]);
    const cipher = decodeBase64Url(parts[2]);
    if (iv.length !== 12 || cipher.length < 16) throw new Error();
    const result = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource, additionalData: encoder.encode(CONTEXT) as BufferSource },
      await sessionKey(key),
      cipher as BufferSource,
    );
    const session: unknown = JSON.parse(decoder.decode(result));
    if (!validSession(session, now) || session.state !== expectedState) throw new Error();
    return session;
  } catch {
    throw new Error("Invalid OAuth session");
  }
}

/** Config for server to set alongside OAuth start. Never set from client JS. */
export const GMAIL_OAUTH_COOKIE_POLICY = {
  name: "__Host-jaspic-oauth",
  path: "/",
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  maxAge: 300,
} as const;
