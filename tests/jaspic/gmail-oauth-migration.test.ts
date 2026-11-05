import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("../../supabase/migrations/20261105074100_jaspic_oauth_once.sql", import.meta.url),
  "utf8",
);

describe("JASPIC OAuth atomic state SQL review gate (not deployed)", () => {
  it("enforces state hash uniqueness and owner-bound expiry", () => {
    expect(sql).toMatch(/state_hash text primary key/);
    expect(sql).toMatch(/owner_id text not null/);
    expect(sql).toMatch(/consumed_at timestamptz/);
    expect(sql).toMatch(/expires_at > now\(\)/);
    expect(sql).toMatch(/owner_id = p_owner_id/);
    expect(sql).toMatch(/consumed_at is null/);
  });
  it("restricts table and RPC access to server-side service role", () => {
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/revoke all on table .* from public, anon, authenticated/);
    expect(sql).toMatch(/grant .* to service_role/);
    expect(sql).toMatch(/security invoker/);
    expect(sql).toMatch(/revoke all on function .* from public, anon, authenticated/);
  });
  it("does not apply scheduled jobs or send mail", () => {
    expect(sql).not.toMatch(/cron\.schedule\s*\(/);
    expect(sql).not.toMatch(/gmail\.send\s*\(/);
  });
});
