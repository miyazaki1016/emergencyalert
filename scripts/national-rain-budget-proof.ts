import assert from "node:assert/strict";

async function runSyntheticRefinement(totalTiles: number, budgetMs: number, perTileMs: number) {
  const started = Date.now();
  const deadline = started + budgetMs;
  let processed = 0;
  let deferred = false;
  for (let i = 0; i < totalTiles; i += 1) {
    if (Date.now() >= deadline) { deferred = true; break; }
    await new Promise((resolve) => setTimeout(resolve, perTileMs));
    processed += 1;
  }
  return { processed, deferred, elapsedMs: Date.now() - started };
}

async function main() {
  const result = await runSyntheticRefinement(100, 35, 10);
  assert.equal(result.deferred, true);
  assert.ok(result.processed > 0, "should process at least one tile");
  assert.ok(result.processed < 100, "should leave tiles deferred");
  assert.ok(result.elapsedMs < 150, "deadline check should stop promptly");
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
