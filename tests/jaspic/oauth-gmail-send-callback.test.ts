import { afterEach, describe, expect, it, vi } from "vitest";
import { saveJaspicGmailSendConsent } from "../../lib/jaspic/oauth-gmail-send-callback-server";
import { sealGmailWebSessionOffline } from "../../lib/jaspic/oauth-session-offline";
import { openRefreshTokenOffline } from "../../lib/jaspic/oauth-gmail-token-vault-offline";

const db = vi.hoisted(() => ({ getUserById: vi.fn(), rpc: vi.fn(), upsert: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { admin: { getUserById: db.getUserById } },
    rpc: db.rpc,
    from: () => ({ upsert: db.upsert }),
  }),
}));

const owner = "12345678-1234-1234-1234-123456789abc";
const email = "admin@example.test";
const googleSubject = "123456789012";
const state = "a".repeat(43);
const verifier = "b".repeat(64);
const cookieKey = Buffer.alloc(32, 5).toString("base64url");
const vaultKey = Buffer.alloc(32, 9).toString("base64url");
const redirect = "https://emergencyalert.news/jaspic/oauth/callback?state=" + state + "&code=synthetic_code";
const refreshToken = "synthetic-refresh-credential";

async function fixture({ googleEmail = email, role = "admin" } = {}) {
  for (const [name, value] of Object.entries({
    JASPIC_GMAIL_SEND_CONSENT_ENABLED: "true",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role",
    JASPIC_GOOGLE_WEB_CLIENT_ID: "123.apps.googleusercontent.com",
    JASPIC_GOOGLE_WEB_CLIENT_SECRET: "synthetic-client-secret",
    JASPIC_OAUTH_COOKIE_KEY: cookieKey,
    JASPIC_ADMIN_USER_ID: owner,
    JASPIC_OAUTH_ADMIN_EMAIL: email,
    JASPIC_GMAIL_TOKEN_VAULT_KEY: vaultKey,
  })) vi.stubEnv(name, value);

  db.rpc.mockReset().mockResolvedValueOnce({ data: true, error: null }).mockResolvedValue({ data: false, error: null });
  db.getUserById.mockResolvedValue({ data: { user: {
    id: owner, email, email_confirmed_at: "2026-11-06T00:00:00Z", app_metadata: { jaspic_role: role },
  } }, error: null });
  db.upsert.mockResolvedValue({ error: null });
  const fetch = vi.fn(async (url: string, options: RequestInit) => {
    if (url === "https://oauth2.googleapis.com/token") {
      expect(new URLSearchParams(String(options.body)).get("code_verifier")).toBe(verifier);
      return Response.json({
        access_token: "synthetic-access-credential", refresh_token: refreshToken,
        token_type: "Bearer", expires_in: 3600,
        scope: "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.send",
      });
    }
    expect(url).toBe("https://openidconnect.googleapis.com/v1/userinfo");
    return Response.json({ email: googleEmail, email_verified: true, sub: googleSubject });
  });
  vi.stubGlobal("fetch", fetch);
  const cookie = await sealGmailWebSessionOffline(state, verifier, cookieKey, Date.now(), owner, "gmail-send");
  return { fetch, run: () => saveJaspicGmailSendConsent(redirect, cookie) };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Gmail OAuth callback without mail delivery", () => {
  it("stores the verified grant once, encrypted for its owner and Google account", async () => {
    const { run, fetch } = await fixture();
    expect(await run()).toBe(true);
    expect(await run()).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(db.upsert).toHaveBeenCalledOnce();
    const [row] = db.upsert.mock.calls[0];
    expect(row.owner_id).toBe(owner);
    expect(JSON.stringify(row)).not.toContain(refreshToken);
    expect(openRefreshTokenOffline(row.encrypted_refresh_token, vaultKey, [owner, googleSubject])).toBe(refreshToken);
  });

  it("discards a grant for a different Google account", async () => {
    const { run } = await fixture({ googleEmail: "other@example.test" });
    expect(await run()).toBe(false);
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it("blocks a removed administrator before contacting Google", async () => {
    const { run, fetch } = await fixture({ role: "viewer" });
    expect(await run()).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    expect(db.upsert).not.toHaveBeenCalled();
  });
});
