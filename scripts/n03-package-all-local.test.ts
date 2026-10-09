import { afterEach, expect, test } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JAPAN_PREFECTURES } from "../lib/weather/rain/japanPrefectures";
import { packageAllLocal } from "./n03-package-all-local";

const dirs: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "n03-local-proof-"));
  dirs.push(root);
  const input = join(root, "prepared");
  const output = join(root, "partitions");
  mkdirSync(input);
  for (const { code, name } of JAPAN_PREFECTURES) {
    const area = [{
      code: `${code}001`, prefecture: name, municipality: "テスト市",
      geometry: { type: "Polygon", coordinates: [[[139,35],[139.01,35],[139.01,35.01],[139,35.01],[139,35]]] },
    }];
    writeFileSync(join(input, `${code}.areas.json`), JSON.stringify(area));
  }
  return { input, output };
}
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

test("packages all 47 local fixtures without touching source data", () => {
  const { input, output } = fixture();
  const result = packageAllLocal(input, output);
  expect(result.prefectures).toBe(47);
  expect(result.manifests).toBe(47);
  expect(result.chunks).toBeGreaterThanOrEqual(47);
  const manifest = JSON.parse(readFileSync(join(output, "20260101/polygon-parts-v1/13/manifest.json"), "utf8"));
  expect(manifest.code).toBe("13");
  expect(manifest.indexSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(existsSync(join(input, "13.areas.json"))).toBe(true);
  expect(() => packageAllLocal(input, output)).toThrow("must not already exist");
});

test("fails closed on a missing or mismatched prefecture before writing output", () => {
  const { input, output } = fixture();
  rmSync(join(input, "47.areas.json"));
  expect(() => packageAllLocal(input, output)).toThrow();
  expect(existsSync(output)).toBe(false);
  writeFileSync(join(input, "47.areas.json"), JSON.stringify([{
    code: "47001", prefecture: "東京都", municipality: "テスト市",
    geometry: { type: "Polygon", coordinates: [[[139,35],[139.01,35],[139.01,35.01],[139,35.01],[139,35]]] },
  }]));
  expect(() => packageAllLocal(input, output)).toThrow("Invalid prepared N03 input");
  expect(existsSync(output)).toBe(false);
});
