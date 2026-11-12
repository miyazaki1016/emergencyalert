/** Read-only CLI audit for all 47 prepared N03 prefectures from PR #59.
 * Usage: npx tsx scripts/light-rain-nationwide-n03-audit.ts /path/to/n03-data
 * Missing or invalid prefecture data exits nonzero. No production calls.
 */
import { requireCompleteNationwideN03 } from "../lib/weather/rain/lightRainNationwideN03";

const root = process.argv[2];
if (!root) {
  console.error("Usage: npx tsx scripts/light-rain-nationwide-n03-audit.ts <prepared-N03-root>");
  process.exitCode = 2;
} else {
  try {
    const { prefectures, municipalities, areas } = requireCompleteNationwideN03(root);
    const prefectureNames = new Set(areas.map(area => area.prefecture));
    if (prefectureNames.size !== 47) throw new Error("INCOMPLETE_N03_COVERAGE: expected 47 distinct prefecture names, got " + prefectureNames.size);
    console.log(JSON.stringify({ mode: "NATIONWIDE_N03_READ_ONLY_AUDIT", prefectures, municipalities, complete: true, source: "PR59 prepared local N03", productionWrites: false, blueskyPosts: false }));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
