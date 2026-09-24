export interface JmaEarlyForecastTargetTime {
  basetime: string;
  validtime: string;
  member: string;
  elements: string[];
}

export const JMA_RASRF_TARGET_TIMES_URL =
  "https://www.jma.go.jp/bosai/jmatile/data/rasrf/targetTimes.json";

export async function fetchEarlyForecastTargetTimes(
  fetcher: typeof fetch = fetch,
): Promise<JmaEarlyForecastTargetTime[]> {
  const response = await fetcher(JMA_RASRF_TARGET_TIMES_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`JMA rasrf target times request failed: ${response.status}`);
  }

  const value: unknown = await response.json();
  if (!Array.isArray(value)) throw new Error("Invalid JMA rasrf target times payload.");

  return value
    .filter(isRainForecastTarget)
    .sort((a, b) => a.validtime.localeCompare(b.validtime));
}

function isRainForecastTarget(value: unknown): value is JmaEarlyForecastTargetTime {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.basetime === "string" &&
    typeof v.validtime === "string" &&
    typeof v.member === "string" &&
    Array.isArray(v.elements) &&
    v.elements.includes("rasrf") &&
    v.validtime > v.basetime
  );
}
