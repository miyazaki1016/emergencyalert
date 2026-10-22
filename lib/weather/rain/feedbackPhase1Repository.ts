import type { WeatherObservation } from "./feedbackObservationTime";
import type { SupabaseClient } from "@supabase/supabase-js";

export type WeatherFeedbackAnswer =
  | "RAINED" | "DID_NOT_RAIN" | "ALREADY_RAINING"
  | "STOPPED" | "DID_NOT_STOP" | "ALREADY_DRY" | "UNKNOWN";

/** The database RLS is the final authorization gate. No caller-supplied owner ID. */
export async function savePhase1Feedback(
  client: Pick<SupabaseClient, "auth" | "from">,
  notificationId: number,
  answer: WeatherFeedbackAnswer,
  observation?: WeatherObservation,
): Promise<void> {
  if (!Number.isSafeInteger(notificationId) || notificationId <= 0) {
    throw new Error("invalid_notification_id");
  }
  const { data, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const ownerId = data.session?.user.id;
  if (!ownerId) throw new Error("session_required");
  const { error } = await client.from("rain_notification_feedback").upsert({
    notification_id: notificationId,
    owner_id: ownerId,
    actual_weather: answer,
    updated_at: new Date().toISOString(),
    ...(observation ? {observed_at:observation.observed_at,observed_time_source:observation.observed_time_source} : {}),
  }, { onConflict: "notification_id" });
  if (error) throw error;
}

/** Read only the delivered notification IDs visible to the signed-in owner. */
export async function loadPhase1Feedback(
  client: Pick<SupabaseClient, "from">,
  notificationIds: readonly number[],
): Promise<Record<number, WeatherFeedbackAnswer>> {
  if (notificationIds.length === 0) return {};
  if (notificationIds.some(id => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error("invalid_notification_id");
  }
  const { data, error } = await client.from("rain_notification_feedback")
    .select("notification_id,actual_weather")
    .in("notification_id", [...notificationIds]);
  if (error) throw error;
  const ids = new Set(notificationIds);
  const allowed = new Set<WeatherFeedbackAnswer>([
    "RAINED", "DID_NOT_RAIN", "ALREADY_RAINING",
    "STOPPED", "DID_NOT_STOP", "ALREADY_DRY", "UNKNOWN",
  ]);
  const answers: Record<number, WeatherFeedbackAnswer> = {};
  for (const row of data ?? []) {
    if (!ids.has(row.notification_id)) continue;
    const answer = row.actual_weather as WeatherFeedbackAnswer;
    if (allowed.has(answer)) answers[row.notification_id] = answer;
  }
  return answers;
}

/** Read source/time separately from the existing answer query for staged rollout. */
export async function loadPhase2ObservationTimes(
  client: Pick<SupabaseClient, "from">,
  notificationIds: readonly number[],
): Promise<Record<number, WeatherObservation>> {
  if (notificationIds.length === 0) return {};
  if (notificationIds.some(id=>!Number.isSafeInteger(id)||id<=0)) throw new Error("invalid_notification_id");
  const {data,error}=await client.from("rain_notification_feedback")
    .select("notification_id,observed_at,observed_time_source")
    .in("notification_id",[...notificationIds]);
  if(error) throw error;
  const allowed=new Set(["AT_RESPONSE","RECALLED","UNKNOWN"]);
  const ids=new Set(notificationIds);
  const times:Record<number,WeatherObservation>={};
  for(const row of data??[]){
    if(!ids.has(row.notification_id))continue;
    const source=String(row.observed_time_source??"UNKNOWN");
    if(!allowed.has(source))continue;
    times[row.notification_id]={
      observed_at:typeof row.observed_at==="string"?row.observed_at:null,
      observed_time_source:source as WeatherObservation["observed_time_source"],
    };
  }
  return times;
}
