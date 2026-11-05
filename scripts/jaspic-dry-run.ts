// Read-only public source probe. No DB client, SMTP transport or email API.
import { collect, type Province } from "../supabase/functions/_shared/jaspic/collect.ts";
import { plan } from "../supabase/functions/_shared/jaspic/state.ts";
const province = process.argv[2];
if (province !== "hiroshima" && province !== "shiga") throw new Error("Usage: node scripts/jaspic-dry-run.ts hiroshima|shiga");
try {
  const items = await collect(province as Province);
  const initial = await plan(province, {revision:0,baseline:false,records:{}},items);
  const repeated = await plan(province, {...initial,revision:1},items);
  const changed = items.map((item,index)=>index===0?{...item,data:{...item.data,address:(item.data.address??"")+"【合成更新検証】"}}:item);
  const update = await plan(province,{...initial,revision:1},changed);
  console.log(JSON.stringify({province,counts:Object.fromEntries([...new Set(items.map(i=>i.kind))].map(kind=>[kind,items.filter(i=>i.kind===kind).length])),
    baselineCandidates:initial.candidates.length,repeatedCandidates:repeated.candidates.length,syntheticUpdateCandidates:update.candidates.length,
    comparisonPayloadBytes:Buffer.byteLength(JSON.stringify(initial.records)),sent:0,persisted:false}));
} catch {
  console.error(JSON.stringify({province,error:"SOURCE_OR_VALIDATION_FAILED",sent:0,persisted:false}));
  process.exitCode=1;
}
