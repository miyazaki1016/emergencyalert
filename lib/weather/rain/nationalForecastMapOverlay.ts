import { japanLandPath } from "./japanLandPath";

const TILE_SIZE = 256;
export const FORECAST_COVERAGE_ZOOM = 4;
export const FORECAST_MARKER_SIZE = 32;

export function missingLandOverlay(x: number, y: number) {
  const left = x * TILE_SIZE;
  const top = y * TILE_SIZE;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_SIZE}" height="${TILE_SIZE}" viewBox="${left} ${top} ${TILE_SIZE} ${TILE_SIZE}">
    <defs><pattern id="missing" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <path d="M0 0V8" stroke="#475569" stroke-width="2"/>
    </pattern></defs>
    <path d="${japanLandPath}" fill="url(#missing)" fill-rule="evenodd"/>
  </svg>`;
  return {
    url: "data:image/svg+xml," + encodeURIComponent(svg),
    southwest: [left, top + TILE_SIZE] as [number, number],
    northeast: [left + TILE_SIZE, top] as [number, number],
  };
}

export function forecastMarkerZIndex(intensity: number) {
  return intensity * 10000;
}

export function forecastMarkersOverlap(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.abs(a.x - b.x) < FORECAST_MARKER_SIZE && Math.abs(a.y - b.y) < FORECAST_MARKER_SIZE;
}
