/** Issue #238 ONLY: isolated test Gmail transport.
 * Never import this into production dispatch. Does not access credentials or DB.
 * Caller must claim a private delivery before invoking. */
const TEST_RECIPIENT = "kishibojim@gmail.com";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

export function isolatedTestRaw(mail: { subject: string; body: string }) {
  if (!mail.subject.trim() || !mail.body.trim() || /[\r\n]/.test(mail.subject)) {
    throw new Error("ISOLATED_MAIL_INVALID");
  }
  const body = Buffer.from(mail.body).toString("base64").match(/.{1,76}/g)?.join("\r\n");
  if (!body) throw new Error("ISOLATED_MAIL_INVALID");
  return Buffer.from(
    "From: miyazaki1016@gmail.com\r\n" +
    "To: " + TEST_RECIPIENT + "\r\n" +
    "Subject: =?UTF-8?B?" + Buffer.from("[JASPIC 隔離試験] " + mail.subject).toString("base64") + "?=\r\n" +
    "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n" +
    "Content-Transfer-Encoding: base64\r\n\r\n" + body + "\r\n"
  ).toString("base64url");
}

export async function sendIsolatedTestMail(
  accessToken: string,
  mail: { subject: string; body: string },
  request: typeof fetch
): Promise<{status:"SENT"|"FAILED"|"UNKNOWN";message:string|null;error:string|null}> {
  // Injected transport is mandatory; no default global fetch in this module.
  if (!accessToken || !request) throw new Error("ISOLATED_TRANSPORT_NOT_CONFIGURED");
  const raw = isolatedTestRaw(mail);
  try {
    const response = await request(GMAIL_SEND_URL, {
      method:"POST",
      headers:{Authorization:"Bearer " + accessToken,"Content-Type":"application/json"},
      body:JSON.stringify({raw}),redirect:"error",cache:"no-store",signal:AbortSignal.timeout(10000),
    });
    if (!response.ok) return {status:response.status>=400&&response.status<500?"FAILED":"UNKNOWN",message:null,error:"GMAIL_HTTP_"+response.status};
    const data:unknown = await response.json();
    if (!data || typeof data!=="object" || !("id" in data) || typeof data.id!=="string" || !/^[a-zA-Z0-9_-]+$/.test(data.id))
      return {status:"UNKNOWN",message:null,error:"GMAIL_RESPONSE_INVALID"};
    return {status:"SENT",message:data.id,error:null};
  } catch {
    return {status:"UNKNOWN",message:null,error:"GMAIL_RESULT_UNCERTAIN"};
  }
}
