import { forecastRadarPlayback } from "./nationalForecastRadar";
import { forecastTime, type NationalForecastFrame, type RadarTile } from "./nationalForecastSnapshot";

export const rainCaseSlug = /^[0-9]{5}-[0-9]{8}-[0-9]{4}$/;
export type ActiveRainCaseSlugs = Readonly<Record<string, string | undefined>>;

export function rainCaseHref(slug: string | undefined, code: string) {
  return typeof slug === "string" && rainCaseSlug.test(slug) && slug.startsWith(`${code}-`) ? `/cases/${slug}` : undefined;
}

export type RainTier = 30 | 50 | 80;
export type CaseBand = "detail" | "extended";
type CaseState = "rain" | "below" | "unknown";

export type CaseSlot = {
  validTime: string;
  band: CaseBand;
  state: CaseState;
  tier: RainTier | null;
  basetime: string | null;
  radarTile?: RadarTile | null;
  tileCoverage?: NationalForecastFrame["tileCoverage"] | null;
};

type CaseVerification = {
  validTime: string;
  band: CaseBand;
  observedTier: RainTier | 0 | null;
  result: "match" | "different" | "unknown";
};

export type RainCaseVersion = {
  slug: string;
  base_time: string;
  detail_state: CaseState;
  peak_tier: RainTier | null;
  peak_valid_time: string | null;
  slots: CaseSlot[];
  verification: CaseVerification[] | null;
};

export type RainCase = {
  slug: string;
  municipality_code: string;
  prefecture: string;
  municipality: string;
  first_base: string;
  first_valid_time: string;
  last_base: string;
  peak_tier: RainTier;
  peak_valid_time: string;
  status: "forecast" | "ended" | "verified";
  ended_at: string | null;
  permanent: boolean;
  details_expire_at: string | null;
  verification_summary: { method: string; match: number; different: number; unknown: number } | null;
};

export function caseDetailsExpired(details: Pick<RainCase, "permanent" | "details_expire_at">, now = Date.now()) {
  return !details.permanent && details.details_expire_at !== null && forecastTime(details.details_expire_at) <= now;
}

export function caseLeadMinutes(incident: RainCase) {
  return Math.round((forecastTime(incident.peak_valid_time) - forecastTime(incident.first_base)) / 60_000);
}

const orderTime = (left: string, right: string) => forecastTime(left) - forecastTime(right);

export function presentCaseVersions(versions: RainCaseVersion[]) {
  const ordered = [...versions].sort((a, b) => orderTime(a.base_time, b.base_time));
  const times = new Map<string, CaseSlot>();
  const verification = new Map<number, CaseVerification>();
  const history = [];
  let previous: RainTier | null = null;
  let pin: RadarTile | undefined;
  for (const version of ordered) {
    for (const slot of version.slots) {
      times.set(`${slot.band}/${forecastTime(slot.validTime)}`, slot);
      if (slot.radarTile) pin = slot.radarTile;
    }
    for (const result of version.verification ?? []) verification.set(forecastTime(result.validTime), result);
    const change = version.detail_state === "unknown" ? "未取得を含む"
      : version.detail_state === "below" ? "詳細帯で30mm/h未満"
      : previous === null ? "初出"
      : version.peak_tier === null || version.peak_tier === previous ? "同じ強度"
      : version.peak_tier > previous ? "強まった" : "弱まった";
    history.push({ version, change });
    if (version.detail_state === "rain" && version.peak_tier !== null) previous = version.peak_tier;
  }
  return {
    history, pin,
    latest: ordered.at(-1),
    timeline: [...times.values()].sort((a, b) => orderTime(a.validTime, b.validTime)),
    verification: [...verification.values()].sort((a, b) => orderTime(a.validTime, b.validTime)),
  };
}

function radarStamp(value: string) {
  return new Date(forecastTime(value)).toISOString().slice(0, 19).replace(/[-:T]/g, "");
}

export function caseRadarFrames(incident: RainCase, version: RainCaseVersion, band: CaseBand, now = Date.now()) {
  const frames: NationalForecastFrame[] = version.slots
    .filter(slot => slot.band === band && forecastTime(slot.validTime) > now)
    .map(slot => ({
      validTime: radarStamp(slot.validTime),
      tileCoverage: slot.state !== "unknown" ? slot.tileCoverage ?? undefined : undefined,
      municipalities: slot.state === "rain" && slot.tier !== null ? [{
        code: incident.municipality_code,
        prefecture: incident.prefecture,
        municipality: incident.municipality,
        minimumMmPerHour: slot.tier,
        radarTile: slot.radarTile ?? undefined,
      }] : [],
    }));
  return forecastRadarPlayback(frames, incident.municipality_code, radarStamp(version.base_time), true);
}
