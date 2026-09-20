import type { RainIntensityClass } from "../types";

export function classifyOfficialIntensity(
  mmPerHour: number,
): RainIntensityClass | null {
  if (!Number.isFinite(mmPerHour) || mmPerHour < 0) return null;
  if (mmPerHour < 1) return "LT_1";
  if (mmPerHour < 5) return "1_TO_5";
  if (mmPerHour < 10) return "5_TO_10";
  if (mmPerHour < 20) return "10_TO_20";
  if (mmPerHour < 30) return "20_TO_30";
  if (mmPerHour < 50) return "30_TO_50";
  if (mmPerHour < 80) return "50_TO_80";
  return "GTE_80";
}
