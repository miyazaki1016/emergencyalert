import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({collect:vi.fn(),plan:vi.fn(),send:vi.fn(),refresh:vi.fn(),create:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("@supabase/supabase-js",()=>({createClient:mocks.create}));
vi.mock("../../supabase/functions/_shared/jaspic/collect",()=>({collect:mocks.collect}));
vi.mock("../../lib/jaspic/production-plan",()=>({productionPlan:mocks.plan,assertVerifiedBackfillScope:vi.fn()}));
vi.mock("../../lib/jaspic/production-gmail",()=>({sendProductionMail:mocks.send}));
vi.mock("../../lib/jaspic/oauth-gmail-token-store-server",()=>({readEncryptedGmailRefreshToken:mocks.refresh}));
import {POST} from "../../app/jaspic/dispatch/route";

function fixture(queue:unknown[]=[]){
 const writes:{table:string;row:Record<string,unknown>}[]=[];
 const rpc=vi.fn(async(name:string)=>({error:null,data:name==="jaspic_legacy_hiroshima_person_ids"?[]:true}));
 const query=(table:string,mode:"select"|"update"="select")=>{
  const q={
   in:(_field:string,statuses:string[])=>({
    limit:async()=>({error:null,data:statuses.includes("PREPARED")?[]:[]}),
   }),
   eq:(_field:string,_value:unknown)=>q,
   order:()=>q,
   limit:async()=>({error:null,data:table==="jaspic_deliveries"?queue:[]}),
   then:(resolve:(value:unknown)=>unknown)=>resolve({error:null,data:table==="jaspic_deliveries"?queue:[],count:0}),
  };
  return q;
 };
 mocks.create.mockReturnValue({rpc,from:(table:string)=>({
  select:(_columns:string,_opts?:unknown)=>query(table),
  update:(row:Record<string,unknown>)=>{writes.push({table,row});return {eq:()=>({eq:async()=>({error:null,data:[]})})};},
 })});
 return {writes,rpc};
}
const req=()=>new Request("https://emergencyalert.news/jaspic/dispatch",{method:"POST",headers:{Authorization:"Bearer synthetic-dispatch"}});
beforeEach(()=>{
 vi.resetAllMocks();
 for(const [key,value] of Object.entries({JASPIC_DISPATCH_TOKEN:"synthetic-dispatch",JASPIC_PRODUCTION_SEND_ENABLED:"true",NEXT_PUBLIC_SUPABASE_URL:"https://example.supabase.co",SUPABASE_SERVICE_ROLE_KEY:"synthetic-service",JASPIC_ADMIN_USER_ID:"synthetic-owner",JASPIC_GMAIL_TOKEN_VAULT_KEY:"synthetic-key",JASPIC_GOOGLE_WEB_CLIENT_ID:"synthetic-client",JASPIC_GOOGLE_WEB_CLIENT_SECRET:"synthetic-client-secret"}))vi.stubEnv(key,value);
 mocks.collect.mockResolvedValue([]);
 mocks.plan.mockResolvedValue({expectedRevision:1,records:{},candidates:[],quarantined:[]});
 mocks.refresh.mockResolvedValue("synthetic-refresh");
 vi.stubGlobal("fetch",vi.fn(async()=>Response.json({access_token:"synthetic-access"})));
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe("JASPIC dispatch monitoring metadata",()=>{
 it("records both province fetch failures, sanitizes exceptions, and prepares/sends nothing",async()=>{
  const f=fixture();
  mocks.collect.mockImplementation(async(p:string)=>{if(p==="shiga")await Promise.resolve();throw new Error("private url/token must never reach logs");});
  const response=await POST(req());
  expect(response.status).toBe(503);
  const failed=f.writes.find(w=>w.table==="jaspic_runs")!.row;
  expect(failed.error_code).toBe("SOURCE_FETCH_FAILED");
  expect(failed.result).toMatchObject({stage:"source-preflight",sourceErrors:expect.arrayContaining([{province:"hiroshima",code:"SOURCE_FETCH_FAILED"},{province:"shiga",code:"SOURCE_FETCH_FAILED"}])});
  expect(JSON.stringify(failed)).not.toContain("private url");
  expect(f.rpc.mock.calls.some(c=>c[0]==="jaspic_prepare_production")).toBe(false);
  expect(mocks.send).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
 });
 it("identifies Gmail authentication errors before preparing any mail",async()=>{
  const f=fixture();mocks.refresh.mockRejectedValue(new Error("opaque credential details"));
  await POST(req());
  expect(f.writes.find(w=>w.table==="jaspic_runs")!.row).toMatchObject({error_code:"JASPIC_RUN_FAILED",result:{stage:"gmail-auth"}});
  expect(mocks.send).not.toHaveBeenCalled();
 });
 it("keeps numeric Gmail error codes and partial-success counts without retrying messages",async()=>{
  const f=fixture([{province:"hiroshima",record_key:"one",version:"one",mail:{}},{province:"shiga",record_key:"two",version:"two",mail:{}}]);
  mocks.send.mockResolvedValueOnce({status:"SENT",message:"synthetic-id",error:null}).mockResolvedValueOnce({status:"FAILED",message:null,error:"GMAIL_HTTP_403"});
  const result=await (await POST(req())).json();
  expect(result.error).toBe("GMAIL_HTTP_403");
  expect(mocks.send).toHaveBeenCalledTimes(2);
  expect(f.writes.find(w=>w.table==="jaspic_runs")!.row).toMatchObject({result:{stage:"gmail-send",province:"shiga",sent:{hiroshima:1,shiga:0}}});
 });
 it("refuses unauthorized invocation before database or mail operations",async()=>{
  fixture();expect((await POST(new Request("https://emergencyalert.news/jaspic/dispatch",{method:"POST"}))).status).toBe(401);
  expect(mocks.create).not.toHaveBeenCalled();expect(mocks.send).not.toHaveBeenCalled();
 });
});
