import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import fixtures from "./mime-fixtures.json";
import { generateEml, type MimeMode } from "../../supabase/functions/_shared/jaspic/mime";
import { generateMail, type Kind, type RecordData } from "../../supabase/functions/_shared/jaspic/mail";
// @ts-expect-error Node-only comparator is JavaScript.
import { compareEml } from "../../scripts/compare-jaspic-eml.mjs";
const identity={date:"Wed, 04 Nov 2026 18:00:00 +0900",messageId:"synthetic-jaspic@localhost.invalid"};
describe("offline MimeKit 4.12 parity",()=>{
  for(const f of fixtures) for(const mode of ["unprepared","seven-bit","eight-bit"] as MimeMode[]) {
    const name=f.kind+(f.previous===null?"-new":"-update")+"-"+mode+".eml";
    it(name,()=>{
      const old=readFileSync(join(process.env.JASPIC_MIME_ORACLE_DIR??"tests/jaspic/mime-golden",name));
      const next=Buffer.from(generateEml(f.kind as Kind,f.current as RecordData,f.previous as RecordData|null,f,mode,identity));
      expect(next).toEqual(old); // full bytes, even Date/Message-ID (no exclusions)
      expect(compareEml(old,next,{stage:mode==="unprepared"?"unprepared":"prepared"})).toBe(true);
      const raw=next.toString("utf8");
      const [header,...body]=raw.split("\r\n\r\n");
      expect(header).toContain("charset=utf-8");
      expect(header).toContain("Subject: [JASPIC-NES] =?utf-8?b?");
      expect(generateMail(f.kind as Kind,f.current as RecordData,f.previous as RecordData|null,f).subject.startsWith(" ")).toBe(true);
      const wireBody=body.join("\r\n\r\n");
      const decoded=mode==="seven-bit"?Buffer.from(wireBody,"base64").toString("utf8"):wireBody;
      expect(decoded).toBe(generateMail(f.kind as Kind,f.current as RecordData,f.previous as RecordData|null,f).body);
      expect(raw.replaceAll("\r\n","")).not.toMatch(/[\r\n]/);
    });
  }
  it("rejects unverified QP/long lines and MIME identity injection",()=>{
    const f=fixtures[0];
    for(const address of ["x".repeat(1000),"x\r\nFrom synthetic-marker","x\r\n".repeat(2000)]) {
      expect(()=>generateEml(f.kind as Kind,{...f.current,address} as RecordData,null,f,"seven-bit",identity)).toThrow();
    }
    expect(()=>generateEml(f.kind as Kind,f.current as RecordData,null,f,"eight-bit",{...identity,date:"x\r\nInjected: y"})).toThrow();
  });
});
