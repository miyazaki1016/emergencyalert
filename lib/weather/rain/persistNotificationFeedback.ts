import type { SupabaseClient } from "@supabase/supabase-js";

/** Save or revise one user weather observation for an already delivered push.
 * Server-side RLS remains the authorization boundary. Never accept a caller-supplied owner ID.
 */
export async function persistRainNotificationFeedback(
  supabase: Pick<SupabaseClient, "auth" | "from">,
  notificationId: number,
  actualWeather: string,
  now: () => string = () => new Date().toISOString(),
): Promise<void> {
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = data.session?.user.id;
  if (!userId) throw new Error("not signed in");
  if (!Number.isSafeInteger(notificationId) || notificationId < 1) throw new Error("invalid notification id");
  const { error } = await supabase.from("rain_notification_feedback").upsert({
    notification_id: notificationId,
    owner_id: userId,
    actual_weather: actualWeather,
    updated_at: now(),
  }, { onConflict: "notification_id" });
  if (error) throw error;
}
