import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { collect, type Province } from "../../../../supabase/functions/_shared/jaspic/collect";
import { productionPlan } from "../../../../lib/jaspic/production-plan";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store, private" } });

/** Read-only production preflight. Never claim a delivery, mutate the DB, or send mail. */
export async function POST(request: Request) {
  const secret = process.env.JASPIC_DISPATCH_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || supplied.length !== secret.length ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(secret))) {
    return json({ error: "UNAUTHORIZED" }, 401);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json({ error: "NOT_CONFIGURED" }, 503);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const [legacyResult, unresolved, running] = await Promise.all([
      db.rpc("jaspic_legacy_hiroshima_person_ids"),
      db.from("jaspic_deliveries").select("status").in("status", ["PREPARED", "SENDING", "UNKNOWN", "FAILED"]).limit(1),
      db.from("jaspic_runs").select("id").eq("status", "RUNNING").limit(1),
    ]);
    if (legacyResult.error || !Array.isArray(legacyResult.data) ||
        legacyResult.data.some((x: unknown) => typeof x !== "string") ||
        unresolved.error || running.error) throw new Error("DATABASE_GUARD");
    const provinces: Province[] = ["hiroshima", "shiga"];
    const settled = await Promise.allSettled(provinces.map(async province => {
      const snapshot = await db.rpc("jaspic_snapshot", { p_province: province });
      if (snapshot.error) throw new Error("DATABASE_GUARD");
      const items = await collect(province);
      const plan = await productionPlan(province, snapshot.data, items,
        new Set<string>(province === "hiroshima" ? legacyResult.data : []));
      return { province, count: plan.candidates.length, quarantined: plan.quarantined.length,
        keys: plan.candidates.map(c => c.key),
        details: plan.candidates.map(c => {
          const item = items.find(i => `${i.kind}:${i.data.id}` === c.key);
          const previous = snapshot.data.records[c.key];
          return { key: c.key, classification: previous ? "UPDATED" : "NEW_ID",
            occurrenceDate: item?.data.occurrence_date_from ?? item?.data.occurrence_dt ?? null,
            publicationDate: null };
        }), expectedRevision: plan.expectedRevision };
    }));
    const results = settled.flatMap(r => r.status === "fulfilled" ? [r.value] : []);
    const provinceErrors = settled.flatMap((r, i) => r.status === "rejected" ? [{province: provinces[i], error: r.reason instanceof Error && /^[A-Z][A-Z0-9_]{0,79}$/.test(r.reason.message) ? r.reason.message : "PREVIEW_FAILED"}] : []);
    const total = results.reduce((sum, p) => sum + p.count, 0);
    const countsComplete = provinceErrors.length === 0;
    const blockers = [
      ...(!countsComplete ? ["PROVINCE_PREFLIGHT_FAILED"] : []),
      ...(unresolved.data.length ? ["UNRESOLVED_DELIVERY"] : []),
      ...(running.data.length ? ["RUN_LOCKED"] : []),
    ];
    const safe = blockers.length === 0;
    return json({ mode: "READ_ONLY", safeToSend: safe, total, batchLimit: 20, blockers, provinceErrors, countsComplete,
      unresolvedDeliveries: unresolved.data.length, runningRuns: running.data.length, provinces: results });
  } catch (error) {
    const code = error instanceof Error && /^[A-Z][A-Z0-9_]{0,79}$/.test(error.message)
      ? error.message : "PREVIEW_FAILED";
    return json({ mode: "READ_ONLY", safeToSend: false, error: code }, 503);
  }
}
