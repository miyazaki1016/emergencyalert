import { generateMail, type Kind, type RecordData, type MailContext } from "./mail.ts";

export type MimeMode = "unprepared" | "seven-bit" | "eight-bit";
export type MimeIdentity = { date: string; messageId: string };
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64(bytes: Uint8Array): string {
  let result = "";
  for (let i=0;i<bytes.length;i+=3) {
    const n=(bytes[i]<<16)|((bytes[i+1]??0)<<8)|(bytes[i+2]??0);
    result+=alphabet[n>>>18]+alphabet[(n>>>12)&63]+(i+1<bytes.length?alphabet[(n>>>6)&63]:"=")+(i+2<bytes.length?alphabet[n&63]:"=");
  }
  return result;
}
/** Offline, fixed JASPIC text/plain profile. No network, SMTP or secret handling. */
export function generateEml(kind: Kind, current: RecordData, previous: RecordData | null, context: MailContext,
  mode: MimeMode, identity: MimeIdentity): Uint8Array {
  if (!["unprepared","seven-bit","eight-bit"].includes(mode)) throw new Error("Unsupported MIME mode");
  if (!/^[\x20-\x7e]+$/.test(identity.date) || !/^[a-zA-Z0-9_.@-]+$/.test(identity.messageId)) throw new Error("Invalid MIME identity");
  const mail=generateMail(kind,current,previous,context);
  if (mail.body.replaceAll("\r\n","").match(/[\r\n]/)) throw new Error("Body must use CRLF");
  const bodyBytes=new TextEncoder().encode(mail.body);
  if (bodyBytes.some(b=>b===0) || mail.body.split("\r\n").some(line=>new TextEncoder().encode(line).length>998)) throw new Error("MIME profile line limit exceeded");
  if(mode!=="unprepared" && /(^|\r\n)From /.test(mail.body)) throw new Error("Quoted-printable profile not yet verified");
  // MimeKit 4.12 strips leading Subject whitespace while RFC2047 encoding the Japanese word.
  // The logical Subject in mail.ts remains unchanged, including its original leading space.
  const japaneseSubject=(kind==="shiga-person"?"滋賀":"広島")+"県警専用ツール";
  const headers=[`From: ${mail.from}`,`Date: ${identity.date}`,
    `Subject: [JASPIC-NES] =?utf-8?b?${base64(new TextEncoder().encode(japaneseSubject))}?=`,
    `Message-Id: <${identity.messageId}>`,`To: ${mail.to}`,`Cc: ${mail.cc}`,"MIME-Version: 1.0","Content-Type: text/plain; charset=utf-8"];
  let body=mail.body;
  if(mode==="eight-bit") headers.push("Content-Transfer-Encoding: 8bit");
  if(mode==="seven-bit") {
    // MimeKit 4.12 BestEncodingFilter: count8 >= (int)(total * 0.17).
    // Fail closed for QP rather than guessing its byte wrapping.
    const high=bodyBytes.filter(b=>b>127).length;
    if(high<Math.floor(bodyBytes.length*0.17)) throw new Error("Quoted-printable profile not yet verified");
    headers.push("Content-Transfer-Encoding: base64");
    body=base64(bodyBytes).match(/.{1,76}/g)!.join("\r\n")+"\r\n";
  }
  return new TextEncoder().encode(headers.join("\r\n")+"\r\n\r\n"+body);
}
