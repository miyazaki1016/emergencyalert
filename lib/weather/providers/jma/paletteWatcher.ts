import type { RainIntensityClass, Rgba } from "../../types";
import { VERIFIED_JMA_PNG_PALETTE } from "./pngPalette";

export interface ObservedPaletteEntry {
  rgba: Rgba;
  intensityClass: RainIntensityClass;
}

export type PaletteWatchResult =
  | { status: "UNCHANGED"; changes: [] }
  | { status: "CHANGE_DETECTED"; changes: PaletteChange[] };

export interface PaletteChange {
  intensityClass: RainIntensityClass;
  expected: Rgba | null;
  observed: Rgba | null;
}

/**
 * Compares independently observed JMA legend mappings with the palette that is
 * allowed to drive production interpretation.
 *
 * Detection is intentionally read-only: a change must never update the
 * verified production palette automatically.
 */
export function compareObservedPalette(
  observed: readonly ObservedPaletteEntry[],
): PaletteWatchResult {
  const expected = new Map(
    VERIFIED_JMA_PNG_PALETTE.map((entry) => [entry.intensityClass, entry.rgba]),
  );
  const actual = new Map(observed.map((entry) => [entry.intensityClass, entry.rgba]));
  const classes = new Set([...expected.keys(), ...actual.keys()]);
  const changes: PaletteChange[] = [];

  for (const intensityClass of classes) {
    const expectedRgba = expected.get(intensityClass) ?? null;
    const observedRgba = actual.get(intensityClass) ?? null;
    if (!sameRgba(expectedRgba, observedRgba)) {
      changes.push({ intensityClass, expected: expectedRgba, observed: observedRgba });
    }
  }

  return changes.length === 0
    ? { status: "UNCHANGED", changes: [] }
    : { status: "CHANGE_DETECTED", changes };
}

function sameRgba(a: Rgba | null, b: Rgba | null): boolean {
  if (a === null || b === null) return a === b;
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}
