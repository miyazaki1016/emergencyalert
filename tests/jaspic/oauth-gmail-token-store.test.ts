import { describe, expect, it, vi } from "vitest";
import {
  deleteEncryptedGmailRefreshToken,
  readEncryptedGmailRefreshToken,
  saveEncryptedGmailRefreshToken,
} from "../../lib/jaspic/oauth-gmail-token-store-server";

vi.mock("server-only", () => ({}));

const ownerId = "12345678-1234-1234-1234-123456789abc";
const googleSubject = "123456789012";
const encryptionKey = Buffer.alloc(32, 8).toString("base64url");

function fixture() {
  const rows = new Map<string, Record<string, unknown>>();
  const from = vi.fn(() => ({
    upsert: async (row: Record<string, unknown>, options: { onConflict: string }) => {
      expect(options.onConflict).toBe("owner_id");
      rows.set(String(row.owner_id), row);
      return { error: null };
    },
    select: () => ({
      eq: (_column: string, owner: string) => ({
        maybeSingle: async () => ({ data: rows.get(owner) ?? null, error: null }),
      }),
    }),
    delete: () => ({
      eq: async (_column: string, owner: string) => {
        rows.delete(owner);
        return { error: null };
      },
    }),
  }));
  const db = { from } as unknown as Parameters<typeof saveEncryptedGmailRefreshToken>[0]["db"];
  return { rows, from, access: { db, ownerId, expectedAdminId: ownerId, encryptionKey } };
}

describe("Gmail refresh-token vault", () => {
  it("stores only ciphertext, replaces one row, reads it, and deletes idempotently", async () => {
    const { access, rows, from } = fixture();
    expect(await readEncryptedGmailRefreshToken(access)).toBeNull();
    const first = "synthetic-refresh-credential";
    await saveEncryptedGmailRefreshToken({ ...access, googleSubject, refreshToken: first });
    expect(JSON.stringify(rows.get(ownerId))).not.toContain(first);
    expect(await readEncryptedGmailRefreshToken(access)).toBe(first);
    const second = "synthetic-replacement-credential";
    await saveEncryptedGmailRefreshToken({ ...access, googleSubject, refreshToken: second });
    expect(rows.size).toBe(1);
    expect(await readEncryptedGmailRefreshToken(access)).toBe(second);
    await deleteEncryptedGmailRefreshToken(access);
    await deleteEncryptedGmailRefreshToken(access);
    expect(await readEncryptedGmailRefreshToken(access)).toBeNull();
    expect(from).toHaveBeenCalledWith("jaspic_gmail_token_vault");
  });

  it("refuses access for the wrong owner and rejects a changed Google subject", async () => {
    const { access, from, rows } = fixture();
    const wrong = { ...access, expectedAdminId: "00000000-0000-0000-0000-000000000000" };
    await expect(readEncryptedGmailRefreshToken(wrong)).rejects.toThrow("Unauthorized");
    await expect(deleteEncryptedGmailRefreshToken(wrong)).rejects.toThrow("Unauthorized");
    await expect(saveEncryptedGmailRefreshToken({
      ...wrong, googleSubject, refreshToken: "synthetic-refresh-credential",
    })).rejects.toThrow("Unauthorized");
    expect(from).not.toHaveBeenCalled();
    await saveEncryptedGmailRefreshToken({ ...access, googleSubject, refreshToken: "synthetic-refresh-credential" });
    rows.get(ownerId)!.google_subject = "999999999999";
    await expect(readEncryptedGmailRefreshToken(access)).rejects.toThrow();
  });
});
