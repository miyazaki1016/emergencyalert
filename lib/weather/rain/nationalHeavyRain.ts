import { PNG } from "pngjs";
import type { RainIntensityClass } from "../types";
import { classifyRainPixel } from "../providers/jma/classifyPixel";

export type HeavyRainLevel = "HEAVY" | "VERY_HEAVY" | "TORRENTIAL";

export interface HeavyRainCandidate {
  tileX: number;
  tileY: number;
  pixelX: number;
  pixelY: number;
  latitude: number;
  longitude: number;
  intensityClass: Extract<RainIntensityClass, "30_TO_50" | "50_TO_80" | "GTE_80">;
  level: HeavyRainLevel;
}

export function heavyRainLevel(intensityClass: RainIntensityClass | null): HeavyRainLevel | null {
  if (intensityClass === "30_TO_50") return "HEAVY";
  if (intensityClass === "50_TO_80") return "VERY_HEAVY";
  if (intensityClass === "GTE_80") return "TORRENTIAL";
  return null;
}

export function scanHeavyRainTile(buffer: Buffer, zoom: number, tileX: number, tileY: number, stride = 2): HeavyRainCandidate[] {
  const png = PNG.sync.read(buffer);
  const found: HeavyRainCandidate[] = [];
  for (let py = 0; py < png.height; py += stride) {
    for (let px = 0; px < png.width; px += stride) {
      const i = (py * png.width + px) * 4;
      const intensityClass = classifyRainPixel({ r: png.data[i], g: png.data[i + 1], b: png.data[i + 2], a: png.data[i + 3] }).intensityClass;
      const level = heavyRainLevel(intensityClass);
      if (!level || !intensityClass) continue;
      const point = worldPixelToLatLon(zoom, tileX * 256 + px, tileY * 256 + py);
      found.push({ tileX, tileY, pixelX: px, pixelY: py, latitude: point.lat, longitude: point.lon, intensityClass: intensityClass as HeavyRainCandidate["intensityClass"], level });
    }
  }
  return found;
}

function worldPixelToLatLon(zoom: number, worldX: number, worldY: number) {
  const size = 256 * 2 ** zoom;
  const lon = worldX / size * 360 - 180;
  const n = Math.PI - 2 * Math.PI * worldY / size;
  const lat = 180 / Math.PI * Math.atan(Math.sinh(n));
  return { lat, lon };
}


export type HeavyRainFootprint = {
  type: "MultiPoint";
  coordinates: [number, number][];
};

export function heavyRainFootprint(candidates: HeavyRainCandidate[]): HeavyRainFootprint {
  return {
    type: "MultiPoint",
    coordinates: candidates.map((candidate) => [candidate.longitude, candidate.latitude]),
  };
}


export type HeavyRainPolygon = {
  type: "Polygon";
  coordinates: [number, number][][];
};

export function heavyRainAreaPolygons(candidates: HeavyRainCandidate[]): HeavyRainPolygon[] {
  const byPixel = new Map(candidates.map((candidate) => [`${candidate.pixelX}:${candidate.pixelY}`, candidate]));
  const remaining = new Set(byPixel.keys());
  const polygons: HeavyRainPolygon[] = [];
  const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;

  while (remaining.size) {
    const seed = remaining.values().next().value as string;
    remaining.delete(seed);
    const queue = [seed];
    const members: HeavyRainCandidate[] = [];

    while (queue.length) {
      const key = queue.shift()!;
      const current = byPixel.get(key);
      if (!current) continue;
      members.push(current);
      for (const [dx, dy] of offsets) {
        const neighborKey = `${current.pixelX + dx}:${current.pixelY + dy}`;
        if (remaining.delete(neighborKey)) queue.push(neighborKey);
      }
    }

    const sample = members[0];
    const topLeft = worldPixelToLatLon(sample.tileX === sample.tileX ? 0 : 0, 0, 0);
    void topLeft;
    const zoom = inferZoomFromCandidateSpacing(members);
    const corners = members.flatMap((candidate) => pixelBounds(candidate, zoom));
    const west = Math.min(...corners.map((point) => point.lon));
    const east = Math.max(...corners.map((point) => point.lon));
    const south = Math.min(...corners.map((point) => point.lat));
    const north = Math.max(...corners.map((point) => point.lat));
    polygons.push({
      type: "Polygon",
      coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
    });
  }

  return polygons;
}

function inferZoomFromCandidateSpacing(_members: HeavyRainCandidate[]) {
  return 8;
}

function pixelBounds(candidate: HeavyRainCandidate, zoom: number) {
  const worldX = candidate.tileX * 256 + candidate.pixelX;
  const worldY = candidate.tileY * 256 + candidate.pixelY;
  return [
    worldPixelToLatLon(zoom, worldX, worldY),
    worldPixelToLatLon(zoom, worldX + 1, worldY + 1),
  ];
}

export function candidateKey(candidate: Pick<HeavyRainCandidate, "tileX" | "tileY" | "pixelX" | "pixelY">) {
  return `${candidate.tileX}:${candidate.tileY}:${candidate.pixelX}:${candidate.pixelY}`;
}

export interface HeavyRainCluster {
  candidates: HeavyRainCandidate[];
  latitude: number;
  longitude: number;
  level: HeavyRainLevel;
}

const LEVEL_RANK: Record<HeavyRainLevel, number> = { HEAVY: 1, VERY_HEAVY: 2, TORRENTIAL: 3 };

export function clusterHeavyRainCandidates(candidates: HeavyRainCandidate[], maxDistanceKm = 35): HeavyRainCluster[] {
  const remaining = new Set(candidates.map((_, index) => index));
  const clusters: HeavyRainCluster[] = [];
  while (remaining.size) {
    const seed = remaining.values().next().value as number;
    remaining.delete(seed);
    const members = [candidates[seed]];
    const queue = [seed];
    while (queue.length) {
      const current = candidates[queue.shift()!];
      for (const index of Array.from(remaining)) {
        if (distanceKm(current, candidates[index]) <= maxDistanceKm) {
          remaining.delete(index);
          queue.push(index);
          members.push(candidates[index]);
        }
      }
    }
    clusters.push({
      candidates: members,
      latitude: members.reduce((sum, c) => sum + c.latitude, 0) / members.length,
      longitude: members.reduce((sum, c) => sum + c.longitude, 0) / members.length,
      level: members.reduce((max, c) => LEVEL_RANK[c.level] > LEVEL_RANK[max] ? c.level : max, "HEAVY" as HeavyRainLevel),
    });
  }
  return clusters;
}

function distanceKm(a: Pick<HeavyRainCandidate, "latitude" | "longitude">, b: Pick<HeavyRainCandidate, "latitude" | "longitude">) {
  const r = 6371;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

export interface HeavyRainTrackPoint { validTime: string; latitude: number; longitude: number; level: HeavyRainLevel; candidateCount: number; }
export interface HeavyRainTrack { id: string; points: HeavyRainTrackPoint[]; level: HeavyRainLevel; }

export function trackHeavyRainClusters(frames: Array<{ validTime: string; clusters: HeavyRainCluster[] }>, maxMoveKm = 45): HeavyRainTrack[] {
  const tracks: HeavyRainTrack[] = [];
  for (const frame of frames) {
    const used = new Set<number>();
    for (const cluster of frame.clusters) {
      let best = -1, bestDistance = Infinity;
      for (let i = 0; i < tracks.length; i++) {
        if (used.has(i)) continue;
        const last = tracks[i].points[tracks[i].points.length - 1];
        if (last.validTime === frame.validTime) continue;
        const d = distanceKm(last, cluster);
        if (d <= maxMoveKm && d < bestDistance) { best = i; bestDistance = d; }
      }
      const point = { validTime: frame.validTime, latitude: cluster.latitude, longitude: cluster.longitude, level: cluster.level, candidateCount: cluster.candidates.length };
      if (best >= 0) {
        tracks[best].points.push(point); used.add(best);
        if (LEVEL_RANK[cluster.level] > LEVEL_RANK[tracks[best].level]) tracks[best].level = cluster.level;
      } else {
        tracks.push({ id: `rain-${tracks.length + 1}`, points: [point], level: cluster.level }); used.add(tracks.length - 1);
      }
    }
  }
  return tracks;
}

export interface HeavyRainEventCandidate {
  trackId: string;
  startsAt: string;
  endsAt: string;
  maxLevel: HeavyRainLevel;
  start: { latitude: number; longitude: number };
  end: { latitude: number; longitude: number };
  frameCount: number;
  affectedAreas: HeavyRainAffectedArea[];
}

export interface HeavyRainAffectedArea {
  code?: string;
  prefecture: string;
  municipality: string;
}

export function heavyRainTrackToEvent(track: HeavyRainTrack): HeavyRainEventCandidate | null {
  const first = track.points[0];
  const last = track.points[track.points.length - 1];
  if (!first || !last) return null;
  return {
    trackId: track.id,
    startsAt: first.validTime,
    endsAt: last.validTime,
    maxLevel: track.level,
    start: { latitude: first.latitude, longitude: first.longitude },
    end: { latitude: last.latitude, longitude: last.longitude },
    frameCount: track.points.length,
    affectedAreas: [],
  };
}
