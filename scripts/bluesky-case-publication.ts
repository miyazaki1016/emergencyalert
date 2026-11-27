import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { caseRadarFrames, type RainCase, type RainCaseVersion } from "../lib/weather/rain/nationalRainCaseDisplay";
import { caseStamp } from "../lib/weather/rain/nationalRainCases";
import { planTileForecastPublication } from "../lib/weather/rain/nationalForecastBlueskyTiles";
import type { ForecastTileVersion } from "../lib/weather/rain/nationalForecastTiles";
import type { NationalForecastSnapshot } from "../lib/weather/rain/nationalForecastSnapshot";
import { HOUR_MS, HOURLY_LIMIT, linkCasePostItems, planCasePosts, type CasePost, type PostItem, type PublicationCase } from "../lib/weather/rain/nationalBlueskyCasePosts";
import { buildCasePostVideo } from "../lib/weather/rain/nationalBlueskyCaseVideo";
import { openBlueskySender } from "../lib/weather/rain/nationalBlueskySender";

type Replay = { cycles: { at: string; rows: ForecastTileVersion[]; cases: PublicationCase[] }[] };
const fields = "slug,municipality_code,municipality,prefecture,status,first_base";

async function dryRun(path: string) {
  const { cycles } = JSON.parse(await readFile(path, "utf8")) as Replay;
  let previous: NationalForecastSnapshot | null = null;
  const pending = new Map<string, PostItem>();
  const posted = new Set<string>();
  const recent: number[] = [];
  for (const cycle of cycles) {
    const now = Date.parse(cycle.at);
    if (!Number.isFinite(now)) throw new Error("INVALID_REPLAY_TIME");
    const plan = planTileForecastPublication(cycle.rows, previous, now);
    if (plan) {
      for (const item of linkCasePostItems(plan.candidates, cycle.cases, now)) {
        if (!pending.has(item.item_key)) pending.set(item.item_key, item);
      }
      previous = plan.nextSnapshot;
    }
    const used = recent.filter(at => at > now - HOUR_MS).length;
    const posts = planCasePosts([...pending.values()], now, posted).slice(0, Math.max(0, HOURLY_LIMIT - used));
    for (const post of posts) {
      recent.push(now);
      for (const item of post.items) posted.add(item.item_key);
    }
    console.log(JSON.stringify({ at: cycle.at, accepted: Boolean(plan), candidates: plan?.candidates.length ?? 0,
      pending: [...pending.values()].filter(item => !posted.has(item.item_key)).length,
      posts: posts.map(post => ({ kind: post.kind, id: post.id, text: post.text, slugs: post.items.map(item => item.slug) })) }));
  }
}

async function live() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BLUESKY_IDENTIFIER, BLUESKY_APP_PASSWORD } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !BLUESKY_IDENTIFIER || !BLUESKY_APP_PASSWORD) {
    throw new Error("PUBLICATION_SECRETS_UNAVAILABLE");
  }
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const deadline = AbortSignal.timeout(100_000);
  const now = Date.now();
  const time = new Date(now).toISOString();
  const [previous, current] = await Promise.all([
    db.from("national_bluesky_case_cursor").select("base,snapshot").eq("id", true).abortSignal(deadline).maybeSingle(),
    db.from("national_rain_forecast_tile_versions").select("valid_time,base_time,extended,x,y,payload")
      .eq("extended", false).gt("valid_time", caseStamp(now)).lte("base_time", caseStamp(now))
      .order("valid_time").order("base_time").order("x").order("y").limit(1000).abortSignal(deadline),
  ]);
  if (previous.error || current.error || !current.data || current.data.length >= 1000) throw new Error("PUBLICATION_INPUT_UNAVAILABLE");
  const plan = planTileForecastPublication(current.data as ForecastTileVersion[], previous.data?.snapshot ?? null, now);
  if (plan) {
    let items: PostItem[] = [];
    if (plan.candidates.length) {
      const { data, error } = await db.from("national_rain_cases").select(fields).eq("status", "forecast")
        .in("municipality_code", plan.candidates.map(candidate => candidate.municipalityCode)).abortSignal(deadline);
      if (error) throw new Error("PUBLICATION_CASE_LOOKUP_FAILED");
      items = linkCasePostItems(plan.candidates, data as PublicationCase[], now);
    }
    const { error } = await db.rpc("stage_national_bluesky_cases", {
      p_expected: previous.data?.base ?? null, p_base: plan.nextSnapshot.basetime,
      p_snapshot: plan.nextSnapshot, p_items: items,
    }).abortSignal(deadline);
    if (error) throw new Error("PUBLICATION_STAGE_FAILED");
  }
  const [pending, retry] = await Promise.all([
    db.from("national_bluesky_case_items").select("payload").is("post_id", null).lte("due_at", time).gt("expires_at", time)
      .order("due_at").order("item_key").limit(1000).abortSignal(deadline),
    db.from("national_bluesky_case_posts").select("id,kind,text,items,expires_at")
      .in("status", ["sending", "retry"]).lte("claim_until", time).order("claim_until").limit(HOURLY_LIMIT).abortSignal(deadline),
  ]);
  if (pending.error || retry.error || !pending.data || pending.data.length >= 1000) throw new Error("PUBLICATION_OUTBOX_UNAVAILABLE");
  const planned = planCasePosts(pending.data.map(row => row.payload as PostItem), now);
  const queue = [...planned.filter(post => post.items[0].intensity === 80),
    ...(retry.data as CasePost[]), ...planned.filter(post => post.items[0].intensity !== 80)];
  if (!queue.length) return;
  const send = await openBlueskySender({ identifier: BLUESKY_IDENTIFIER, appPassword: BLUESKY_APP_PASSWORD, signal: deadline });
  for (const post of queue) {
    deadline.throwIfAborted();
    const { data: reservation, error } = await db.rpc("claim_national_bluesky_case", {
      p_id: post.id, p_kind: post.kind, p_text: post.text, p_items: post.items, p_expires: post.expires_at,
    }).abortSignal(deadline);
    if (error) throw new Error("PUBLICATION_CLAIM_FAILED");
    if (!reservation) continue;
    const { lease, micros } = reservation as { lease: string; micros: string };

    async function video() {
      const signal = AbortSignal.any([deadline, AbortSignal.timeout(14_000)]);
      const slug = post.items[0].slug;
      const { data: saved, error: storageError } = await db.from("national_rain_case_versions")
        .select("slots,base_time").eq("slug", slug).order("base_time", { ascending: false }).limit(1).abortSignal(signal).maybeSingle();
      if (storageError || !saved) throw new Error("PUBLICATION_VIDEO_INPUT_UNAVAILABLE");
      const incident = { municipality_code: slug.slice(0, 5), prefecture: post.items[0].prefecture,
        municipality: post.items[0].municipality } as RainCase;
      const frames = caseRadarFrames(incident, saved as RainCaseVersion, "detail", Date.now());
      const result = await buildCasePostVideo(frames, async url => {
        const response = await fetch(url, { signal, redirect: "error", cache: "no-store" });
        if (!response.ok) throw new Error("PUBLICATION_VIDEO_TILE_FAILED");
        return Buffer.from(await response.arrayBuffer());
      }, signal);
      return result.bytes;
    }

    let outcome: { status: string; uri?: string | null; sent_at?: string | null; video_status?: string; last_error?: string | null };
    try {
      const result = await send(post, micros, video);
      const retryDelivery = "retry" in result && result.retry;
      outcome = { status: result.uri ? "sent" : retryDelivery ? "retry" : "expired",
        uri: result.uri, sent_at: result.uri ? new Date().toISOString() : null,
        video_status: result.videoStatus, last_error: retryDelivery ? "UNCONFIRMED_BLUESKY_DELIVERY" : null };
    } catch {
      outcome = { status: "retry", last_error: "UNCONFIRMED_BLUESKY_DELIVERY" };
    }
    const saved = await db.from("national_bluesky_case_posts").update(outcome).eq("id", post.id)
      .eq("claim_until", lease).abortSignal(deadline);
    if (saved.error) throw new Error("PUBLICATION_OUTCOME_UNCONFIRMED");
    console.log(JSON.stringify({ event: "BLUESKY_CASE_PUBLICATION", id: post.id, status: outcome.status, video: outcome.video_status }));
  }
}

async function main() {
  const [mode, replay] = process.argv.slice(2);
  if (mode === "--dry-run" && replay) return dryRun(replay);
  if (mode === "--live" && process.env.BLUESKY_SEND_ENABLED === "true" && process.env.GITHUB_REF === "refs/heads/main") return live();
  console.log("Bluesky delivery is disabled. Use --dry-run <replay.json> to inspect a plan.");
}

main().catch(() => {
  console.error("BLUESKY_CASE_PUBLICATION_FAILED");
  process.exitCode = 1;
});
