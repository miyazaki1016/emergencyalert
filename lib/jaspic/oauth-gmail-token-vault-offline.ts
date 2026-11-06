/** AES-256-GCM encryption for the Gmail OAuth token vault.
 * No database writes, network calls, refreshes or Gmail sends.
 * Key: 32 random bytes, base64url encoded, supplied only by server runtime.
 */
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const AAD = Buffer.from("jaspic:gmail-send:refresh-token:v1", "utf8");
export type SealedRefreshToken = { version: 1; iv: string; ciphertext: string; tag: string };

function keyFromBase64url(encoded: string): Buffer {
  if (!/^[A-Za-z0-9_-]{43}$/.test(encoded)) throw new Error("Invalid token encryption key");
  const key = Buffer.from(encoded, "base64url");
  if (key.length !== 32 || key.toString("base64url") !== encoded) throw new Error("Invalid token encryption key");
  return key;
}

export function assertGmailVaultKey(encoded: string): void {
  keyFromBase64url(encoded);
}

function associatedData(binding?: readonly [string, string]): Buffer {
  return binding ? Buffer.concat([AAD, Buffer.from(JSON.stringify(binding))]) : AAD;
}

export function sealRefreshTokenOffline(token: string, encodedKey: string, binding?: readonly [string, string]): SealedRefreshToken {
  if (typeof token !== "string" || token.length < 10 || token.length > 8192 || /[\r\n\0]/.test(token)) {
    throw new Error("Invalid refresh token");
  }
  const key = keyFromBase64url(encodedKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(associatedData(binding));
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return { version: 1, iv: iv.toString("base64url"), ciphertext: ciphertext.toString("base64url"), tag: cipher.getAuthTag().toString("base64url") };
}

export function openRefreshTokenOffline(payload: SealedRefreshToken, encodedKey: string, binding?: readonly [string, string]): string {
  const key = keyFromBase64url(encodedKey);
  if (!payload || payload.version !== 1 || !payload.iv || !payload.ciphertext || !payload.tag) throw new Error("Invalid sealed token");
  const iv = Buffer.from(payload.iv, "base64url");
  const tag = Buffer.from(payload.tag, "base64url");
  if (iv.length !== 12 || tag.length !== 16) throw new Error("Invalid sealed token");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(associatedData(binding));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
