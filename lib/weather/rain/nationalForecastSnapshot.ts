const STRENGTHS = [30, 50, 80] as const;

export type NationalForecastSnapshot = {
  source: "JMA";
  n03Version: string;
  basetime: string;
  frames: {
    validTime: string;
    municipalities: {
      code: string;
      prefecture: string;
      municipality: string;
      minimumMmPerHour: (typeof STRENGTHS)[number];
    }[];
  }[];
};

export function forecastTime(value: string) {
  return Date.parse(value.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, "$1-$2-$3T$4:$5:$6Z"));
}

export function readNationalForecastSnapshot(value: unknown, now = Date.now()): NationalForecastSnapshot {
  const snapshot = value as NationalForecastSnapshot;
  if (snapshot?.source !== "JMA" || !/^\d{8}$/.test(snapshot.n03Version)
    || !Number.isFinite(forecastTime(snapshot.basetime))
    || !Array.isArray(snapshot.frames) || snapshot.frames.length !== 6) {
    throw new Error("Invalid forecast snapshot");
  }

  const base = forecastTime(snapshot.basetime);
  if (base > now || now - base > 15 * 60_000) throw new Error("Stale forecast snapshot");
  let previous = 0;
  for (const frame of snapshot.frames) {
    const time = forecastTime(frame.validTime);
    if (!Number.isFinite(time) || time <= base || (previous && time - previous !== 300_000)
      || !Array.isArray(frame.municipalities) || !frame.municipalities.every(area =>
        /^\d{5}$/.test(area?.code) && typeof area.prefecture === "string"
        && typeof area.municipality === "string" && STRENGTHS.includes(area.minimumMmPerHour),
      )) {
      throw new Error("Invalid forecast frame");
    }
    previous = time;
  }

  const frames = snapshot.frames.filter(frame => {
    const time = forecastTime(frame.validTime);
    return time > now && time <= now + 30 * 60_000;
  });
  if (!frames.length) throw new Error("No current forecast frames");
  return { ...snapshot, frames };
}
