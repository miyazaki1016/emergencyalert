/**
 * JMA palette observation entry point.
 *
 * This job deliberately fails closed until the current JMA legend can be
 * parsed with an evidence-backed association between each intensity band and
 * its RGB value. It must never guess from asset names, ordering or old colors.
 *
 * Once an observer is proven, feed its ObservedPaletteEntry[] into
 * compareObservedPalette(). A detected change should fail the scheduled job
 * and alert maintainers; it must never rewrite pngPalette.ts.
 */
async function main() {
  console.log("JMA palette watch: observer boundary is active.");
  console.log("No production palette mutation is permitted.");
  console.log("Current live legend parser: NOT YET EVIDENCE-VERIFIED.");
  console.log("Result: WATCH_NOT_READY (safe/no mutation).");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
