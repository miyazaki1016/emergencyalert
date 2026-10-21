import { describe, expect, it } from "vitest";
import {
  NATIONAL_RAIN_N03_BUCKET,
  NATIONAL_RAIN_N03_PREFIX,
  nationalRainN03ObjectPath,
} from "./n03PreparedStorageLoader";

describe("N03 prepared Storage contract", () => {
  it("keeps loader paths aligned with the guarded uploader", () => {
    expect(NATIONAL_RAIN_N03_BUCKET).toBe("national-rain-n03");
    expect(NATIONAL_RAIN_N03_PREFIX).toBe("20260101");
    expect(nationalRainN03ObjectPath("47")).toBe(`${NATIONAL_RAIN_N03_PREFIX}/47.areas.json`);
  });
});
