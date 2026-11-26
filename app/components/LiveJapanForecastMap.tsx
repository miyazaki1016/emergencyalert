"use client";

import { useEffect, useRef, useState } from "react";
import type { LatLng, Map as LeafletMap } from "leaflet";
import { forecastTime, type NationalForecastFrame } from "../../lib/weather/rain/nationalForecastSnapshot";
import {
  FORECAST_COVERAGE_ZOOM, FORECAST_MARKER_SIZE, forecastMarkersOverlap, forecastMarkerZIndex, missingLandOverlay,
} from "../../lib/weather/rain/nationalForecastMapOverlay";
import municipalityPoints from "../../lib/weather/rain/nationalMapMunicipalityPoints.json";
import styles from "./live-japan-forecast-map.module.css";

const colors = { 30: "#FF9900", 50: "#FF2800", 80: "#B40068" };
const japan: [[number, number], [number, number]] = [[23.6, 122.4], [46.0, 154.3]];
const regionalZoom = 7;
const municipalZoom = 9;
const labelTime = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });
const representatives: Record<string, number[] | undefined> = municipalityPoints;
type Area = NationalForecastFrame["municipalities"][number];
type MarkerGroup = { location: LatLng; areas: Area[] };

function overview(map: LeafletMap) {
  map.fitBounds(japan, { padding: [18, 18], maxZoom: 5, animate: true });
}

function popupDetails(areas: Area[], peaks: ReadonlyMap<string, { time: string }>) {
  const content = document.createElement("div");
  content.className = styles.markerDetails;
  const showArea = (area: Area) => {
    const name = document.createElement("strong");
    name.textContent = `${area.prefecture} ${area.municipality}`;
    const detail = document.createElement("span");
    const time = peaks.get(area.code)?.time;
    const hours = time ? `${labelTime.format(forecastTime(time))}の予報・` : "";
    detail.textContent = `${hours}${area.minimumMmPerHour} mm/h以上`;
    content.replaceChildren(name, detail);
  };
  if (areas.length === 1) {
    showArea(areas[0]);
  } else {
    for (const area of areas) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${area.prefecture} ${area.municipality}・${area.minimumMmPerHour} mm/h以上`;
      button.onclick = () => {
        showArea(area);
        content.tabIndex = -1;
        content.focus();
      };
      content.append(button);
    }
  }
  return content;
}

export default function LiveJapanForecastMap({ frame, peaks }: {
  frame?: NationalForecastFrame;
  peaks: ReadonlyMap<string, { time: string }>;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<LeafletMap>();
  useEffect(() => {
    let disposed = false;
    let instance: LeafletMap | undefined;
    void import("leaflet").then(L => {
      if (disposed || !element.current) return;
      instance = L.map(element.current, {
        minZoom: 2, maxZoom: municipalZoom, zoomSnap: 0.25, zoomControl: false, scrollWheelZoom: false,
      });
      overview(instance);
      L.control.zoom({ position: "bottomright" }).addTo(instance);
      L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", {
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>',
      }).addTo(instance);
      instance.attributionControl.addAttribution('<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html">行政区域データ（加工）</a>');
      setMap(instance);
    });
    return () => { disposed = true; instance?.remove(); };
  }, []);

  useEffect(() => {
    if (!map || !frame) return;
    let disposed = false;
    let removeLayers: (() => void) | undefined;
    void import("leaflet").then(L => {
      if (disposed) return;
      const masks = L.layerGroup().addTo(map);
      const markers = L.layerGroup().addTo(map);
      for (const tile of frame.tileCoverage ?? []) {
        if (tile.basetime) continue;
        const { url, southwest, northeast } = missingLandOverlay(tile.x, tile.y);
        const bounds = L.latLngBounds(
          map.unproject(southwest, FORECAST_COVERAGE_ZOOM),
          map.unproject(northeast, FORECAST_COVERAGE_ZOOM),
        );
        L.imageOverlay(url, bounds, { opacity: 0.65, interactive: false }).addTo(masks);
      }

      function renderMarkers() {
        if (!map) return;
        markers.clearLayers();
        const zoom = map.getZoom();
        const groups = new Map<string, MarkerGroup>();
        for (const area of frame?.municipalities ?? []) {
          const representative = representatives[area.code];
          const tile = area.radarTile;
          const individual = representative && (zoom >= regionalZoom || !tile);
          if (!individual && !tile) continue;
          const key = individual ? area.code : `${tile!.x}/${tile!.y}`;
          const group = groups.get(key);
          if (group) group.areas.push(area);
          else {
            const location = individual ? L.latLng(representative[0], representative[1])
              : map.unproject([(tile!.x + 0.5) * 256, (tile!.y + 0.5) * 256], 10);
            groups.set(key, { location, areas: [area] });
          }
        }
        const points = [...groups.values()];
        for (const { areas, location } of points) {
          const tier = areas.reduce((largest, area) =>
            area.minimumMmPerHour > largest ? area.minimumMmPerHour : largest, areas[0].minimumMmPerHour);
          const marker = document.createElement("span");
          marker.className = styles.areaMarker;
          marker.dataset.tier = String(tier);
          marker.dataset.municipalities = String(areas.length);
          marker.style.backgroundColor = colors[tier];
          marker.textContent = String(tier);
          const title = areas.map(area => area.municipality).join("、");
          const point = L.marker(location, {
            icon: L.divIcon({ className: "", html: marker, iconSize: [FORECAST_MARKER_SIZE, FORECAST_MARKER_SIZE] }),
            title,
            zIndexOffset: forecastMarkerZIndex(tier),
          }).addTo(markers);
          point.getElement()?.setAttribute("aria-label", title);
          point.on("click", () => {
            if (zoom < municipalZoom) {
              map.closePopup();
              map.flyTo(location, zoom < regionalZoom ? regionalZoom : municipalZoom, { duration: 0.65 });
              return;
            }
            const origin = map.latLngToLayerPoint(location);
            const nearby = points.filter(candidate => forecastMarkersOverlap(origin, map.latLngToLayerPoint(candidate.location)))
              .flatMap(candidate => candidate.areas)
              .sort((a, b) => b.minimumMmPerHour - a.minimumMmPerHour);
            L.popup({ className: styles.markerPopup }).setLatLng(location)
              .setContent(popupDetails(nearby, peaks)).openOn(map);
          });
        }
      }

      renderMarkers();
      map.on("zoomend", renderMarkers);
      removeLayers = () => {
        map.off("zoomend", renderMarkers);
        map.closePopup();
        markers.remove();
        masks.remove();
      };
    });
    return () => { disposed = true; removeLayers?.(); };
  }, [map, frame, peaks]);

  return <div className={styles.mapShell}>
    <div ref={element} className={styles.map} role="region" aria-label="日本地図・全国の大雨予報" />
    <button type="button" className={styles.overview} disabled={!map} onClick={() => {
      if (!map) return;
      map.closePopup();
      overview(map);
    }}>全体表示</button>
  </div>;
}
