import { expect, it, vi } from "vitest";
import fixtures from "./fixtures.json";
import { collect } from "../../supabase/functions/_shared/jaspic/collect";
import { createHandler } from "../../supabase/functions/_shared/jaspic/handler";
import { plan } from "../../supabase/functions/_shared/jaspic/state";
const f = fixtures[0];
const item = {kind:"hiroshima-crime" as const,data:f.current,context:f};
const req = (body: unknown, token = "local-test") => new Request("http://localhost",{method:"POST",headers:{"x-jaspic-token":token},body:JSON.stringify(body)});
it("hard rejects send mode, unauthenticated requests and unapproved persistence", async () => {
  const load = vi.fn(); const commit = vi.fn();
  const handler = createHandler("hiroshima",{token:"local-test",persistAllowed:false,store:{load,commit}});
  expect((await handler(req({mode:"send"}))).status).toBe(400);
  expect((await handler(req({mode:"dry-run"},"wrong"))).status).toBe(401);
  expect((await handler(req({mode:"dry-run",persist:true}))).status).toBe(403);
  expect(load).not.toHaveBeenCalled(); expect(commit).not.toHaveBeenCalled();
});
it("two provinces run independently; failure cannot commit or leak source data", async () => {
  const load = vi.fn(async () => ({revision:0,baseline:false,records:{}}));
  const commit = vi.fn(); const store={load,commit};
  const h = createHandler("hiroshima",{token:"local-test",persistAllowed:true,store,collect:async()=>[item]});
  const s = createHandler("shiga",{token:"local-test",persistAllowed:true,store,collect:async()=>{throw new Error("private source payload");}});
  const [a,b] = await Promise.all([h(req({mode:"dry-run",persist:true})),s(req({mode:"dry-run",persist:true}))]);
  expect(await a.json()).toMatchObject({baseline:true,candidates:0,sent:0,persisted:true});
  expect(b.status).toBe(503); expect(await b.text()).not.toContain("private");
  expect(commit).toHaveBeenCalledTimes(1); expect(commit.mock.calls[0][0]).toBe("hiroshima");
});
it("dry-run preview never writes, and large count drops leave previous baseline intact", async () => {
  const p = await plan("hiroshima",{revision:0,baseline:false,records:{}},[item]);
  const records = Object.fromEntries(Array.from({length:10},(_,i)=>[`hiroshima-crime:${i}`,item.data]));
  const commit=vi.fn();
  const handler=createHandler("hiroshima",{token:"local-test",persistAllowed:true,store:{load:async()=>({revision:1,baseline:true,records}),commit},collect:async()=>[item]});
  expect((await handler(req({mode:"dry-run",persist:true}))).status).toBe(503);
  expect(commit).not.toHaveBeenCalled();
  const preview=createHandler("hiroshima",{token:"local-test",persistAllowed:true,store:{load:async()=>({...p,revision:1}),commit},collect:async()=>[item]});
  expect((await preview(req({mode:"dry-run"}))).status).toBe(200);
  expect(commit).not.toHaveBeenCalled();
});
it("collection rejects HTTP errors, incomplete/empty/duplicate/schema-changed source", async () => {
  await expect(collect("shiga",async()=>new Response("not found",{status:404}))).rejects.toThrow("404");
  const geo={features:[{properties:{city_code:f.current.city_code,full_name:"架空市"}}]};
  const source=fixtures.find(f=>f.kind==="shiga-person")!.current;
  for (const data of [[],[source,source],[{...source, id:null}],[{id:"missing-fields"}],[{...source,latitude:34.0000}]]) {
    await expect(collect("shiga",async(url)=>Response.json(String(url).includes("geo")?geo:data))).rejects.toThrow();
  }
});
it("Shiga direct JSON is supported without a browser and keeps original field strings", async () => {
  const f=fixtures.find(f=>f.kind==="shiga-person")!;
  const mock=vi.fn(async(url: RequestInfo | URL)=>Response.json(String(url).includes("geo")?{features:[{properties:{city_code:f.current.city_code,full_name:"架空市"}}]}:[f.current]));
  const items=await collect("shiga",mock);
  expect(items).toHaveLength(1); expect(items[0].data.latitude).toBe("34.0000");
  expect(mock).toHaveBeenCalledTimes(2);
});
