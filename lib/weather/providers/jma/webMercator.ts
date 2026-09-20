export interface TilePixel {
  zoom: number;
  tileX: number;
  tileY: number;
  pixelX: number;
  pixelY: number;
}

const TILE_SIZE = 256;
const MAX_LATITUDE = 85.05112878;

export function latLonToTilePixel(
  latitude: number,
  longitude: number,
  zoom = 10,
): TilePixel {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Latitude and longitude must be finite.");
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error("Latitude or longitude is outside its valid range.");
  }

  const lat = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, latitude));
  const n = 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;

  const x = ((longitude + 180) / 360) * n;
  const y =
    ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n;

  const tileX = Math.min(n - 1, Math.max(0, Math.floor(x)));
  const tileY = Math.min(n - 1, Math.max(0, Math.floor(y)));
  const pixelX = Math.min(255, Math.max(0, Math.floor((x - tileX) * TILE_SIZE)));
  const pixelY = Math.min(255, Math.max(0, Math.floor((y - tileY) * TILE_SIZE)));

  return { zoom, tileX, tileY, pixelX, pixelY };
}
