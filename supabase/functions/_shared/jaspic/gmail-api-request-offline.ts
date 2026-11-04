/**
 * Gmail API request construction ONLY; no fetch, OAuth execution, SMTP or secrets storage.
 * The result contains a bearer token: never serialize it to logs, GitHub or diagnostics.
 * Not connected to any Edge Function.
 */
export type GmailSendRequestOffline = {
  url: "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
  method: "POST";
  headers: { Authorization: string; "Content-Type": "application/json" };
  body: string;
};
export function prepareGmailSendRequestOffline(
  raw: string, accessToken: string,
): GmailSendRequestOffline {
  if (!/^[A-Za-z0-9_-]+$/.test(raw) || raw.length > 15_000_000) {
    throw new Error("Invalid encoded MIME payload");
  }
  if (!accessToken || accessToken.length > 8192 || /[\r\n\0\s]/.test(accessToken)) {
    throw new Error("Invalid OAuth access token");
  }
  return {
    url: "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  };
}
