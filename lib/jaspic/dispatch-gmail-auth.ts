export type DispatchGmailAuth = "normal" | "reauthorize" | "unknown";

export async function refreshDispatchGmail({readRefreshToken, clientId, clientSecret}: {
  readRefreshToken: () => Promise<string | null>;
  clientId: string;
  clientSecret: string;
}): Promise<{status: DispatchGmailAuth; accessToken: string | null}> {
  try {
    const refresh = await readRefreshToken();
    if (!refresh) return {status: "reauthorize", accessToken: null};
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      body: new URLSearchParams({
        client_id: clientId, client_secret: clientSecret,
        refresh_token: refresh, grant_type: "refresh_token",
      }),
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const result = await response.json();
    if (response.ok && typeof result?.access_token === "string" && result.access_token.length >= 8) {
      return {status: "normal", accessToken: result.access_token};
    }
    if (response.status === 400 && result?.error === "invalid_grant") {
      return {status: "reauthorize", accessToken: null};
    }
  } catch {
    // A timeout, invalid response, or vault read error does not prove revocation.
  }
  return {status: "unknown", accessToken: null};
}
