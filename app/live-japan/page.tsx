"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Scene = "past" | "now" | "ahead";
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
  const [scene, setScene] = useState<Scene>("now");
  const [selected, setSelected] = useState<(typeof sample)[number] | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    let disposed = false;
    (async () => {
      const L = await import("leaflet");
      if (disposed || !mapEl.current) return;
      const map = L.map(mapEl.current, { center: [37.3, 137.5], zoom: 5, minZoom: 4, maxZoom: 9, zoomControl: false, scrollWheelZoom: false });
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        className: "live-map-tiles",
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      sample.forEach((point) => {
        const icon = L.divIcon({
          className: "live-pin",
          html: '<span class="live-pulse live-' + point.kind + '"><span>' + point.icon + '</span></span>',
          iconSize: [48, 48], iconAnchor: [24, 24],
        });
        const marker = L.marker([point.lat, point.lon], { icon }).addTo(map);
        marker.on("click", () => setSelected(point));
        markersRef.current.push(marker);
      });
      setMapReady(true);
      setTimeout(() => { if (!disposed) map.invalidateSize(); }, 100);
    })();
    return () => { disposed = true; mapRef.current?.remove(); mapRef.current = null; markersRef.current = []; };
  }, []);

  return (
    <main className="live-root">
      <div className="live-ambient" aria-hidden="true" />
      <header className="live-header">
        <div><span className="live-eyebrow">AMAFURU EXPERIMENTAL EXPERIENCE</span><h1>LIVE <em>JAPAN</em><span className="live-dot">.</span></h1><p>暮らしを、少し先回りする。</p></div>
        <Link className="live-back" href="/">MY アメふる ↗</Link>
      </header>
      <section className="live-intro">
        <span className="live-badge">✦ コンセプト試作 / DEMO</span>
        <h2>日本の今と、<br /><strong>少し先の未来。</strong></h2>
        <p>いつもの景色に、変化の気配が灯る。<br />日本列島を眺めながら、気になる場所を見つけよう。</p>
      </section>
      <section className="live-stage" aria-label="日本列島のインタラクティブ地図">
        <div className="live-map" ref={mapEl} />
        <div className="live-stage-top"><span className="live-live-dot" /> JAPAN / EXPLORE <span className="live-stage-right">地図を動かして探索</span></div>
        {!mapReady && <div className="live-loading">日本列島を準備しています…</div>}
        <div className="live-demo-label">● 地図上の光は演出用サンプルです。実際の気象・災害情報ではありません。</div>
        {selected && <aside className="live-detail"><button onClick={() => setSelected(null)} aria-label="閉じる">×</button><span className="live-eyebrow">SAMPLE STORY</span><h3>{selected.icon} {selected.name}</h3><p>{selected.text}</p><small>このカードはデザイン確認用です。実データ接続後、出典・観測時刻・予報の区別を表示します。</small></aside>}
      </section>
      <section className="live-timeline" aria-label="時間を選択">
        <div className="live-timeline-heading"><span>TIME JOURNEY</span><span>過去 ─ いま ─ これから</span></div>
        <div className="live-time-options">{scenes.map(s => <button key={s.key} type="button" className={scene === s.key ? "active" : ""} onClick={() => setScene(s.key)}>{s.label}</button>)}</div>
        <p>{scenes.find(s => s.key === scene)?.caption} <span>・現在は画面演出のみ。時間別の実データは未接続です。</span></p>
      </section>
      <footer className="live-footer"><span>知りたい情報が、向こうからやってくる。</span><span>AMAFURU · LIVE JAPAN / PREVIEW 01</span></footer>
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
        .live-stage{max-width:1180px;margin:0 auto;position:relative;height:min(58vw,580px);min-height:390px;border:1px solid #3c7386;border-radius:24px;overflow:hidden;background:#102c40;box-shadow:0 22px 85px #0008, inset 0 0 60px #3eb7ff22}
        .live-map{height:100%;width:100%;background:#092235}
        .live-map-tiles{filter:grayscale(1) invert(1) hue-rotate(155deg) saturate(.85) brightness(.65) contrast(1.3)}
        .live-stage-top{position:absolute;z-index:500;top:22px;left:24px;right:24px;pointer-events:none;letter-spacing:.2em;font-size:10px;font-weight:800;color:#d1f9ff;text-shadow:0 2px 10px #000}
        .live-live-dot{display:inline-block;background:#69edc5;width:8px;height:8px;border-radius:50%;box-shadow:0 0 14px #69edc5;margin-right:8px}
        .live-stage-right{float:right;letter-spacing:.05em;font-weight:400}
        .live-demo-label{position:absolute;z-index:500;bottom:16px;left:18px;right:95px;pointer-events:none;background:#071a29dc;padding:10px 14px;border-radius:10px;color:#e0f2fa;font-size:11px;line-height:1.6}
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
        @media(max-width:650px){.live-header{padding:24px 18px}.live-intro{padding:0 20px}.live-stage{margin:0 10px;min-height:460px;border-radius:18px}.live-stage-right{display:none}.live-timeline{margin:14px 10px 0;padding:18px}.live-footer{padding:24px 20px;flex-direction:column}.live-demo-label{font-size:10px}.live-intro h2{font-size:36px}}
        @media(prefers-reduced-motion:reduce){.live-pulse{animation:none}}
      `}</style>
    </main>
  );
}
