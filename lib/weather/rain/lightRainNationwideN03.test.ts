import { strict as assert } from "node:assert";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import { ALL_PREFECTURE_CODES, loadNationwidePreparedN03, requireCompleteNationwideN03 } from "./lightRainNationwideN03";

test("all 47 official prefecture codes are included exactly once", () => {
  assert.equal(ALL_PREFECTURE_CODES.length, 47);
  assert.equal(new Set(ALL_PREFECTURE_CODES).size, 47);
  assert.equal(ALL_PREFECTURE_CODES[0], "01");
  assert.equal(ALL_PREFECTURE_CODES[46], "47");
  assert.ok(ALL_PREFECTURE_CODES.includes("04")); // Miyagi
});

test("missing prefectures are explicit and never treated as no rain", () => {
  const root = mkdtempSync(join(tmpdir(), "n03-47-"));
  try {
    const partial = [{ code: "04101", prefecture: "宮城県", municipality: "仙台市", geometry: { type: "Polygon", coordinates: [[[140,38],[141,38],[141,39],[140,38]]] } }];
    writeFileSync(join(root, "04.areas.json"), JSON.stringify(partial));
    const result = loadNationwidePreparedN03(root);
    assert.equal(result.complete, false);
    assert.equal(result.prefectures, 1);
    assert.equal(result.municipalities, 1);
    assert.equal(result.missing.length, 46);
    assert.ok(!result.missing.includes("04"));
    assert.throws(() => requireCompleteNationwideN03(root), /INCOMPLETE_N03_COVERAGE/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("all 47 prepared files load with code identity", () => {
  const root = mkdtempSync(join(tmpdir(), "n03-47-"));
  try {
    for (const code of ALL_PREFECTURE_CODES) {
      writeFileSync(join(root, code + ".areas.json"), JSON.stringify([{
        code: code + "001", prefecture: "test-prefecture-" + code, municipality: "test-city",
        geometry: { type: "Polygon", coordinates: [[[140,38],[141,38],[141,39],[140,38]]] }
      }]));
    }
    const result = requireCompleteNationwideN03(root);
    assert.equal(result.complete, true);
    assert.equal(result.prefectures, 47);
    assert.equal(result.municipalities, 47);
    assert.deepEqual(result.missing, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
