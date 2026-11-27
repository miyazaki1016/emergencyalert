import { createHash } from "node:crypto";
import { forecastTime, type NationalForecastSnapshot } from "./nationalForecastSnapshot";

export type ForecastPostCandidate = {
  key: string;
  text: string;
  municipalityCode: string;
  validTime: string;
  intensity: 30 | 50 | 80;
};
type ForecastArea = NationalForecastSnapshot["frames"][number]["municipalities"][number];

/** Shared validated snapshot is the only source; never fetch JMA separately. */
export function buildForecastPostCandidates(snapshot: NationalForecastSnapshot): ForecastPostCandidate[] {
  const strongest = new Map<string, { area: ForecastArea; validTime: string }>();
  for (const frame of snapshot.frames) for (const area of frame.municipalities) {
    const old = strongest.get(area.code);
    if (!old || area.minimumMmPerHour > old.area.minimumMmPerHour ||
      (area.minimumMmPerHour === old.area.minimumMmPerHour && forecastTime(frame.validTime) < forecastTime(old.validTime))) {
      strongest.set(area.code, { area, validTime: frame.validTime });
    }
  }
  return [...strongest.values()].sort((a, b) =>
    b.area.minimumMmPerHour - a.area.minimumMmPerHour ||
    forecastTime(a.validTime) - forecastTime(b.validTime) ||
    a.area.code.localeCompare(b.area.code)
  ).map(({ area, validTime }) => {
    const text = `【アメふる 全国大雨予報】\n${area.prefecture} ${area.municipality}\n${new Intl.DateTimeFormat("ja-JP", {timeZone:"Asia/Tokyo",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(forecastTime(validTime))}ごろ、1時間に${area.minimumMmPerHour}mm以上の雨の予報\n#大雨 #アメふる`;
    const key = createHash("sha256").update(JSON.stringify([snapshot.n03Version, area.code, validTime, area.minimumMmPerHour])).digest("hex");
    return { key, text, municipalityCode: area.code, validTime, intensity: area.minimumMmPerHour };
  });
}

/** Compare meaningful increases against a prior *valid* published snapshot. */
export function significantForecastChanges(current: NationalForecastSnapshot, previous: NationalForecastSnapshot | null): ForecastPostCandidate[] {
  const oldMax = new Map<string, number>();
  if (previous) for (const frame of previous.frames) for (const area of frame.municipalities)
    oldMax.set(area.code, Math.max(oldMax.get(area.code) ?? 0, area.minimumMmPerHour));
  return buildForecastPostCandidates(current).filter(row =>
    previous !== null && row.intensity > (oldMax.get(row.municipalityCode) ?? 0));
}

/** A dry-run decision only: callers must persist a successful publish atomically before any live delivery. */
export type ForecastPublishPlan = {
  candidates: ForecastPostCandidate[];
  nextSnapshot: NationalForecastSnapshot;
};

/** Never interpret a repeated or older baseline as a new forecast. */
export function planForecastPublication(
  current: NationalForecastSnapshot,
  previous: NationalForecastSnapshot | null,
): ForecastPublishPlan | null {
  if (previous && forecastTime(current.basetime) <= forecastTime(previous.basetime)) return null;
  return {
    candidates: significantForecastChanges(current, previous),
    nextSnapshot: current,
  };
}

/** Storage adapter contract. claim() must be atomic across all workers and processes. */
export interface ForecastPublicationStore {
  /** Returns false when this forecast has already been claimed or processed. */
  claim(basetime: string): Promise<boolean>;
  /** Persist the validated baseline before allowing a later run to compare against it. */
  getPrevious(): Promise<NationalForecastSnapshot | null>;
  /** Complete a claim after all publication candidates are durably handled. */
  complete(basetime: string, snapshot: NationalForecastSnapshot): Promise<void>;
  /** Release only an uncompleted claim; retry policy belongs to the durable adapter. */
  release(basetime: string): Promise<void>;
}

/**
 * Prepare a single baseline under an atomic storage claim. No network posting occurs here.
 * The caller must durably record individual delivery outcomes before calling complete().
 */
export async function prepareClaimedForecastPublication(
  current: NationalForecastSnapshot,
  store: ForecastPublicationStore,
): Promise<{ plan: ForecastPublishPlan; complete: () => Promise<void>; release: () => Promise<void> } | null> {
  if (!(await store.claim(current.basetime))) return null;
  try {
    const previous = await store.getPrevious();
    const plan = planForecastPublication(current, previous);
    if (!plan) {
      await store.release(current.basetime);
      return null;
    }
    return {
      plan,
      complete: () => store.complete(current.basetime, current),
      release: () => store.release(current.basetime),
    };
  } catch (error) {
    await store.release(current.basetime);
    throw error;
  }
}
