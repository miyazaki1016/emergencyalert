// Astronomical ambience, not weather information. Reused from PR #61.
export function sunPosition(date: Date) {
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
export function solarAltitude(lat: number, lon: number, sun: ReturnType<typeof sunPosition>) {
  const r = Math.PI / 180;
  return Math.asin(Math.sin(lat * r) * Math.sin(sun.declination) + Math.cos(lat * r) * Math.cos(sun.declination) * Math.cos(lon * r - sun.longitude)) / r;
}

export function solarRaster(date: Date): string | undefined {
    const sun = sunPosition(date);
    // A smooth, geographically anchored solar shading raster. Canvas is only
    // an intermediate rendering surface; it is never weather information.
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
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

 return canvas.toDataURL('image/png');
}
