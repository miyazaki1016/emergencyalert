import { describe, expect, it, vi } from "vitest";
import {
  verifyJaspicSupabaseIdentity, type SupabaseAuthVerifier,
} from "../../supabase/functions/_shared/jaspic/gmail-oauth-supabase-auth";
import { authorizeJaspicAdminOffline } from "../../supabase/functions/_shared/jaspic/gmail-oauth-admin-offline";

const issuer = "https://test-project.supabase.co/auth/v1";
const id = "12345678-abcd-4def-9123-000000000001";
const email = "owner@example.invalid";
const confirmed = "2026-11-05T00:00:00.000Z";

function verifier(user: {id: string;email: string|null;email_confirmed_at: string|null}|null): SupabaseAuthVerifier {
  return {auth: {getUser: vi.fn(async () => ({data: {user},error: null}))}};
}

describe("JASPIC Supabase Auth adapter (mock-only)", () => {
  it("reads user from server-side getUser and checks verified owner", async () => {
    const auth = verifier({id,email,email_confirmed_at: confirmed});
    const user = await verifyJaspicSupabaseIdentity(auth, "mock-access-token", {issuer});
    expect(auth.auth.getUser).toHaveBeenCalledWith("mock-access-token");
    expect(authorizeJaspicAdminOffline(user,{
      expectedSubject: id, expectedEmail: email, expectedIssuer: issuer,
    })).toEqual({ownerId: id});
  });

  it("rejects missing confirmation, missing user and invalid issuer", async () => {
    await expect(verifyJaspicSupabaseIdentity(verifier({id,email,email_confirmed_at: null}),
      "mock-access-token", {issuer})).rejects.toThrow("JASPIC login required");
    await expect(verifyJaspicSupabaseIdentity(verifier(null),
      "mock-access-token", {issuer})).rejects.toThrow("JASPIC login required");
    await expect(verifyJaspicSupabaseIdentity(verifier({id,email,email_confirmed_at: confirmed}),
      "mock-access-token", {issuer: "http://bad.example"})).rejects.toThrow("JASPIC login required");
  });

  it("rejects Auth verification failures without revealing server details", async () => {
    const auth: SupabaseAuthVerifier = {auth: {getUser: async () => ({
      data: {user: null}, error: {message: "internal-auth-error"},
    })}};
    await expect(verifyJaspicSupabaseIdentity(auth,"mock-access-token",{issuer}))
      .rejects.toThrow("JASPIC login required");
  });

  it("never accepts caller-provided email or subject as verification", async () => {
    const auth = verifier({id: "12345678-abcd-4def-9123-000000000002",email,
      email_confirmed_at: confirmed});
    const user = await verifyJaspicSupabaseIdentity(auth,"mock-access-token",{issuer});
    expect(() => authorizeJaspicAdminOffline(user,{
      expectedSubject: id, expectedEmail: email, expectedIssuer: issuer,
    })).toThrow("JASPIC admin access denied");
  });
});
