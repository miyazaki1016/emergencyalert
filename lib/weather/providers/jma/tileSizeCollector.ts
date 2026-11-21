import type { JmaTileSizeRecord } from "./JmaPublicImageProvider";

/** In-memory, opt-in collector. No DB, logging, network, or persistence. */
export class JmaTileSizeCollector {
  private readonly samples = new Map<string, JmaTileSizeRecord>();
  constructor(private readonly maxSamples = 1000) {
    if (!Number.isSafeInteger(maxSamples) || maxSamples < 1) {
      throw new Error("maxSamples must be a positive integer");
    }
  }

  record = (sample: JmaTileSizeRecord): void => {
    if (!Number.isSafeInteger(sample.pngBytes) || sample.pngBytes < 0) return;
    const key = [sample.baseTime, sample.validTime, sample.zoom, sample.tileX, sample.tileY].join("/");
    if (!this.samples.has(key) && this.samples.size >= this.maxSamples) return;
    this.samples.set(key, { ...sample });
  };

  summary(): { count: number; totalBytes: number; minBytes: number | null; maxBytes: number | null; meanBytes: number | null } {
    const sizes = [...this.samples.values()].map((sample) => sample.pngBytes);
    const totalBytes = sizes.reduce((sum, size) => sum + size, 0);
    return {
      count: sizes.length,
      totalBytes,
      minBytes: sizes.length ? Math.min(...sizes) : null,
      maxBytes: sizes.length ? Math.max(...sizes) : null,
      meanBytes: sizes.length ? totalBytes / sizes.length : null,
    };
  }

  snapshot(): JmaTileSizeRecord[] {
    return [...this.samples.values()].map((sample) => ({ ...sample }));
  }
}
