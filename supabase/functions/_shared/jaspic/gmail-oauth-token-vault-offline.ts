/**
 * Offline encryption envelope for JASPIC Gmail refresh tokens.
 *
 * NO persistent storage, no env access, no Google API calls, and NO sending.
 * Key material must be supplied from the server secret manager only.
 * Rotation/revocation and real DB integration remain separate work.
 */
const context = "jaspic-gmail-refresh-token:v1";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type EncryptedRefreshToken = Readonly<{
  version: 1;
  keyId: string;
  iv: string;
  ciphertext: string;
}>;

function base64url(bytes: Uint8Array): string {
  let value = "";
  for (const b of bytes) value += String.fromCharCode(b);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromBase64url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid token envelope");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded + "=".repeat((4 - padded.length % 4) % 4)), c => c.charCodeAt(0));
}
async function loadKey(rawKey: string): Promise<CryptoKey> {
  const bytes = fromBase64url(rawKey);
  if (bytes.length !== 32) throw new Error("Invalid token encryption key");
  return crypto.subtle.importKey("raw", bytes as BufferSource, {name:"AES-GCM"}, false, ["encrypt","decrypt"]);
}
function validateOwner(owner: string) {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(owner)) throw new Error("Invalid token owner");
}
function validateKeyId(id: string) {
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(id)) throw new Error("Invalid encryption key ID");
}

/** Encrypts refresh token for a specific admin owner; envelope is safe to persist. */
export async function encryptGmailRefreshTokenOffline(
  refreshToken: string,
  owner: string,
  rawKey: string,
  keyId: string,
): Promise<EncryptedRefreshToken> {
  validateOwner(owner);
  validateKeyId(keyId);
  if (refreshToken.length < 8 || refreshToken.length > 4096 || /[\r\n\0]/.test(refreshToken)) {
    throw new Error("Invalid refresh token");
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({
    name: "AES-GCM",
    iv: iv as BufferSource,
    additionalData: encoder.encode(context + ":" + owner) as BufferSource,
  }, await loadKey(rawKey), encoder.encode(refreshToken) as BufferSource);
  return { version: 1, keyId, iv: base64url(iv), ciphertext: base64url(new Uint8Array(encrypted)) };
}

/** Server-only use. Do not serialize plaintext returned here into responses. */
export async function decryptGmailRefreshTokenOffline(
  envelope: EncryptedRefreshToken,
  owner: string,
  rawKey: string,
  expectedKeyId: string,
): Promise<string> {
  try {
    validateOwner(owner);
    validateKeyId(expectedKeyId);
    if (envelope.version !== 1 || envelope.keyId !== expectedKeyId) throw new Error();
    const iv = fromBase64url(envelope.iv);
    const ciphertext = fromBase64url(envelope.ciphertext);
    if (iv.length !== 12 || ciphertext.length < 24) throw new Error();
    const plaintext = await crypto.subtle.decrypt({
      name:"AES-GCM",
      iv: iv as BufferSource,
      additionalData: encoder.encode(context + ":" + owner) as BufferSource,
    }, await loadKey(rawKey), ciphertext as BufferSource);
    return decoder.decode(plaintext);
  } catch {
    throw new Error("Invalid encrypted refresh token");
  }
}
