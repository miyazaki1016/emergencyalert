import { NextRequest, NextResponse } from "next/server";
import { createNationalRainQueueClient } from "@/lib/weather/rain/nationalRainQueue";
import { resolveNationalRainMunicipalities } from "@/lib/weather/rain/nationalRainMunicipalityResolver";
import { createSupabaseN03AdministrativeAreaLoader } from "@/lib/weather/rain/n03PreparedStorageLoader";
import { N03_PREFECTURE_INDEX_2026 } from "@/lib/weather/rain/n03PrefectureIndex2026";
import { prefecturesForRainPolygons } from "@/lib/weather/rain/n03Prefectures";
import { createSupabaseN03PartitionStorage } from "@/lib/weather/rain/n03PartitionStorage";
import { createN03BoundedPartitionResolver } from "@/lib/weather/rain/n03BoundedPartitionResolver";
import { processNationalRainRefinementJobs } from "@/lib/weather/rain/nationalRainWorker";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest) {
  const secret = process.env.NATIONAL_RAIN_WORKER_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? "10");
  const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(rawLimit, 50)) : 10;

  try {
    const supabase = createNationalRainQueueClient();
    const partitionMode = process.env.NATIONAL_RAIN_N03_PARTITIONS_ENABLED === "true";
    let resolveMunicipalities: (footprint: Parameters<typeof resolveNationalRainMunicipalities>[0], signal?: AbortSignal) => Promise<Awaited<ReturnType<typeof resolveNationalRainMunicipalities>>>;
    if (partitionMode) {
      // Explicit opt-in only. Partition objects are a separate, versioned namespace;
      // missing/corrupt selected data must fail closed, never fall back to whole files.
      const partitionStorage = createSupabaseN03PartitionStorage(supabase);
      const manifestDigests = new Map<string, string>();
      const partitionResolver = createN03BoundedPartitionResolver({
        datasets: [],
        read: (code, file, signal) => {
          const digest = manifestDigests.get(code);
          if (!digest) throw new Error(`N03 partition manifest not registered: ${code}`);
          return partitionStorage.readChunk(code, digest, file, signal);
        },
      });
      resolveMunicipalities = async (footprint, signal) => {
        const prefectures = prefecturesForRainPolygons(footprint, N03_PREFECTURE_INDEX_2026);
        const datasets = await Promise.all(prefectures.map(({ code }) => partitionStorage.loadManifest(code, signal)));
        for (const dataset of datasets) {
          partitionResolver.registerDataset(dataset);
          manifestDigests.set(dataset.code, dataset.indexSha256);
        }
        return partitionResolver.resolve(footprint, signal);
      };
    } else {
      const loadAdministrativeAreas = createSupabaseN03AdministrativeAreaLoader(supabase);
      resolveMunicipalities = (footprint, signal) =>
        resolveNationalRainMunicipalities(footprint, loadAdministrativeAreas, undefined, signal);
    }
    const result = await processNationalRainRefinementJobs(supabase, {
      limit,
      resolveMunicipalities,
    });
    return NextResponse.json({
      mode: "NATIONAL_RAIN_REFINEMENT_WORKER_PROOF",
      checkedAt: new Date().toISOString(),
      ...result,
      note: partitionMode
        ? "Partition proof mode only. Requires pre-provisioned immutable partition objects; does not publish alerts or affect watch targets/push notifications."
        : "Proof worker only. It does not publish alerts or affect watch targets/push notifications.",
    });
  } catch (error) {
    console.error("[national-rain-worker]", error);
    return NextResponse.json({ error: "NATIONAL_RAIN_WORKER_FAILED" }, { status: 503 });
  }
}
