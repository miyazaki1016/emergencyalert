/** Issue #238: OAuth refresh transport shared with existing JASPIC Gmail flow.
 * Does not read credentials, access the database, or send email. The caller
 * must obtain the refresh token through the existing authenticated vault flow.
 */
export async function refreshIsolatedGmailAccessToken(
  credentials: {clientId:string;clientSecret:string;refreshToken:string},
  request: typeof fetch
): Promise<string> {
  if (!credentials.clientId || !credentials.clientSecret || !credentials.refreshToken || !request)
    throw new Error("ISOLATED_OAUTH_NOT_CONFIGURED");
  let response: Response;
  try {
    response = await request("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {"Content-Type":"application/x-www-form-urlencoded"},
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        refresh_token: credentials.refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error("ISOLATED_OAUTH_REFRESH_UNAVAILABLE");
  }
  if (!response.ok) throw new Error("ISOLATED_OAUTH_REFRESH_FAILED");
  let data: unknown;
  try { data = await response.json(); }
  catch { throw new Error("ISOLATED_OAUTH_RESPONSE_INVALID"); }
  if (!data || typeof data !== "object" ||
      !("access_token" in data) || typeof data.access_token !== "string" ||
      data.access_token.length < 8 ||
      !("token_type" in data) || data.token_type !== "Bearer")
    throw new Error("ISOLATED_OAUTH_RESPONSE_INVALID");
  return data.access_token;
}
