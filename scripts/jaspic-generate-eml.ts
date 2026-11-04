// Offline synthetic fixtures only. No network or environment/secret access.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateEml, type MimeMode } from "../supabase/functions/_shared/jaspic/mime.ts";
import type { Kind, RecordData } from "../supabase/functions/_shared/jaspic/mail.ts";
if(process.argv.length!==4) throw new Error("Usage: node scripts/jaspic-generate-eml.ts synthetic-fixtures.json output-directory");
const fixtures=JSON.parse(readFileSync(process.argv[2],"utf8")) as {kind:Kind;current:RecordData;previous:RecordData|null;cityName:string;stationName:string}[];
mkdirSync(process.argv[3],{recursive:true});
for(const f of fixtures) for(const mode of ["unprepared","seven-bit","eight-bit"] as MimeMode[]) {
  if(!["hiroshima-crime","hiroshima-person","shiga-person"].includes(f.kind)) throw new Error("Invalid synthetic kind");
  const name=f.kind+(f.previous===null?"-new":"-update")+"-"+mode+".eml";
  writeFileSync(join(process.argv[3],name),generateEml(f.kind,f.current,f.previous,f,mode,{date:"Wed, 04 Nov 2026 18:00:00 +0900",messageId:"synthetic-jaspic@localhost.invalid"}));
}
console.log(`Generated ${fixtures.length*3} synthetic EML files; sent=0`);
