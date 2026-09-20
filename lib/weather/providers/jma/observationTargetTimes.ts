import type { JmaTargetTime } from "./targetTimes";

export const JMA_NOWC_OBSERVATION_TARGET_TIMES_URL =
  "https://www.jma.go.jp/bosai/jmatile/data/nowc/targetTimes_N1.json";

export async function fetchObservationTargetTimes(
  fetcher: typeof fetch = fetch,
): Promise<JmaTargetTime[]> {
  const response = await fetcher(JMA_NOWC_OBSERVATION_TARGET_TIMES_URL, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`JMA observation target times request failed: ${response.status}`);
  }
  const value: unknown = await response.json();
  if (!Array.isArray(value)) throw new Error("Invalid JMA observation target times payload.");

  return value.filter((item): item is JmaTargetTime => {
    if (!item || typeof item !== "object") return false;
    const v = item as Record<string, unknown>;
    return typeof v.basetime === "string" &&
      typeof v.validtime === "string" &&
      v.basetime === v.validtime &&
      Array.isArray(v.elements) &&
      v.elements.includes("hrpns");
  });
}
