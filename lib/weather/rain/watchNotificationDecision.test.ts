import { describe, expect, it } from "vitest";
import { shouldNotifyForRain } from "../../../supabase/functions/watch-rain/notificationDecision";

describe("watch-rain notification decision", () => {
  it("notifies when a target becomes actionable", () => {
    expect(shouldNotifyForRain({
      notificationsEnabled: true,
      currentUrgency: "LIFESTYLE_ACTION",
      previousUrgency: "INFO",
      lastNotifiedAt: null,
    })).toBe(true);
  });

  it("retries an actionable event that has not been delivered", () => {
    expect(shouldNotifyForRain({
      notificationsEnabled: true,
      currentUrgency: "LIFESTYLE_ACTION",
      previousUrgency: "LIFESTYLE_ACTION",
      lastNotifiedAt: null,
    })).toBe(true);
  });

  it("does not duplicate an already delivered actionable event", () => {
    expect(shouldNotifyForRain({
      notificationsEnabled: true,
      currentUrgency: "LIFESTYLE_ACTION",
      previousUrgency: "LIFESTYLE_ACTION",
      lastNotifiedAt: "2026-09-24T06:00:00.000Z",
    })).toBe(false);
  });

  it("respects per-target notification OFF", () => {
    expect(shouldNotifyForRain({
      notificationsEnabled: false,
      currentUrgency: "LIFESTYLE_ACTION",
      previousUrgency: "INFO",
      lastNotifiedAt: null,
    })).toBe(false);
  });

  it("does not notify INFO events", () => {
    expect(shouldNotifyForRain({
      notificationsEnabled: true,
      currentUrgency: "INFO",
      previousUrgency: "INFO",
      lastNotifiedAt: null,
    })).toBe(false);
  });
});
