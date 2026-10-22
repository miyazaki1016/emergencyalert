/**
 * Observation time belongs to the moment the person checked the weather,
 * NOT the time feedback was saved nor the time a forecast was issued.
 */
export type ObservationChoice = "now" | "earlier" | "unknown";
export type ObservedTimeSource = "AT_RESPONSE" | "RECALLED" | "UNKNOWN";
export type WeatherObservation = {observed_at:string|null;observed_time_source:ObservedTimeSource};

export function localDateTimeInputToIso(value:string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  // Reject nonexistent/normalized local clock input (e.g. 25:99).
  const local = [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),
    String(date.getDate()).padStart(2,"0")].join("-")+
    "T"+String(date.getHours()).padStart(2,"0")+":"+
    String(date.getMinutes()).padStart(2,"0");
  return local === value ? date.toISOString() : null;
}

export function buildWeatherObservation(
  choice:ObservationChoice,
  earlierLocal:string,
  now:Date,
): WeatherObservation {
  if (!Number.isFinite(now.getTime())) throw new Error("invalid_current_time");
  if (choice === "unknown") return {observed_at:null,observed_time_source:"UNKNOWN"};
  if (choice === "now") return {observed_at:now.toISOString(),observed_time_source:"AT_RESPONSE"};
  const iso = localDateTimeInputToIso(earlierLocal);
  if (!iso) throw new Error("invalid_observed_time");
  const observed = Date.parse(iso);
  if (observed > now.getTime()+5*60_000) throw new Error("future_observation");
  if (observed < now.getTime()-30*86400_000) throw new Error("too_old_observation");
  return {observed_at:iso,observed_time_source:"RECALLED"};
}

/**
 * Legacy answers remain UNKNOWN time; do not invent observation times from
 * feedback.updated_at or notification.delivered_at.
 */
export function observedTimeLabel(source:ObservedTimeSource|null|undefined, observedAt:string|null):string {
  if (!observedAt || !source || source === "UNKNOWN") return "確認時刻は未登録";
  const timestamp=Date.parse(observedAt);
  if (!Number.isFinite(timestamp)) return "確認時刻は未登録";
  const formatted=new Date(timestamp).toLocaleString("ja-JP",{
    timeZone:"Asia/Tokyo",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"});
  return source === "RECALLED" ? "思い出して入力："+formatted : "回答時に確認："+formatted;
}

/** Existing answers keep their observation metadata until the person explicitly changes it. */
export function resolveFeedbackObservation(
  chosen: ObservationChoice | undefined,
  prior: WeatherObservation | undefined,
  earlierLocal: string | undefined,
  now: Date,
): WeatherObservation {
  // Editing only the answer must not overwrite a historical eyewitness time.
  if (chosen === undefined) return prior ?? {observed_at:null,observed_time_source:"UNKNOWN"};
  // When "earlier" was selected for an already-recorded observation, the
  // datetime-local control displays the old value until the user changes it.
  const effectiveLocal = chosen === "earlier"
    ? (earlierLocal ?? observationAsLocalInput(prior?.observed_at))
    : earlierLocal;
  return buildWeatherObservation(chosen, effectiveLocal ?? "", now);
}

/** Format an existing observation for a datetime-local field in the device timezone. */
export function observationAsLocalInput(observedAt: string | null | undefined): string {
  if (!observedAt) return "";
  const d = new Date(observedAt);
  if (!Number.isFinite(d.getTime())) return "";
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-") +
    "T" + String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0");
}

/** Observation coverage is a completeness measure, not a prediction score. */
export function summarizeObservationTimeCoverage(
  notificationIds: readonly number[],
  answers: Readonly<Record<number,string>>,
  times: Readonly<Record<number,WeatherObservation>>,
): {answered:number; withTime:number; withoutTime:number} {
  let answered=0,withTime=0;
  for (const id of notificationIds) {
    if (!answers[id]) continue;
    answered++;
    const observed=times[id];
    if(observed && observed.observed_time_source !== "UNKNOWN" &&
       observed.observed_at && Number.isFinite(Date.parse(observed.observed_at))) withTime++;
  }
  return {answered,withTime,withoutTime:answered-withTime};
}

/**
 * How far the user's eyewitness time is from Push delivery. This is NOT
 * a forecast lead time because old deliveries contain no forecast target time.
 */
export function observationVsDeliveryLabel(
  deliveredAt: string,
  observedAt: string | null | undefined,
): string | null {
  if (!observedAt) return null;
  const delivery = Date.parse(deliveredAt);
  const observed = Date.parse(observedAt);
  if (!Number.isFinite(delivery) || !Number.isFinite(observed)) return null;
  const roundedMinutes = Math.round((observed - delivery) / 60_000);
  if (roundedMinutes === 0) return "通知とほぼ同じ時刻に確認";
  const duration = Math.abs(roundedMinutes);
  const interval = duration < 60
    ? `${duration}分`
    : `${Math.floor(duration/60)}時間${duration%60 ? `${duration%60}分` : ""}`;
  return roundedMinutes > 0
    ? `通知から${interval}後に確認`
    : `通知より${interval}前に確認`;
}
