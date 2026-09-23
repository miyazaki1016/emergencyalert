import { describe, expect, it } from "vitest";
import { validateNewWatchTarget, type NewWatchTarget } from "./WatchTarget";

const valid: NewWatchTarget = {
  ownerId: "user-1",
  label: "自宅",
  latitude: 35.6812,
  longitude: 139.7671,
  enabled: true,
  notificationsEnabled: true,
};

describe("validateNewWatchTarget", () => {
  it("accepts an explicitly selected saved place", () => {
    expect(() => validateNewWatchTarget(valid)).not.toThrow();
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
