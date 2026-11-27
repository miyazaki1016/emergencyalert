import "server-only";

import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { caseDetailsExpired, rainCaseSlug, type RainCase, type RainCaseVersion } from "../../../lib/weather/rain/nationalRainCaseDisplay";

const summaryFields = "slug,municipality_code,prefecture,municipality,first_base,first_valid_time,last_base,peak_tier,peak_valid_time,status,ended_at,permanent,details_expire_at,verification_summary";
const versionFields = "slug,base_time,detail_state,peak_tier,peak_valid_time,slots,verification";
const relatedFields = "slug,municipality,peak_tier,first_base";
type RelatedCase = Pick<RainCase, "slug" | "municipality" | "peak_tier" | "first_base">;

function caseDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Rain case storage is unavailable");
  return createClient(url, key, { auth: { persistSession: false } });
}

export const readRainCase = cache(async (slug: string): Promise<RainCase | null> => {
  if (!rainCaseSlug.test(slug)) return null;
  const { data, error } = await caseDatabase().from("national_rain_cases")
    .select(summaryFields).eq("slug", slug).abortSignal(AbortSignal.timeout(5000)).maybeSingle();
  if (error) throw new Error("Rain case summary is unavailable");
  return data as RainCase | null;
});

export async function loadRainCaseDetails(incident: RainCase, now: number) {
  const db = caseDatabase();
  const deadline = AbortSignal.timeout(8000);
  const relatedRequest = db.from("national_rain_cases")
    .select(relatedFields).eq("prefecture", incident.prefecture).eq("permanent", true)
    .neq("slug", incident.slug).order("first_base", { ascending: false }).order("slug")
    .limit(4).abortSignal(deadline);
  const expired = caseDetailsExpired(incident, now);

  async function readVersions() {
    const versions: RainCaseVersion[] = [];
    let after: string | undefined;
    const pageSize = 250;
    while (!expired) {
      let query = db.from("national_rain_case_versions").select(versionFields)
        .eq("slug", incident.slug).lte("base_time", incident.last_base)
        .order("base_time").limit(pageSize);
      if (after) query = query.gt("base_time", after);
      const { data, error } = await query.abortSignal(deadline);
      if (error) throw new Error("Rain case versions are unavailable");
      const page = (data ?? []) as RainCaseVersion[];
      versions.push(...page);
      if (page.length < pageSize) break;
      after = page.at(-1)?.base_time;
    }
    return versions;
  }

  const [versions, related] = await Promise.all([readVersions(), relatedRequest]);
  return { versions, related: (related.data ?? []) as RelatedCase[], expired };
}
