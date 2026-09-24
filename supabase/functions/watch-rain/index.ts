import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { shouldNotifyForRain } from "./notificationDecision.ts";

type RainEvent = {
  schemaVersion: 1;
  eventType: string;
  urgency: "INFO" | "LIFESTYLE_ACTION";
  suggestedAction: string;
  startsAt: string | null;
  actionableAt: string | null;
  endingAt: string | null;
  source: string;
  checkedAt: string;
  sourceValidAt: string | null;
};

const VAPID_PUBLIC_KEY = "BBOurfjBkBMea0Hx90WiF83hmif8qv8LI1hFOx6AthWJQhkIWnhnUUZ0LYm7tyYg_3q1Aq3YP6mbJOtKjWA-Nec";

Deno.serve(async (req: Request) => {
  const expected = Deno.env.get("WATCH_CRON_TOKEN");
  if (!expected || req.headers.get("x-watch-token") !== expected) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!url || !serviceKey || !vapidPrivateKey) {
    return Response.json({ error: "server_config" }, { status: 500 });
  }

  webpush.setVapidDetails("mailto:emergencyalert@example.com", VAPID_PUBLIC_KEY, vapidPrivateKey);

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: targets, error } = await db
    .from("watch_targets")
    .select("id,owner_id,label,latitude,longitude,notifications_enabled")
    .eq("enabled", true)
    .limit(100);
  if (error) return Response.json({ error: "target_query_failed" }, { status: 500 });

  const results = [];
  for (const target of targets ?? []) {
    try {
      const rainUrl = new URL("https://emergencyalert-gilt.vercel.app/api/rain");
      rainUrl.searchParams.set("lat", String(target.latitude));
      rainUrl.searchParams.set("lon", String(target.longitude));
      const response = await fetch(rainUrl, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error("rain_unavailable");
      const rain = await response.json() as { checkedAt?: string; event?: RainEvent | null; interpretationEnabled?: boolean };

      if (!rain.interpretationEnabled || !rain.event) {
        await db.from("watch_states").upsert({
          target_id: target.id,
          last_checked_at: rain.checkedAt ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "target_id" });
        results.push({ id: target.id, status: "UNKNOWN" });
        continue;
      }

      const { data: previous } = await db
        .from("watch_states")
        .select("last_event,last_notified_at")
        .eq("target_id", target.id)
        .maybeSingle();

      const previousEvent = previous?.last_event as RainEvent | null | undefined;
      const actionable = rain.event.urgency === "LIFESTYLE_ACTION";
      const shouldNotify = shouldNotifyForRain({
        notificationsEnabled: Boolean(target.notifications_enabled),
        currentUrgency: rain.event.urgency,
        previousUrgency: previousEvent?.urgency,
        lastNotifiedAt: previous?.last_notified_at,
      });

      let delivered = 0;
      let failed = 0;
      if (shouldNotify) {
        const { data: subscriptions } = await db
          .from("push_subscriptions")
          .select("id,endpoint,p256dh,auth")
          .eq("owner_id", target.owner_id);

        const payload = JSON.stringify({
          title: "EmergencyAlert",
          body: target.label ? `${target.label}：${rain.event.suggestedAction}` : rain.event.suggestedAction,
          url: "/",
          data: { targetId: target.id, eventType: rain.event.eventType },
        });

        for (const sub of subscriptions ?? []) {
          try {
            await webpush.sendNotification({
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            }, payload);
            delivered += 1;
          } catch (err) {
            const statusCode = Number((err as { statusCode?: number })?.statusCode ?? 0);
            if (statusCode === 404 || statusCode === 410) {
              await db.from("push_subscriptions").delete().eq("id", sub.id);
            } else {
              failed += 1;
            }
          }
        }
      }

      const now = new Date().toISOString();
      const notifiedAt = delivered > 0 ? now : (actionable ? (previous?.last_notified_at ?? null) : null);
      await db.from("watch_states").upsert({
        target_id: target.id,
        last_event: rain.event,
        last_checked_at: rain.checkedAt ?? now,
        last_notified_at: notifiedAt,
        updated_at: now,
      }, { onConflict: "target_id" });

      results.push({ id: target.id, status: rain.event.eventType, shouldNotify, delivered, failed });
    } catch (err) {
      results.push({ id: target.id, status: "CHECK_FAILED", error: String((err as Error)?.message ?? err) });
    }
  }

  return Response.json({ ok: true, checked: results.length, results });
});