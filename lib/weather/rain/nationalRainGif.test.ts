import { describe, expect, it } from "vitest";
import { encodeNationalRainGif } from "./nationalRainGif";

const times = Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(2026, 10, 13, 0, (i + 1) * 5)).toISOString());
const options = {
  width: 4,
  height: 4,
  palette: [[255, 255, 255], [0, 120, 255]] as const,
  frames: times.map((validTime, i) => ({
    validTime,
    pixels: Uint8Array.from({ length: 16 }, (_, j) => Number(j === i)),
  })),
};

describe("isolated national rain GIF encoder", () => {
  it("creates six-frame GIF89a without posting or fetching", () => {
    const bytes = encodeNationalRainGif(options);
    expect(Buffer.from(bytes.subarray(0, 6)).toString("ascii")).toBe("GIF89a");
    expect(bytes.at(-1)).toBe(0x3b);
    expect([...bytes].filter((b, i) => b === 0x21 && bytes[i + 1] === 0xf9)).toHaveLength(6);
    expect(encodeNationalRainGif(options)).toEqual(bytes);
  });

  it("rejects missing, out-of-order and oversized frames", () => {
    expect(() => encodeNationalRainGif({ ...options, frames: options.frames.slice(1) })).toThrow("six");
    expect(() => encodeNationalRainGif({ ...options, frames: [...options.frames].reverse() })).toThrow("five-minute");
    expect(() => encodeNationalRainGif({ ...options, maxBytes: 20 })).toThrow("size limit");
    expect(() => encodeNationalRainGif({ ...options, frames: options.frames.map(f => ({ ...f, pixels: new Uint8Array(3) })) })).toThrow("pixels");
  });
});
