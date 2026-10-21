// @ts-ignore Deno Edge Functions require the explicit .ts extension; Next checks shared test imports without allowImportingTsExtensions.
import { assessEndingShadow, type EndingShadowFrame } from "./endingShadow.ts";

/** Pure shadow-only wording candidate. Never used to gate or send actual pushes.
 * A 5-10 minute lead is a research window, not an established accuracy threshold.
 */
export function assessEndingNoticeCandidate(input: {
  currentStatus: string | null | undefined;
  checkedAt: string | null | undefined;
  endingTime: string | null | undefined;
  forecast: EndingShadowFrame[];
}) {
  const ending = assessEndingShadow(input);
  const checkedMs = input.checkedAt ? Date.parse(input.checkedAt) : NaN;
  const targetMs = input.endingTime && /^\d{14}$/.test(input.endingTime)
    ? Date.parse(input.endingTime.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, "$1-$2-$3T$4:$5:$6Z"))
    : NaN;
  const leadMinutes = Number.isFinite(checkedMs) && Number.isFinite(targetMs)
    ? (targetMs - checkedMs) / 60_000 : null;
  if (ending.status === "NOT_CURRENTLY_RAINING") return { candidate: "NOT_RAINING_NOW", leadMinutes, ending };
  if (leadMinutes === null) return { candidate: "TIME_UNKNOWN", leadMinutes, ending };
  if (leadMinutes < 0) return { candidate: "ENDING_TIME_PASSED", leadMinutes, ending };
  if (leadMinutes > 10) return { candidate: "TOO_EARLY_FOR_5_TO_10_MINUTE_WINDOW", leadMinutes, ending };
  if (leadMinutes < 5) return { candidate: "LESS_THAN_5_MINUTES_AHEAD", leadMinutes, ending };
  const ten = ending.windows["10"].status;
  const fifteen = ending.windows["15"].status;
  if (ten === "RE_RAIN_FORECAST") return { candidate: "SHORT_LULL_FORECAST", leadMinutes, ending };
  if (ten !== "CLEAR_FORECAST") return { candidate: "INSUFFICIENT_FORECAST", leadMinutes, ending };
  if (fifteen === "RE_RAIN_FORECAST") return { candidate: "TEMPORARY_ENDING_FORECAST", leadMinutes, ending };
  if (fifteen === "CLEAR_FORECAST") return { candidate: "ENDING_FORECAST", leadMinutes, ending };
  return { candidate: "ENDING_WITH_LIMITED_HORIZON", leadMinutes, ending };
}
