"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { regionalDemoSignals, resolveRegionalSignals } from "./priority";
import { runLifecycleScenario } from "./lifecycle-scenario";

type Scene = "past" | "now" | "ahead";
type SkyTime = "live" | "morning" | "noon" | "evening" | "night";
const skyChoices: { key: SkyTime; label: string; hour?: number }[] = [
  { key: "live", label: "● 現在" }, { key: "morning", label: "朝", hour: 6 },
  { key: "noon", label: "昼", hour: 12 }, { key: "evening", label: "夕", hour: 17 },
  { key: "night", label: "夜", hour: 23 },
];
// Astronomical day/night ambience only. No meteorological data is inferred.
// UTC Julian day -> solar declination and subsolar longitude (approximate).
function sunPosition(date: Date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const meanLong = (280.46 + 0.9856474 * n) * Math.PI / 180;
  const meanAnomaly = (357.528 + 0.9856003 * n) * Math.PI / 180;
  const ecliptic = meanLong + (1.915 * Math.sin(meanAnomaly) + 0.020 * Math.sin(2 * meanAnomaly)) * Math.PI / 180;
  const obliquity = (23.439 - 0.0000004 * n) * Math.PI / 180;
  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(ecliptic), Math.cos(ecliptic));
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(ecliptic));
  const gmst = (280.46061837 + 360.98564736629 * (jd - 2451545)) * Math.PI / 180;
  const longitude = Math.atan2(Math.sin(rightAscension - gmst), Math.cos(rightAscension - gmst));
  return { declination, longitude };
}
function solarAltitude(lat: number, lon: number, sun: ReturnType<typeof sunPosition>) {
  const r = Math.PI / 180;
  return Math.asin(Math.sin(lat * r) * Math.sin(sun.declination) + Math.cos(lat * r) * Math.cos(sun.declination) * Math.cos(lon * r - sun.longitude)) / r;
}
function skyDate(mode: SkyTime) {
  const now = new Date();
  const hour = skyChoices.find(c => c.key === mode)?.hour;
  if (hour === undefined) return now;
  // Preview at the chosen Japan local hour on today's Japan calendar date.
  const jst = new Date(now.getTime() + 9 * 3600000);
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate(), hour - 9));
}
const scenes: { key: Scene; label: string; caption: string }[] = [
  { key: "past", label: "これまで", caption: "過去の変化をたどる" },
  { key: "now", label: "いま", caption: "日本の今を見つめる" },
  { key: "ahead", label: "このあと", caption: "少し先の変化を想像する" },
];
const sample = [
  { name: "北海道", lat: 43.06, lon: 141.35, kind: "snow", icon: "❄", text: "雪の情報をここに表示" },
  { name: "東京", lat: 35.68, lon: 139.76, kind: "rain", icon: "☂", text: "雨の変化をここに表示" },
  { name: "大阪", lat: 34.69, lon: 135.5, kind: "heat", icon: "☀", text: "暑さの情報をここに表示" },
  { name: "沖縄", lat: 26.21, lon: 127.68, kind: "wind", icon: "◌", text: "台風の情報をここに表示" },
];

export default function LiveJapanPage() {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const skyLayerRef = useRef<any>(null);
  const priorityMarkersRef = useRef<any[]>([]);
  const [priorityDemo, setPriorityDemo] = useState(false);
  const [mapMenuOpen, setMapMenuOpen] = useState(false);
  const [lifecycleResults, setLifecycleResults] = useState<ReturnType<typeof runLifecycleScenario> | null>(null);
  const priorityDemoRef = useRef(false);
  const [showSamples, setShowSamples] = useState(false);
  const [theater, setTheater] = useState(false);
  const theaterRef = useRef<HTMLDivElement>(null);
  const sampleVisibilityRef = useRef(false);
  const skyModeRef = useRef<SkyTime>("live");
  const [skyMode, setSkyMode] = useState<SkyTime>("live");
  const [scene, setScene] = useState<Scene>("now");
  const [selected, setSelected] = useState<(typeof sample)[number] | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(5);
  const [focusName, setFocusName] = useState("日本全国");
  const goTo = (lat: number, lon: number, zoom: number, name: string) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([lat, lon], zoom, { duration: 1.2 });
    setFocusName(name);
  };
  const goNationwide = () => { setSelected(null); goTo(37.3, 137.5, 5, "日本全国"); };
  const changeSky = (mode: SkyTime) => { skyModeRef.current = mode; setSkyMode(mode); renderSky(); };
  const renderSky = () => {
    const map = mapRef.current;
    const L = (window as any).L;
    if (!map || !L || !skyLayerRef.current) return;
    skyLayerRef.current.clearLayers();
    const sun = sunPosition(skyDate(skyModeRef.current));
    // A smooth, geographically anchored solar shading raster. Canvas is only
    // an intermediate rendering surface; it is never weather information.
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pixels = ctx.createImageData(canvas.width, canvas.height);
    // Extend beyond Japan so the edge of the raster is outside the usual view.
    // Cover the full Web Mercator world so zooming and theater mode never expose rectangular overlay edges.
    const north = 85.05112878, south = -85.05112878, west = -180, east = 180;
    for (let y = 0; y < canvas.height; y++) {
      // ImageOverlay uses Web Mercator: sample latitude by inverse Mercator, not linear degrees.
      const mercatorY = Math.PI * (1 - 2 * (y + 0.5) / canvas.height);
      const lat = Math.atan(Math.sinh(mercatorY)) * 180 / Math.PI;
      for (let x = 0; x < canvas.width; x++) {
        const lon = west + (x + 0.5) / canvas.width * (east - west);
        const alt = solarAltitude(lat, lon, sun);
        // Four stages based on actual solar altitude: day -> warm sunset
        // -> cool afterglow -> navy night. No warm glow deep into nighttime.
        const smooth = (a: number, b: number, value: number) => {
          const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
          return t * t * (3 - 2 * t);
        };
        const night = 1 - smooth(-13, -5, alt);
        const dusk = smooth(-5, -1, alt) * (1 - smooth(2, 7, alt));
        const afterglow = smooth(-12, -6, alt) * (1 - smooth(-5, -1, alt));
        const hourAngle = Math.sin((lon * Math.PI / 180) - sun.longitude);
        const evening = smooth(-0.06, 0.10, hourAngle);
        const morning = 1 - evening;
        const i = (y * canvas.width + x) * 4;
        pixels.data[i] = Math.round(10 + dusk * (evening * 218 + morning * 115) + afterglow * 40);
        pixels.data[i + 1] = Math.round(27 + dusk * (evening * 98 + morning * 85) + afterglow * 24);
        pixels.data[i + 2] = Math.round(65 + dusk * (evening * 19 + morning * 80) + afterglow * 66);
        pixels.data[i + 3] = Math.round(Math.min(185, night * 176 + dusk * 105 + afterglow * 125));
      }
    }
    ctx.putImageData(pixels, 0, 0);
    L.imageOverlay(canvas.toDataURL("image/png"), [[south, west], [north, east]], {
      interactive: false, opacity: 1, className: "live-solar-overlay",
    }).addTo(skyLayerRef.current);
    // In addition to the geographic shadow, brighten the underlying daytime
    // cartography so day and night are visibly distinct on small phones.
    const japanAltitude = solarAltitude(36, 138, sun);
    const daylight = Math.max(0, Math.min(1, (japanAltitude + 7) / 20));
    map.getContainer().style.setProperty("--live-daylight", String(daylight));
    refreshPriorityMarkers(sun);
  };
  const refreshPriorityMarkers = (sun = sunPosition(skyDate(skyModeRef.current))) => {
    const map = mapRef.current;
    const L = (window as any).L;
    if (!map || !L) return;
    priorityMarkersRef.current.forEach(marker => map.removeLayer(marker));
    priorityMarkersRef.current = [];
    if (!priorityDemoRef.current) return;
    const result = resolveRegionalSignals(regionalDemoSignals, (lat, lon) => solarAltitude(lat, lon, sun) < -6);
    for (const signal of result.visible) {
      const icon = L.divIcon({
        className: "live-priority-pin",
        html: '<span class="live-priority-badge" title="架空のデモ">' + signal.icon + '</span>',
        iconSize: [38, 38], iconAnchor: [19, 19],
      });
      const marker = L.marker([signal.lat, signal.lon], { icon, title: signal.label + "（架空のデモ）" });
      marker.bindPopup("<strong>架空の表示テスト</strong><br>" + signal.label + "<br>実際の気象・災害情報ではありません。");
      marker.addTo(map);
      priorityMarkersRef.current.push(marker);
    }
  };
  const togglePriorityDemo = () => {
    priorityDemoRef.current = !priorityDemoRef.current;
    setPriorityDemo(priorityDemoRef.current);
    if (priorityDemoRef.current && sampleVisibilityRef.current) toggleSamples();
    refreshPriorityMarkers();
  };
  const toggleTheater = async () => {
    if (!theater) {
      const el = theaterRef.current;
      if (!el) return;
      try { if (el.requestFullscreen) { await el.requestFullscreen(); el.dataset.nativeFullscreen = "yes"; } } catch { /* iOS Safari may not support element fullscreen */ }
      setTheater(true);
      window.setTimeout(() => { const map = mapRef.current; if (map) { map.invalidateSize(); if (window.innerWidth < 760) map.setView([37.1, 137.2], 5, { animate: false }); else map.fitBounds([[24, 123], [46, 146]], { padding: [36, 36], animate: false }); } }, 180);
    } else {
      if (document.fullscreenElement) {
        try { await document.exitFullscreen(); } catch { /* continue to normal mode */ }
      }
      if (theaterRef.current) theaterRef.current.dataset.nativeFullscreen = "no";
      setTheater(false);
      window.setTimeout(() => mapRef.current?.invalidateSize(), 120);
    }
  };
  const toggleSamples = () => {
    const next = !sampleVisibilityRef.current;
    sampleVisibilityRef.current = next;
    setShowSamples(next);
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach(marker => {
      if (next && !map.hasLayer(marker)) marker.addTo(map);
      if (!next && map.hasLayer(marker)) map.removeLayer(marker);
    });
    if (!next) setSelected(null);
    if (next && priorityDemoRef.current) { priorityDemoRef.current = false; setPriorityDemo(false); refreshPriorityMarkers(); }
  };
  const detailLevel = zoomLevel <= 5 ? "全国の気配" : zoomLevel <= 7 ? "地方・都道府県の気配" : "市区町村周辺の気配";

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && theaterRef.current && !theaterRef.current.contains(document.activeElement)) {
        // Esc exits native fullscreen; keep app state in sync.
      }
      if (!document.fullscreenElement && theaterRef.current?.dataset.nativeFullscreen === "yes") {
        theaterRef.current.dataset.nativeFullscreen = "no";
        setTheater(false);
      }
      window.setTimeout(() => mapRef.current?.invalidateSize(), 120);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    let disposed = false;
    (async () => {
      const L = await import("leaflet");
      if (disposed || !mapEl.current) return;
      (window as any).L = L;
      const map = L.map(mapEl.current, { center: [37.3, 137.5], zoom: 5, minZoom: 4, maxZoom: 9, zoomControl: false, scrollWheelZoom: false });
      mapRef.current = map;
      map.on("zoomend", () => setZoomLevel(map.getZoom()));
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        className: "live-map-tiles",
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      skyLayerRef.current = L.layerGroup().addTo(map);
      renderSky();
      const skyTimer = window.setInterval(() => { if (skyModeRef.current === "live") renderSky(); }, 120000);
      map.on("unload", () => window.clearInterval(skyTimer));
      sample.forEach((point) => {
        const icon = L.divIcon({
          className: "live-pin",
          html: '<span class="live-pulse live-' + point.kind + '"><span>' + point.icon + '</span></span>',
          iconSize: [48, 48], iconAnchor: [24, 24],
        });
        const marker = L.marker([point.lat, point.lon], { icon });
        if (sampleVisibilityRef.current) marker.addTo(map);
        marker.on("click", () => { setSelected(point); goTo(point.lat, point.lon, 8, point.name); });
        markersRef.current.push(marker);
      });
      setMapReady(true);
      setTimeout(() => { if (!disposed) map.invalidateSize(); }, 100);
    })();
    return () => { disposed = true; mapRef.current?.remove(); mapRef.current = null; skyLayerRef.current = null; markersRef.current = []; };
  }, []);

  return (
    <main className="live-root">
      <div className="live-ambient" aria-hidden="true" />
      <header className="live-header">
        <div><span className="live-eyebrow">AMAFURU EXPERIMENTAL EXPERIENCE</span><h1>LIVE <em>JAPAN</em><span className="live-dot">.</span></h1><p>暮らしを、少し先回りする。</p></div>
        <Link className="live-back" href="/my">MY アメふる ↗</Link>
      </header>
      <section className="live-intro">
        <span className="live-badge">✦ コンセプト試作 / DEMO</span>
        <h2>日本の今と、<br /><strong>少し先の未来。</strong></h2>
        <p>いつもの景色に、変化の気配が灯る。<br />日本列島を眺めながら、気になる場所を見つけよう。</p>
      </section>
      <section className="live-sky-controls" aria-label="昼と夜の表示">
        <div><span>☀︎ SKY / DAY & NIGHT</span><p>太陽の位置から計算した、日本列島の昼と夜。</p></div>
        <div className="live-sky-buttons">{skyChoices.map(choice => <button key={choice.key} type="button" className={skyMode === choice.key ? "active" : ""} onClick={() => changeSky(choice.key)}>{choice.label}</button>)}</div>
        <small>{skyMode === "live" ? "現在の太陽位置（約2分ごとに更新）" : "今日の日本時間での時刻プレビュー（夕＝17時）"} · 天気情報ではありません</small>
      </section>
      <section ref={theaterRef} className={theater ? "live-stage live-theater" : "live-stage"} aria-label="日本列島のインタラクティブ地図">
        <div className="live-map" ref={mapEl} />
        <button type="button" className="live-theater-toggle" onClick={toggleTheater} aria-pressed={theater}>{theater ? "✕ 通常表示へ" : "⛶ シアターモード"}</button>
        {!theater && <div className="live-map-menu">
          <button type="button" className="live-map-menu-trigger" aria-expanded={mapMenuOpen} aria-controls="live-map-menu-panel" onClick={() => setMapMenuOpen(open => !open)}>☷ 表示設定 {priorityDemo || showSamples ? "●" : ""}</button>
          {mapMenuOpen && <div id="live-map-menu-panel" className="live-map-menu-panel">
            <strong>地図の表示</strong>
            <button type="button" onClick={togglePriorityDemo} aria-pressed={priorityDemo}>🧪 優先表示デモ {priorityDemo ? "ON" : "OFF"}</button>
            <button type="button" onClick={toggleSamples} aria-pressed={showSamples}>✦ 従来のサンプル {showSamples ? "ON" : "OFF"}</button>
            <button type="button" onClick={() => setLifecycleResults(runLifecycleScenario())}>🚨 警報の更新・取消テストを実行</button>
            {lifecycleResults && <div className="live-lifecycle-results" role="status"><strong>{lifecycleResults.every(x => x.passed) ? "✓ 全6ケース合格" : "⚠ 不一致あり"}</strong>{lifecycleResults.map((x,i) => <div key={i}>{x.passed ? "✓" : "✕"} {x.label}</div>)}<small>架空データの内部判定結果です。実際の警報は取得していません。</small></div>}
            <small>デモはすべて架空の情報です。実際の気象・災害情報は未接続。</small>
          </div>}
        </div>}
        <div className="live-stage-top"><span className="live-live-dot" /> JAPAN / EXPLORE <span className="live-stage-right">地図を動かして探索</span></div>
        <button type="button" className="live-reset" onClick={goNationwide} disabled={!mapReady}>🌏 全国へ戻る</button>
        <div className="live-scale" aria-live="polite">{focusName} · {detailLevel} <span>ZOOM {zoomLevel}</span></div>
        {!mapReady && <div className="live-loading">日本列島を準備しています…</div>}
        <div className="live-demo-label">{priorityDemo ? "🧪 架空の地域別優先表示テスト中。実際の警報・天気・季節情報ではありません。" : showSamples ? "● 地図上の光は演出用サンプルです。実際の気象・災害情報ではありません。" : "☀ 昼夜の陰影は太陽位置の計算による演出です。気象・災害情報は未表示です。"}</div>
        {selected && <aside className="live-detail"><button onClick={() => setSelected(null)} aria-label="閉じる">×</button><span className="live-eyebrow">SAMPLE STORY</span><h3>{selected.icon} {selected.name}</h3><p>{selected.text}</p><small>このカードはデザイン確認用です。実データ接続後、出典・観測時刻・予報の区別を表示します。</small></aside>}
      </section>
      <section className="live-journey" aria-label="日本を旅する">
        <div className="live-journey-head"><span>✦ EXPLORE JAPAN</span><strong>気になる場所へ、ひとっ飛び。</strong></div>
        <div className="live-destinations">{sample.map(point => <button key={point.name} type="button" onClick={() => { setSelected(point); goTo(point.lat, point.lon, 8, point.name); }}>{point.icon} {point.name} <span>↗</span></button>)}</div>
        <div className="live-feed-title">DISCOVER / 全国の出来事 <small>※ 架空の操作確認用サンプル</small></div>
        <div className="live-feed">{sample.map(point => <button type="button" key={point.name} onClick={() => { setSelected(point); goTo(point.lat, point.lon, 8, point.name); }}><span className="live-feed-icon">{point.icon}</span><span><strong>{point.name}</strong><small>{point.text}（デモ）</small></span><b>↗</b></button>)}</div>
        <p className="live-journey-note">登録地点や「全国で最も雨が強い場所」へのジャンプは実データ接続後に追加。拡大率はデータ精度を保証しません。</p>
      </section>
      <section className="live-timeline" aria-label="時間を選択">
        <div className="live-timeline-heading"><span>TIME JOURNEY</span><span>過去 ─ いま ─ これから</span></div>
        <div className="live-time-options">{scenes.map(s => <button key={s.key} type="button" className={scene === s.key ? "active" : ""} onClick={() => setScene(s.key)}>{s.label}</button>)}</div>
        <p>{scenes.find(s => s.key === scene)?.caption} <span>・現在は画面演出のみ。時間別の実データは未接続です。</span></p>
      </section>
      <footer className="live-footer"><span>知りたい情報が、向こうからやってくる。</span><span>AMAFURU · LIVE JAPAN / PREVIEW 14</span></footer>
      <style jsx global>{`
        .live-root{position:relative;isolation:isolate;min-height:100vh;color:#e9f5ff;background:#071423;font-family:ui-sans-serif,system-ui,-apple-system,"Hiragino Kaku Gothic ProN",sans-serif;overflow:hidden}
        .live-ambient{position:absolute;inset:0;z-index:-1;background:radial-gradient(ellipse 60% 32% at 80% 12%,#174d6955,transparent),radial-gradient(ellipse 55% 35% at 15% 55%,#123e5655,transparent)}
        .live-header{max-width:1180px;margin:auto;padding:30px 32px 18px;display:flex;align-items:center;justify-content:space-between;gap:20px}
        .live-eyebrow{font-size:10px;letter-spacing:.24em;color:#8abacb;font-weight:700}
        .live-header h1{font-size:clamp(25px,4vw,42px);font-weight:800;letter-spacing:.09em;margin:6px 0 0;line-height:1}
        .live-header em{font-style:normal;color:#8cdbec}.live-dot{color:#73dfb6}.live-header p{margin:10px 0 0;color:#8faebe;font-size:12px;letter-spacing:.14em}
        .live-back{color:#d5eff4;border:1px solid #ffffff3b;border-radius:30px;text-decoration:none;padding:11px 18px;font-size:12px;white-space:nowrap}
        .live-intro{max-width:1180px;margin:12px auto 24px;padding:0 32px}
        .live-badge{display:inline-block;padding:7px 12px;background:#16465b;color:#b1edeb;border:1px solid #397e89;border-radius:30px;font-size:11px;letter-spacing:.07em}
        .live-intro h2{font-size:clamp(32px,5vw,62px);line-height:1.25;font-weight:500;letter-spacing:.04em;margin:18px 0 10px}
        .live-intro h2 strong{font-weight:800;background:linear-gradient(90deg,#c2f8fa,#a5c9ff);color:transparent;background-clip:text}
        .live-intro p{color:#b4c8d4;font-size:13px;line-height:1.9}
        .live-sky-controls{max-width:1180px;margin:0 auto 14px;padding:17px 22px;border:1px solid #ffffff2b;border-radius:16px;background:#102b3b;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
        .live-sky-controls>div:first-child span{font-size:11px;font-weight:800;letter-spacing:.15em;color:#a2e8f3}.live-sky-controls p{font-size:12px;color:#bdd2de;margin:5px 0 0}
        .live-sky-buttons{display:flex;gap:5px;flex-wrap:wrap}.live-sky-buttons button{min-height:39px;padding:7px 13px;border-radius:20px;border:1px solid #557888;background:#0a2131;color:#d7eaf3;cursor:pointer;font-size:12px}
        .live-sky-buttons button.active{background:#3b8da5;border-color:#9be8f1;color:white}.live-sky-controls>small{width:100%;color:#9db7c5;font-size:10px}
        .live-stage{max-width:1180px;margin:0 auto;position:relative;height:min(58vw,580px);min-height:390px;border:1px solid #3c7386;border-radius:24px;overflow:hidden;background:#102c40;box-shadow:0 22px 85px #0008, inset 0 0 60px #3eb7ff22}
        .live-map{height:100%;width:100%;background:#092235}
        .live-map-tiles{filter:saturate(1.05) contrast(1.04);transition:filter 1.2s ease}
        .live-solar-overlay{pointer-events:none!important;image-rendering:auto}
.live-map-menu{position:absolute;z-index:570;right:14px;top:62px;display:flex;flex-direction:column;align-items:flex-end;gap:8px}
        .live-map-menu-trigger{border:1px solid #8fd0be;border-radius:22px;background:#092b3bea;color:#e8fff7;font-size:12px;padding:10px 15px;cursor:pointer}
        .live-map-menu-panel{display:flex;flex-direction:column;gap:9px;width:min(250px,calc(100vw - 65px));border:1px solid #6baab7;border-radius:17px;padding:13px;background:#092735f5;color:#e8fff7;box-shadow:0 12px 35px #001a2d99}
        .live-map-menu-panel strong{font-size:13px}
        .live-map-menu-panel button{border:1px solid #558896;border-radius:12px;background:#163d50;color:#e8fff7;text-align:left;padding:10px;font-size:12px}
        .live-map-menu-panel button[aria-pressed="true"]{border-color:#a0e3d0;background:#215f68}
        .live-map-menu-panel small{font-size:10px;line-height:1.5;color:#b5d3d9}
        .live-lifecycle-results{display:flex;flex-direction:column;gap:5px;max-height:185px;overflow-y:auto;border-top:1px solid #507887;padding-top:9px;font-size:11px}
        .live-priority-badge{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:#0a2837e8;border:2px solid #d7f5f0;box-shadow:0 0 15px #41b9e788;font-size:21px}
        .live-theater .live-map-menu{display:none}
        .live-theater-toggle{position:absolute;z-index:570;right:14px;top:14px;border:1px solid #91d7df;border-radius:24px;background:#092b3bea;color:#e1faff;font-size:12px;font-weight:700;padding:11px 15px;cursor:pointer}
        .live-theater{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;max-width:none!important;min-height:0!important;margin:0!important;border:0!important;border-radius:0!important;z-index:9999!important}
        .live-theater:fullscreen{position:relative!important;width:100%!important;height:100%!important}
        .live-theater .live-stage-top,.live-theater .live-reset,.live-theater .live-scale,.live-theater .live-demo-label,.live-theater .live-sample-toggle{display:none}
        .live-theater .live-theater-toggle{top:20px;right:20px;opacity:.78}
        .live-sample-toggle{position:absolute;z-index:560;right:14px;top:115px;border:1px solid #6d9cb0;border-radius:20px;background:#092334e8;color:#d9f2fb;font-size:11px;padding:9px 12px;cursor:pointer}
        .live-stage-top{position:absolute;z-index:500;top:22px;left:24px;right:24px;pointer-events:none;letter-spacing:.2em;font-size:10px;font-weight:800;color:#d1f9ff;text-shadow:0 2px 10px #000}
        .live-live-dot{display:inline-block;background:#69edc5;width:8px;height:8px;border-radius:50%;box-shadow:0 0 14px #69edc5;margin-right:8px}
        .live-stage-right{float:right;letter-spacing:.05em;font-weight:400}
        .live-demo-label{position:absolute;z-index:500;bottom:16px;left:18px;right:95px;pointer-events:none;background:#071a29dc;padding:10px 14px;border-radius:10px;color:#e0f2fa;font-size:11px;line-height:1.6}
        .live-reset{position:absolute;z-index:550;right:15px;top:58px;background:#0b2636e8;color:#d8f9ff;border:1px solid #77c8dc;border-radius:24px;padding:12px 16px;cursor:pointer;font-weight:700;font-size:12px}
        .live-reset:disabled{opacity:.5}.live-scale{position:absolute;z-index:500;top:110px;left:17px;padding:9px 12px;border-radius:9px;background:#071b2bdf;color:#d1eff7;font-size:11px;pointer-events:none}.live-scale span{opacity:.6;font-size:9px;margin-left:6px}
        .live-journey{max-width:1180px;box-sizing:border-box;margin:20px auto 0;padding:24px 28px;border:1px solid #ffffff24;border-radius:20px;background:#0c2335b8}
        .live-journey-head{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}.live-journey-head span,.live-feed-title{font-size:11px;letter-spacing:.14em;color:#95d9e6}.live-journey-head strong{font-size:16px}
        .live-destinations{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:20px 0 28px}
        .live-destinations button{min-height:56px;border:1px solid #4e8499;border-radius:12px;background:#18415a;color:#ecfaff;font-size:14px;cursor:pointer;text-align:left;padding:12px}.live-destinations button span{float:right;color:#9fe9f1}
        .live-feed-title{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.live-feed-title small{color:#c7d6dc;letter-spacing:0}
        .live-feed{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
        .live-feed button{display:flex;align-items:center;gap:13px;min-width:0;min-height:68px;text-align:left;background:#071a2b;border:1px solid #35596b;color:#e9f6fc;border-radius:12px;padding:12px;cursor:pointer}
        .live-feed-icon{font-size:25px}.live-feed button>span:nth-child(2){display:grid;gap:4px;min-width:0}.live-feed strong{font-size:13px}.live-feed small{font-size:11px;color:#aac4d1}.live-feed b{margin-left:auto;color:#9ed9e9}.live-journey-note{font-size:11px;color:#a9c1cf;line-height:1.8;margin:18px 0 0}
        .live-pin{background:transparent;border:0}
        .live-pulse{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#3abbe744;color:white;border:1px solid #a9eeffb3;box-shadow:0 0 0 9px #3abbe716,0 0 28px #39c7ffbb;animation:livebreathe 2.7s ease-in-out infinite;font-size:21px}
        .live-heat{background:#f6a34955;border-color:#ffdb9d;box-shadow:0 0 0 9px #ffac271c,0 0 28px #ffae51bb}
        .live-snow{background:#9de7ff66}.live-wind{background:#a99cf455;border-color:#ded0ff}
        @keyframes livebreathe{50%{transform:scale(1.15);filter:brightness(1.35)}}
        .live-detail{position:absolute;z-index:600;right:20px;top:65px;width:min(320px,calc(100% - 40px));box-sizing:border-box;padding:24px;background:#071a2df2;border:1px solid #77b7ca;border-radius:18px;box-shadow:0 15px 40px #0008}
        .live-detail button{position:absolute;right:12px;top:8px;background:none;border:0;color:white;font-size:25px;cursor:pointer}.live-detail h3{font-size:22px}.live-detail p{font-size:14px}.live-detail small{color:#a8c5d4;line-height:1.7}
        .live-loading{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;color:#fff}
        .live-timeline{max-width:1180px;margin:22px auto 0;padding:24px 30px 18px;box-sizing:border-box;border:1px solid #ffffff24;border-radius:20px;background:#ffffff08}
        .live-timeline-heading{display:flex;justify-content:space-between;color:#9dc4d3;font-size:11px;letter-spacing:.12em}
        .live-time-options{display:flex;gap:10px;margin-top:19px}.live-time-options button{flex:1;background:#ffffff0b;border:1px solid #ffffff2c;border-radius:12px;color:#bdd3df;padding:15px 5px;cursor:pointer;font-size:13px}
        .live-time-options button.active{background:linear-gradient(110deg,#277b92,#235f86);border-color:#79d6e8;color:white;box-shadow:0 0 20px #38a6cb33}
        .live-timeline p{font-size:12px;color:#d6e8ef}.live-timeline p span{color:#86a5b5}
        .live-footer{max-width:1180px;margin:auto;padding:30px 32px 45px;display:flex;justify-content:space-between;gap:15px;color:#8ca8b9;font-size:11px}
        .live-root .leaflet-control-attribution{background:#0c2332d9;color:#c8dbe3}.live-root .leaflet-control-attribution a{color:#a8e8fa}
        @media(max-width:650px){.live-header{padding:24px 18px}.live-intro{padding:0 20px}.live-stage{margin:0 10px;min-height:460px;border-radius:18px}.live-stage-right{display:none}.live-timeline{margin:14px 10px 0;padding:18px}.live-footer{padding:24px 20px;flex-direction:column}.live-demo-label{font-size:10px}.live-intro h2{font-size:36px}.live-sky-controls{margin:0 10px 12px;padding:14px}.live-sky-buttons{width:100%}.live-sky-buttons button{flex:1;padding:7px 5px}.live-journey{margin:14px 10px 0;padding:18px}.live-destinations{grid-template-columns:repeat(2,minmax(0,1fr))}.live-feed{grid-template-columns:1fr}.live-reset{right:12px;top:55px}.live-scale{top:112px}.live-sample-toggle{top:107px;right:12px;font-size:10px;padding:7px 9px}}
        @media(prefers-reduced-motion:reduce){.live-pulse{animation:none}}
      `}</style>
    </main>
  );
}
