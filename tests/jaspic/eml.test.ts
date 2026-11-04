import { expect, it } from "vitest";
// @ts-expect-error Node-only diagnostic script intentionally has no TS declaration.
import { compareEml } from "../../scripts/compare-jaspic-eml.mjs";
const message=Buffer.from('From: hppmap@kishibojim.online\r\nTo: getter01@jaspic-nes.net\r\nCc: kishibojim@gmail.com\r\nSubject:  [JASPIC-NES] test\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\nDate: Wed, 4 Nov 2026 00:00:00 +0000\r\nMessage-ID: <synthetic@localhost>\r\n\r\neA0K\r\n');
it("MIME comparator detects subject space, charset, CTE, folding and body mismatches",()=>{
  for(const [from,to] of [['Subject:  ','Subject: '],['charset=utf-8','charset=iso-2022-jp'],['base64','quoted-printable'],['eA0K','eQ0K'],['Cc: kishibojim','Cc:\r\n kishibojim']]) {
    expect(compareEml(message,Buffer.from(message.toString().replace(from,to)))).toBe(false);
  }
  expect(compareEml(message,Buffer.from(message.toString().replace('Wed, 4 Nov','Thu, 5 Nov')))).toBe(true);
  expect(()=>compareEml(message,Buffer.from(message.toString().replaceAll('\r\n','\n')))).toThrow();
});
