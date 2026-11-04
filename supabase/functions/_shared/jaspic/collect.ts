import { fields, generateMail, type Kind, type MailContext, type RecordData } from "./mail.ts";

export type Province = "hiroshima" | "shiga";
export type Item = { kind: Kind; data: RecordData; context: MailContext };
const base = (p: Province) => `https://map.police.${p}.dsvc.jp`;
export const endpoints = {
  hiroshima: ["/data/geo/cities_master.json", "/data/json/police.json", "/data/map/suspicious_person3.json", "/data/map/criminals.json"],
  shiga: ["/data/geo/cities.json", "/data/map/suspicious_person_full.json"],
};
export async function readJson(url: string, request: typeof fetch = fetch): Promise<unknown> {
  const response = await request(url, { signal: AbortSignal.timeout(20_000), redirect: "error", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
  // Bound memory even when Content-Length is missing or dishonest.
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Missing source body");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.length;
      if (size > 12_000_000) throw new Error("Source too large");
      chunks.push(part.value);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, ""));
}
function rows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value) || !value.length || value.some(v => !v || typeof v !== "object" || Array.isArray(v))) throw new Error("Incomplete source collection");
  return value;
}
function text(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") throw new Error("Invalid lookup value");
  return String(value);
}
function records(kind: Kind, value: unknown): RecordData[] {
  const seen = new Set<string>();
  return rows(value).map(row => {
    const data: RecordData = {};
    for (const key of fields[kind]) {
      if (!Object.hasOwn(row, key) || (row[key] !== null && typeof row[key] !== "string" && typeof row[key] !== "number")) throw new Error("Source schema changed");
      data[key] = row[key] === null ? null : String(row[key]);
    }
    if (!data.id || seen.has(data.id)) throw new Error("Missing or duplicate source ID");
    seen.add(data.id); return data;
  });
}
export async function collect(province: Province, request: typeof fetch = fetch): Promise<Item[]> {
  const values = await Promise.all(endpoints[province].map(path => readJson(base(province) + path + "?" + Date.now(), request)));
  const items: Item[] = [];
  if (province === "hiroshima") {
    const cities = rows(values[0]); const stations = rows(values[1]);
    for (const [kind, value] of [["hiroshima-person", values[2]], ["hiroshima-crime", values[3]]] as const) {
      for (const data of records(kind, value)) {
        const city = cities.find(c => text(c.city_code) === data.city_code);
        const station = stations.find(s => text(s.station_id) === data.police_station);
        if (!city || !station) throw new Error("Missing source lookup");
        items.push({ kind, data, context: { cityName: text(city.city_name), stationName: text(station.station_name) } });
      }
    }
  } else {
    const geo = values[0] as { features?: unknown };
    const cities = rows(geo?.features);
    for (const data of records("shiga-person", values[1])) {
      const city = cities.find(c => text((c.properties as Record<string, unknown>)?.city_code) === data.city_code);
      if (!city) throw new Error("Missing source lookup");
      items.push({ kind: "shiga-person", data, context: { cityName: text((city.properties as Record<string, unknown>).full_name), stationName: "" } });
    }
  }
  // Validate every body before a caller can commit a partial baseline.
  for (const item of items) generateMail(item.kind, item.data, null, item.context);
  return items;
}
