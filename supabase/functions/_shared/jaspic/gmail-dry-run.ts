/** Offline Gmail API payload preparation only. NO HTTP, OAuth, SMTP or send operation. */
export const JASPIC_GMAIL_FROM = "miyazaki1016@gmail.com" as const;
const encoder = new TextEncoder();
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64Url(input: Uint8Array): string {
  let result = "";
  for (let i = 0; i < input.length; i += 3) {
    const n = (input[i] << 16) | ((input[i + 1] ?? 0) << 8) | (input[i + 2] ?? 0);
    result += alphabet[n >>> 18] + alphabet[(n >>> 12) & 63];
    result += i + 1 < input.length ? alphabet[(n >>> 6) & 63] : "=";
    result += i + 2 < input.length ? alphabet[n & 63] : "=";
  }
  return result.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
/** Prepares a payload shape for Gmail API; cannot submit it to any endpoint. */
export function prepareGmailRawOffline(legacyEml: Uint8Array): { raw: string; from: typeof JASPIC_GMAIL_FROM } {
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(legacyEml);
  const boundary = decoded.indexOf("\r\n\r\n");
  if (boundary < 0 || /(?<!\r)\n|\r(?!\n)/.test(decoded)) throw new Error("Invalid MIME line endings");
  const header = decoded.slice(0, boundary);
  const body = decoded.slice(boundary + 4);
  const lines = header.split("\r\n");
  if (lines.some(line => /^[ \t]/.test(line))) throw new Error("Folded headers require review");
  const fromLines = lines.filter(line => /^From:/i.test(line));
  if (fromLines.length !== 1 || fromLines[0] !== "From: hppmap@kishibojim.online") throw new Error("Unexpected legacy sender");
  for (const name of ["To", "Cc", "Subject", "Content-Type", "MIME-Version"]) {
    if (lines.filter(line => line.startsWith(name + ":")).length !== 1) throw new Error("Invalid required header");
  }
  if (lines.some(line => /^(Bcc|Return-Path|Sender|Reply-To):/i.test(line))) throw new Error("Unreviewed routing header");
  const changedHeader = lines.map(line => line === fromLines[0] ? "From: " + JASPIC_GMAIL_FROM : line).join("\r\n");
  const eml = changedHeader + "\r\n\r\n" + body;
  if (eml.slice(eml.indexOf("\r\n\r\n") + 4) !== body) throw new Error("Body changed");
  return { raw: base64Url(encoder.encode(eml)), from: JASPIC_GMAIL_FROM };
}
