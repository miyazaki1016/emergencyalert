/**
 * Read-only, deterministic GIF89a encoder for a pre-rendered nationwide rain map.
 * No JMA requests, database writes, posting, or retry loops happen here.
 * Call from a separate bounded job, never from the five-minute scan loop.
 */
export type IndexedRainFrame = {
  pixels: Uint8Array;
  validTime: string;
};

export type RainGifOptions = {
  width: number;
  height: number;
  palette: readonly (readonly [number, number, number])[];
  frames: readonly IndexedRainFrame[];
  delayCentiseconds?: number;
  maxBytes?: number;
};

function word(value: number) {
  return [value & 255, (value >> 8) & 255];
}

function lzw(pixels: Uint8Array, minCodeSize: number): number[] {
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  let next = end + 1;
  let bits = minCodeSize + 1;
  const codes: number[] = [];
  let accumulator = 0;
  let held = 0;
  const emit = (code: number) => {
    accumulator |= code << held;
    held += bits;
    while (held >= 8) {
      codes.push(accumulator & 255);
      accumulator >>>= 8;
      held -= 8;
    }
  };
  let dictionary = new Map<string, number>();
  const reset = () => {
    dictionary = new Map();
    for (let i = 0; i < clear; i++) dictionary.set(String(i), i);
    next = end + 1;
    bits = minCodeSize + 1;
  };
  reset();
  emit(clear);
  let prefix = String(pixels[0]);
  for (let i = 1; i < pixels.length; i++) {
    const symbol = String(pixels[i]);
    const combined = prefix + "," + symbol;
    if (dictionary.has(combined)) {
      prefix = combined;
      continue;
    }
    emit(dictionary.get(prefix)!);
    if (next < 4096) {
      dictionary.set(combined, next++);
      // GIF decoder grows its dictionary one emitted code later.
      if (next > (1 << bits) && bits < 12) bits++;
    } else {
      emit(clear);
      reset();
    }
    prefix = symbol;
  }
  emit(dictionary.get(prefix)!);
  emit(end);
  if (held) codes.push(accumulator & 255);
  return codes;
}

export function encodeNationalRainGif(options: RainGifOptions): Uint8Array {
  const { width, height, palette, frames } = options;
  const delay = options.delayCentiseconds ?? 70;
  const maxBytes = options.maxBytes ?? 4_000_000;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1
    || width > 1024 || height > 1024 || width * height > 400_000) throw new Error("Invalid GIF dimensions");
  if (frames.length !== 6) throw new Error("GIF requires six forecast frames");
  if (!Number.isInteger(delay) || delay < 1 || delay > 65535) throw new Error("Invalid GIF delay");
  if (palette.length < 2 || palette.length > 256 || !palette.every(rgb =>
    rgb.length === 3 && rgb.every(v => Number.isInteger(v) && v >= 0 && v <= 255))) {
    throw new Error("Invalid GIF palette");
  }
  const times = frames.map(f => Date.parse(f.validTime));
  if (times.some(t => !Number.isFinite(t)) || times.some((t, i) => i > 0 && t - times[i - 1] !== 300_000)) {
    throw new Error("GIF frames must be consecutive five-minute forecasts");
  }
  const depth = Math.max(2, Math.ceil(Math.log2(palette.length)));
  const tableSize = 1 << depth;
  const output: number[] = [];
  const add = (...values: number[]) => {
    output.push(...values);
    if (output.length > maxBytes) throw new Error("GIF exceeds output size limit");
  };
  add(...Array.from(Buffer.from("GIF89a", "ascii")), ...word(width), ...word(height),
    0x80 | ((depth - 1) << 4) | (depth - 1), 0, 0);
  for (let i = 0; i < tableSize; i++) add(...(palette[i] ?? [0, 0, 0]));
  // Infinite looping extension; the file is generated without network access.
  add(0x21, 0xff, 11, ...Array.from(Buffer.from("NETSCAPE2.0", "ascii")), 3, 1, 0, 0, 0);
  for (const frame of frames) {
    if (frame.pixels.length !== width * height || frame.pixels.some(p => p >= palette.length)) {
      throw new Error("Invalid GIF frame pixels");
    }
    add(0x21, 0xf9, 4, 0, ...word(delay), 0, 0);
    add(0x2c, 0, 0, 0, 0, ...word(width), ...word(height), 0);
    add(depth);
    const bytes = lzw(frame.pixels, depth);
    for (let offset = 0; offset < bytes.length; offset += 255) {
      const chunk = bytes.slice(offset, offset + 255);
      add(chunk.length, ...chunk);
    }
    add(0);
  }
  add(0x3b);
  return Uint8Array.from(output);
}
