export interface JmaTargetTime {
  basetime: string;
  validtime: string;
  elements: string[];
}

export const JMA_NOWC_TARGET_TIMES_URL =
  "https://www.jma.go.jp/bosai/jmatile/data/nowc/targetTimes_N2.json";

export async function fetchForecastTargetTimes(
  fetcher: typeof fetch = fetch,
): Promise<JmaTargetTime[]> {
  const response = await fetcher(JMA_NOWC_TARGET_TIMES_URL, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`JMA target times request failed: ${response.status}`);
  }

  const value: unknown = await response.json();
  if (!Array.isArray(value)) throw new Error("Invalid JMA target times payload.");

  return value.filter(isRainTargetTime).sort((a, b) => a.validtime.localeCompare(b.validtime));
}

function isRainTargetTime(value: unknown): value is JmaTargetTime {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.basetime === "string" &&
    typeof v.validtime === "string" &&
    Array.isArray(v.elements) &&
    v.elements.includes("hrpns")
  );
}
