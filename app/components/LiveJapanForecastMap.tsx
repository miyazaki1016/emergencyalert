"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { NationalForecastFrame } from "../../lib/weather/rain/nationalForecastSnapshot";
import styles from "./live-japan-forecast-map.module.css";

const colors = { 30: "#FF9900", 50: "#FF2800", 80: "#B40068" };
const japan = [[24, 123], [46, 146]] as [[number, number], [number, number]];
type Area = NationalForecastFrame["municipalities"][number];

export default function LiveJapanForecastMap({ frame, onSelect }: {
  frame?: NationalForecastFrame;
  onSelect: (area: Area) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<LeafletMap>();
  useEffect(() => {
    let disposed = false;
    let instance: LeafletMap | undefined;
    void import("leaflet").then(L => {
      if (disposed || !element.current) return;
      instance = L.map(element.current, { minZoom: 4, maxZoom: 9, zoomControl: false, scrollWheelZoom: false });
      instance.fitBounds(japan);
      L.control.zoom({ position: "bottomright" }).addTo(instance);
      L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", {
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>',
      }).addTo(instance);
      setMap(instance);
    });
    return () => { disposed = true; instance?.remove(); };
  }, []);

  useEffect(() => {
    if (!map || !frame) return;
    let disposed = false;
    let removeLayer: (() => void) | undefined;
    void import("leaflet").then(L => {
      if (disposed) return;
      const layer = L.layerGroup().addTo(map);
      removeLayer = () => layer.remove();
      const zoom = 4;
      for (const tile of frame.tileCoverage ?? []) {
        if (tile.basetime) continue;
        const southwest = map.unproject([tile.x * 256, (tile.y + 1) * 256], zoom);
        const northeast = map.unproject([(tile.x + 1) * 256, tile.y * 256], zoom);
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><defs><pattern id="h" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V8" stroke="#475569" stroke-width="2"/></pattern></defs><rect width="100%" height="100%" fill="url(#h)"/></svg>';
        L.imageOverlay("data:image/svg+xml," + encodeURIComponent(svg), L.latLngBounds(southwest, northeast), { opacity: 0.65 }).addTo(layer);
      }
      const groups = new Map<string, Area[]>();
      for (const area of frame.municipalities) {
        if (!area.radarTile) continue;
        const key = `${area.radarTile.x}/${area.radarTile.y}`;
        const areas = groups.get(key) ?? [];
        areas.push(area);
        groups.set(key, areas);
      }
      for (const areas of groups.values()) {
        const { x, y } = areas[0].radarTile!;
        const tier = areas.reduce((largest, area) => area.minimumMmPerHour > largest ? area.minimumMmPerHour : largest, areas[0].minimumMmPerHour);
        const popup = document.createElement("div");
        for (const area of areas) {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = `${area.prefecture} ${area.municipality}・${area.minimumMmPerHour} mm/h以上`;
          button.onclick = () => onSelect(area);
          popup.append(button, document.createElement("br"));
        }
        const marker = document.createElement("span");
        marker.className = styles.areaMarker;
        marker.style.backgroundColor = colors[tier];
        marker.textContent = String(tier);
        const point = L.marker(map.unproject([(x + 0.5) * 256, (y + 0.5) * 256], 10), {
          icon: L.divIcon({ className: "", html: marker, iconSize: [32, 32] }),
          title: areas.map(area => area.municipality).join("、"),
        }).addTo(layer);
        if (areas.length === 1) {
          point.on("click", () => onSelect(areas[0]));
        } else {
          point.bindPopup(popup);
        }
      }
    });
    return () => { disposed = true; removeLayer?.(); };
  }, [map, frame, onSelect]);

  return <div ref={element} className={styles.map} role="region" aria-label="日本地図・全国の大雨予報" />;
}
