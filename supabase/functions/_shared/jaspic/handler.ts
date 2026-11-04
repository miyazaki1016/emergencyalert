import { collect, type Province, type Item } from "./collect.ts";
import { plan, type Snapshot } from "./state.ts";

export type Store = { load(province: Province): Promise<Snapshot>; commit(province: Province, result: Awaited<ReturnType<typeof plan>>): Promise<void>; legacyIds(province: Province): Promise<ReadonlySet<string>> };
export function createHandler(province: Province, options: {
  token: string; persistAllowed: boolean; store: Store;
  collect?: (province: Province) => Promise<Item[]>;
}) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return new Response(null, {status:405});
    if (!options.token) { console.warn("JASPIC_AUTH_REJECTED: token_secret_unavailable"); return new Response(null, {status:401}); }
    if (request.headers.get("x-jaspic-token") !== options.token) { console.warn("JASPIC_AUTH_REJECTED: token_mismatch_or_missing_header"); return new Response(null, {status:401}); }
    try {
      const body = await request.json();
      // Hard safety barrier: this implementation contains no SMTP, sender API or send mode.
      if (!body || body.mode !== "dry-run" || (body.persist !== undefined && typeof body.persist !== "boolean")) return new Response(null,{status:400});
      if (body.persist && !options.persistAllowed) return new Response(null,{status:403});
      const snapshot = await options.store.load(province);
      const items = await (options.collect ?? collect)(province);
      // A large drop may mean valid but incomplete JSON. Require investigation, never auto-rebaseline.
      for (const kind of new Set(items.map(i => i.kind))) {
        const oldCount = Object.keys(snapshot.records).filter(k => k.startsWith(kind + ":")).length;
        if (snapshot.baseline && items.filter(i => i.kind === kind).length < oldCount * 0.8) throw new Error("Source count dropped");
      }
      const result = await plan(province, snapshot, items, {legacyHiroshimaPersonIds: await options.store.legacyIds(province)});
      if (body.persist) await options.store.commit(province, result);
      return Response.json({ province, mode:"dry-run", persisted:!!body.persist,
        baseline:!snapshot.baseline, records:items.length, candidates:result.candidates.length, sent:0 });
    } catch {
      // Do not expose source text, tokens, HTTP authorization headers, addresses or stack traces.
      return Response.json({province,mode:"dry-run",sent:0,error:"JASPIC_RUN_FAILED"},{status:503});
    }
  };
}

export function restStore(url: string, key: string, request: typeof fetch = fetch): Store {
  async function rpc(name: string, args: unknown) {
    const r = await request(`${url}/rest/v1/rpc/${name}`,{method:"POST",redirect:"error",signal:AbortSignal.timeout(20_000),
      headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify(args)});
    if (!r.ok) throw new Error("JASPIC store request failed");
    return r.json();
  }
  return {
    async legacyIds(province) {
      if (province !== "hiroshima") return new Set<string>();
      const ids = await rpc("jaspic_legacy_hiroshima_person_ids", {});
      if (!Array.isArray(ids) || ids.some(id => typeof id !== "string")) throw new Error("Invalid legacy history");
      return new Set<string>(ids);
    },
    async load(province) {
      const s = await rpc("jaspic_snapshot",{p_province:province});
      if (!s || !Number.isSafeInteger(s.revision) || typeof s.baseline !== "boolean" || !s.records || typeof s.records !== "object" || Array.isArray(s.records)) throw new Error("Invalid persisted state");
      return s;
    },
    async commit(province,result) {
      await rpc("jaspic_commit_dry_run",{p_province:province,p_revision:result.expectedRevision,
        p_records:result.records,p_versions:result.candidates.map(c=>({key:c.key,version:c.version}))});
    },
  };
}
