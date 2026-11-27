import { createHash } from "node:crypto";
import { rainCaseSlug, type RainCase } from "./nationalRainCaseDisplay";
import { forecastTime } from "./nationalForecastSnapshot";
import type { ForecastPostCandidate } from "./nationalForecastBluesky";

export const HOUR_MS = 3_600_000;
export const HOURLY_LIMIT = 6;
export const PREFECTURE_GROUP_THRESHOLD = 3;
const COLLECTION = "app.bsky.feed.post";
const CASE_URL = "https://emergencyalert.news/cases/";
const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
const clock = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export type PublicationCase = Pick<RainCase, "slug" | "municipality_code" | "municipality" | "prefecture" | "status" | "first_base">;
export type PostItem = {
  item_key: string;
  slug: string;
  prefecture: string;
  municipality: string;
  intensity: 30 | 50 | 80;
  forecast_time: string;
  due_at: string;
  expires_at: string;
  source_text: string;
};
export type CasePost = {
  id: string;
  kind: "individual" | "prefecture" | "digest";
  items: PostItem[];
  text: string;
  expires_at: string;
};

export function linkCasePostItems(candidates: ForecastPostCandidate[], cases: PublicationCase[], now: number): PostItem[] {
  const byCode = new Map(cases.filter(c => c.status === "forecast" && rainCaseSlug.test(c.slug)
    && c.slug.startsWith(c.municipality_code + "-")).map(c => [c.municipality_code, c]));
  return candidates.flatMap(candidate => {
    const incident = byCode.get(candidate.municipalityCode);
    const predicted = forecastTime(candidate.validTime);
    if (!incident || predicted <= now || !(forecastTime(incident.first_base) <= predicted)) return [];
    const due = candidate.intensity === 30 ? (Math.floor(now / HOUR_MS) + 1) * HOUR_MS : now;
    const expiry = candidate.intensity === 30 ? due + HOUR_MS : predicted;
    return [{ item_key: `${incident.slug}:${candidate.intensity}`, slug: incident.slug, prefecture: incident.prefecture,
      municipality: incident.municipality, intensity: candidate.intensity, forecast_time: new Date(predicted).toISOString(),
      due_at: new Date(due).toISOString(), expires_at: new Date(expiry).toISOString(), source_text: candidate.text }];
  });
}

function fits(text: string) {
  return [...segmenter.segment(text)].length <= 300 && Buffer.byteLength(text) <= 3000;
}

function post(kind: CasePost["kind"], items: PostItem[], text: string): CasePost {
  const id = createHash("sha256").update(items.map(item => item.item_key).sort().join("\n")).digest("hex");
  return { kind, id, items, text, expires_at: items.map(item => item.expires_at).sort()[0] };
}

function timedLine(item: PostItem) {
  return `${item.municipality} ${clock.format(forecastTime(item.forecast_time))}ごろ\n${CASE_URL}${item.slug}`;
}

function groupPosts(kind: "prefecture" | "digest", title: string, items: PostItem[]) {
  const posts: CasePost[] = [];
  let batch: PostItem[] = [];
  const compose = (rows: PostItem[]) => [title, ...rows.map(timedLine)].join("\n");
  for (const item of items) {
    if (!fits(compose([item]))) throw new Error("Publication case link does not fit");
    if (batch.length && !fits(compose([...batch, item]))) {
      posts.push(post(kind, batch, compose(batch)));
      batch = [];
    }
    batch.push(item);
  }
  if (batch.length) posts.push(post(kind, batch, compose(batch)));
  return posts;
}

export function planCasePosts(items: PostItem[], now: number, recorded: ReadonlySet<string> = new Set()) {
  const eligible = items.filter(item => !recorded.has(item.item_key)
    && forecastTime(item.due_at) <= now && forecastTime(item.expires_at) > now)
    .sort((a, b) => b.intensity - a.intensity || a.forecast_time.localeCompare(b.forecast_time) || a.item_key.localeCompare(b.item_key));
  const individual = (item: PostItem) => {
    const suffix = "\n" + CASE_URL + item.slug;
    const source = [...segmenter.segment(item.source_text)].map(value => value.segment);
    while (!fits(source.join("") + suffix)) source.pop();
    return post("individual", [item], source.join("") + suffix);
  };
  const strongest = eligible.filter(item => item.intensity === 80).map(individual);
  const prefectures = new Map<string, PostItem[]>();
  const hours = new Map<string, PostItem[]>();
  for (const item of eligible) {
    const groups = item.intensity === 50 ? prefectures : item.intensity === 30 ? hours : undefined;
    if (!groups) continue;
    const key = item.intensity === 50 ? item.prefecture : item.due_at;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  const medium = [...prefectures].flatMap(([name, group]) => group.length < PREFECTURE_GROUP_THRESHOLD
    ? group.map(individual) : groupPosts("prefecture", `【アメふる 大雨予報】${name}・50 mm/h以上`, group));
  const digest = [...hours].flatMap(([due, group]) =>
    groupPosts("digest", `【アメふる 30 mm/h大雨予報】${clock.format(forecastTime(due))}締め・過去1時間に発表`, group));
  return [...strongest, ...medium, ...digest];
}

export function blueskyPostRecord(text: string, createdAt: string, video?: unknown) {
  const facets = [...text.matchAll(/https:\/\/emergencyalert\.news\/cases\/\d{5}-\d{8}-\d{4}/g)].map(match => ({
    index: { byteStart: Buffer.byteLength(text.slice(0, match.index)), byteEnd: Buffer.byteLength(text.slice(0, match.index + match[0].length)) },
    features: [{ $type: "app.bsky.richtext.facet#link", uri: match[0] }],
  }));
  return { $type: COLLECTION, text, createdAt, facets,
    ...(video ? { embed: { $type: "app.bsky.embed.video", video, alt: "対象自治体の詳細帯の雨雲予報" } } : {}) };
}
