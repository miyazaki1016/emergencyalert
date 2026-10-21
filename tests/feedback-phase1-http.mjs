// Local PostgREST + PostgreSQL HTTP integration, NO Supabase project or real Push.
import { createHmac } from "node:crypto";
import assert from "node:assert/strict";

const secret = process.env.PHASE1_JWT_SECRET;
if (!secret || secret.length < 32) throw Error("PHASE1_JWT_SECRET missing");
const root = "http://127.0.0.1:3000";
const users = {
  A: "11111111-1111-4111-8111-111111111111",
  B: "22222222-2222-4222-8222-222222222222",
};
const base64 = value => Buffer.from(JSON.stringify(value)).toString("base64url");
function token(owner) {
  const h = base64({alg:"HS256",typ:"JWT"});
  const p = base64({role:"authenticated",sub:owner,exp:Math.floor(Date.now()/1000)+3600});
  const payload = `${h}.${p}`;
  const signature = createHmac("sha256",secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
async function request(path, {user,method="GET",body,prefer}={}) {
  const headers = {"Accept":"application/json"};
  if (user) headers.Authorization = `Bearer ${token(users[user])}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (prefer) headers.Prefer = prefer;
  const response = await fetch(root + path, {
    method,headers,body:body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try {data = text ? JSON.parse(text) : null;}
  catch {throw Error(`not JSON: ${response.status} ${text.slice(0,300)}`);}
  return {status:response.status,data};
}
function expectOk(result, note) {
  assert.ok(result.status>=200 && result.status<300,
    `${note}: HTTP ${result.status}: ${JSON.stringify(result.data)}`);
}
function expectDenied(result, note) {
  assert.ok(result.status===401 || result.status===403,
    `${note} should be forbidden: HTTP ${result.status}: ${JSON.stringify(result.data)}`);
}
const first = await request("/notification_deliveries?select=id&order=id.asc",{user:"A"});
expectOk(first,"A own notification history");
assert.deepEqual(first.data.map(r=>r.id),[101,102,103]);
const other = await request("/notification_deliveries?select=id&order=id.asc",{user:"B"});
expectOk(other,"B own notification history");
assert.deepEqual(other.data.map(r=>r.id),[201]);

const endpoint="/rain_notification_feedback?on_conflict=notification_id";
const item = (notification_id,actual_weather,owner_id=users.A) =>
  ({notification_id,owner_id,actual_weather});
const put = (user,body) => request(endpoint,{
  user,method:"POST",body,prefer:"resolution=merge-duplicates,return=representation",
});
const initial = await put("A",item(101,"RAINED"));
expectOk(initial,"create own weather answer");
assert.equal(initial.data[0].actual_weather,"RAINED");
const loaded = await request("/rain_notification_feedback?select=notification_id,actual_weather&order=notification_id.asc",{user:"A"});
expectOk(loaded,"read own answer through HTTP");
assert.deepEqual(loaded.data,[{notification_id:101,actual_weather:"RAINED"}]);

const edited = await put("A",item(101,"DID_NOT_RAIN"));
expectOk(edited,"change own answer");
assert.equal(edited.data[0].actual_weather,"DID_NOT_RAIN");
const refreshed = await request("/rain_notification_feedback?notification_id=eq.101&select=actual_weather",{user:"A"});
expectOk(refreshed,"reload edited answer");
assert.equal(refreshed.data[0].actual_weather,"DID_NOT_RAIN");

expectDenied(await put("B",item(101,"STOPPED",users.B)),"B cannot edit A delivered notification");
expectDenied(await put("A",item(201,"STOPPED")),"A cannot answer B delivery");
expectDenied(await put("A",item(103,"RAINED")),"cannot answer unsupported event");
expectDenied(await put("A",item(102,"DID_NOT_RAIN")),"ending-event outcome mismatch");
expectDenied(await put(undefined,item(101,"RAINED")),"anonymous cannot save");

const hidden = await request("/rain_notification_feedback?select=notification_id",{user:"B"});
expectOk(hidden,"B feedback select");
assert.deepEqual(hidden.data,[]);
const anon = await request("/rain_notification_feedback?select=notification_id");
expectDenied(anon,"unauthenticated feedback select");

console.log("PASS: isolated PostgREST HTTP create / read / upsert / reload + RLS / event policy");
