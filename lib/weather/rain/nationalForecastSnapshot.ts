export const NATIONAL_FORECAST_FRESHNESS_MS = 15 * 60_000;

const STRENGTHS = [30, 50, 80] as const;

export type RadarTile = { x: number; y: number };

export type NationalForecastSnapshot = {
  source: "JMA";
  n03Version: string;
  basetime: string;
  extendedFrames?: NationalForecastFrame[];
  frames: NationalForecastFrame[];
};

export type NationalForecastFrame = {
  validTime: string;
  municipalities: {
    code: string;
    prefecture: string;
    municipality: string;
    minimumMmPerHour: (typeof STRENGTHS)[number];
    radarTile?: RadarTile;
  }[];
};

export function forecastTime(value: string) {
  return Date.parse(value.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, "$1-$2-$3T$4:$5:$6Z"));
}

export function readNationalForecastSnapshot(value: unknown, now = Date.now()): NationalForecastSnapshot {
  return readSnapshot(value, now, false);
}

export function readNationalForecastSnapshotForDisplay(value: unknown, now = Date.now()): NationalForecastSnapshot {
  return readSnapshot(value, now, true);
}

function readSnapshot(value: unknown, now: number, display: boolean): NationalForecastSnapshot {
  const snapshot = value as NationalForecastSnapshot;
  if (snapshot?.source !== "JMA" || !/^\d{8}$/.test(snapshot.n03Version)
    || typeof snapshot.basetime !== "string" || !Number.isFinite(forecastTime(snapshot.basetime))
    || !Array.isArray(snapshot.frames) || snapshot.frames.length !== 6) {
    throw new Error("Invalid forecast snapshot");
  }

  const base = forecastTime(snapshot.basetime);
  if (base > now || (!display && now - base > NATIONAL_FORECAST_FRESHNESS_MS)) throw new Error("Stale forecast snapshot");
  function validateFrames(frames: NationalForecastFrame[], firstMinute: number) {
    if (!Array.isArray(frames) || frames.length !== 6) throw new Error("Incomplete forecast band");
    for (const [index, frame] of frames.entries()) {
      if (forecastTime(frame.validTime) !== base + (firstMinute + 5 * index) * 60_000
        || !Array.isArray(frame.municipalities) || !frame.municipalities.every(area =>
          /^\d{5}$/.test(area?.code) && typeof area.prefecture === "string"
          && typeof area.municipality === "string" && STRENGTHS.includes(area.minimumMmPerHour)
          && (area.radarTile === undefined || validRadarTile(area.radarTile)),
        )) throw new Error("Invalid forecast frame");
    }
  }
  validateFrames(snapshot.frames, 5);
  const frames = snapshot.frames.filter(frame => forecastTime(frame.validTime) > now);
  // A malformed extended band does not hide a healthy detailed forecast.
  let extendedFrames: NationalForecastFrame[] | undefined;
  if (snapshot.extendedFrames !== undefined) {
    try {
      validateFrames(snapshot.extendedFrames, 35);
      extendedFrames = snapshot.extendedFrames.filter(frame => forecastTime(frame.validTime) > now);
    } catch {
      extendedFrames = undefined;
    }
  }
  if (!frames.length && !extendedFrames?.length) throw new Error("No current forecast frames");
  return { ...snapshot, frames, extendedFrames };
}

export function validRadarTile(value: unknown): value is RadarTile {
  if (!value || typeof value !== "object") return false;
  const { x, y } = value as RadarTile;
  return [x, y].every(n => Number.isInteger(n) && n >= 0 && n < 1024);
}
