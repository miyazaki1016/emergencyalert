import { describe, expect, it } from "vitest";
import { validateNewWatchTarget, type NewWatchTarget } from "./WatchTarget";

const valid: NewWatchTarget = {
  ownerId: "user-1",
  label: "自宅",
  latitude: 35.6812,
  longitude: 139.7671,
  displayName: "東京駅",
  displayAddress: "東京都千代田区丸の内1丁目",
  source: "SEARCH",
  enabled: true,
  notificationsEnabled: true,
};

describe("validateNewWatchTarget", () => {
  it("accepts a searched place with human-readable context", () => {
    expect(() => validateNewWatchTarget(valid)).not.toThrow();
  });

  it("accepts current location even when reverse geocoding has no label", () => {
    expect(() =>
      validateNewWatchTarget({
        ...valid,
        source: "CURRENT_LOCATION",
        displayName: null,
        displayAddress: null,
      }),
    ).not.toThrow();
  });

  it("rejects invalid coordinates", () => {
    expect(() => validateNewWatchTarget({ ...valid, latitude: 91 })).toThrow();
    expect(() => validateNewWatchTarget({ ...valid, longitude: -181 })).toThrow();
  });

  it("requires an owner and a user-facing label", () => {
    expect(() => validateNewWatchTarget({ ...valid, ownerId: " " })).toThrow();
    expect(() => validateNewWatchTarget({ ...valid, label: "" })).toThrow();
  });
});
