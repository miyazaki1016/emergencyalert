// LIVE JAPAN regional presentation arbitration. Pure function: no live-data assumptions.
export type LayerKind = "hazard" | "weather" | "season" | "sky";
export type MapSignal = {
  id: string; region: string; kind: LayerKind; label: string; icon: string;
  lat: number; lon: number; active: boolean; demo: boolean;
};
export type DisplayResult = { visible: MapSignal[]; suppressed: MapSignal[] };
const priority: Record<LayerKind, number> = { hazard: 4, weather: 3, season: 2, sky: 1 };
export function resolveRegionalSignals(signals: MapSignal[], isNight: (lat: number, lon: number) => boolean): DisplayResult {
  const active = signals.filter(s => s.active);
  const byRegion = new Map<string, MapSignal[]>();
  for (const signal of active) byRegion.set(signal.region, [...(byRegion.get(signal.region) ?? []), signal]);
  const visible: MapSignal[] = [], suppressed: MapSignal[] = [];
  for (const regionSignals of byRegion.values()) {
    const candidates = regionSignals.filter(s => s.kind !== "sky" || isNight(s.lat, s.lon));
    const top = Math.max(0, ...candidates.map(s => priority[s.kind]));
    for (const signal of regionSignals) {
      (candidates.includes(signal) && priority[signal.kind] === top ? visible : suppressed).push(signal);
    }
  }
  return { visible, suppressed };
}
// Fictional test cases only. Never render as real weather or disaster reports.
export const regionalDemoSignals: MapSignal[] = [
  { id:"hokkaido-snow", region:"hokkaido", kind:"weather", label:"北海道：雪（デモ）", icon:"❄️", lat:43.06, lon:141.35, active:true, demo:true },
  { id:"hokkaido-sky", region:"hokkaido", kind:"sky", label:"北海道：星空（デモ）", icon:"✨", lat:43.06, lon:141.35, active:true, demo:true },
  { id:"tokyo-rain", region:"tokyo", kind:"weather", label:"東京：雨（デモ）", icon:"☔", lat:35.68, lon:139.76, active:true, demo:true },
  { id:"tokyo-sakura", region:"tokyo", kind:"season", label:"東京：桜（デモ）", icon:"🌸", lat:35.68, lon:139.76, active:true, demo:true },
  { id:"osaka-foliage", region:"osaka", kind:"season", label:"大阪：紅葉（デモ）", icon:"🍁", lat:34.69, lon:135.5, active:true, demo:true },
  { id:"okinawa-hazard", region:"okinawa", kind:"hazard", label:"沖縄：警報（デモ）", icon:"🚨", lat:26.21, lon:127.68, active:true, demo:true },
  { id:"okinawa-rain", region:"okinawa", kind:"weather", label:"沖縄：雨（デモ）", icon:"☔", lat:26.21, lon:127.68, active:true, demo:true },
];
