import { describe, expect, it } from "vitest";
import { nextLastNotifiedAt, nextRainEndingNotified, rainForecastTimeMs, isWithinRainNotificationHorizon, shouldNotifyForRain } from "../../../supabase/functions/watch-rain/notificationDecision";

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

  it("notifies a new actionable episode after an INFO reset even if an older episode was delivered", () => {
    expect(shouldNotifyForRain({
      notificationsEnabled: true,
      currentUrgency: "LIFESTYLE_ACTION",
      previousUrgency: "INFO",
      lastNotifiedAt: "2026-09-24T06:00:00.000Z",
    })).toBe(true);
  });

  it("does not notify when an actionable episode falls back to INFO", () => {
    expect(shouldNotifyForRain({
      notificationsEnabled: true,
      currentUrgency: "INFO",
      previousUrgency: "LIFESTYLE_ACTION",
      lastNotifiedAt: "2026-09-24T06:00:00.000Z",
    })).toBe(false);
  });

  it("treats a missing previous event as a new actionable episode", () => {
    expect(shouldNotifyForRain({
      notificationsEnabled: true,
      currentUrgency: "LIFESTYLE_ACTION",
      previousUrgency: null,
      lastNotifiedAt: null,
    })).toBe(true);
  });

  it("keeps retry pending while actionable when delivery has never succeeded", () => {
    expect(shouldNotifyForRain({
      notificationsEnabled: true,
      currentUrgency: "LIFESTYLE_ACTION",
      previousUrgency: "LIFESTYLE_ACTION",
      lastNotifiedAt: null,
    })).toBe(true);
  });

  it("does not duplicate after an UNKNOWN check when the last grounded actionable event is preserved", () => {
    expect(shouldNotifyForRain({
      notificationsEnabled: true,
      currentUrgency: "LIFESTYLE_ACTION",
      previousUrgency: "LIFESTYLE_ACTION",
      lastNotifiedAt: "2026-09-24T06:00:00.000Z",
    })).toBe(false);
  });

  it("notifies again when a delivered rain episode ended and a later episode becomes actionable", () => {
    const endedEpisode = shouldNotifyForRain({
      notificationsEnabled: true,
      currentUrgency: "INFO",
      previousUrgency: "LIFESTYLE_ACTION",
      lastNotifiedAt: "2026-09-24T06:00:00.000Z",
    });
    expect(endedEpisode).toBe(false);

    expect(shouldNotifyForRain({
      notificationsEnabled: true,
      currentUrgency: "LIFESTYLE_ACTION",
      previousUrgency: "INFO",
      lastNotifiedAt: null,
    })).toBe(true);
  });
  describe("last_notified_at delivery state", () => {
    const previous = "2026-09-24T06:00:00.000Z";
    const now = "2026-09-25T06:00:00.000Z";

    it("advances only when at least one Push delivery succeeds", () => {
      expect(nextLastNotifiedAt({ delivered: 1, actionable: true, previousLastNotifiedAt: previous, now })).toBe(now);
    });

    it("does not advance when no Push delivery succeeds", () => {
      expect(nextLastNotifiedAt({ delivered: 0, actionable: true, previousLastNotifiedAt: previous, now })).toBe(previous);
      expect(nextLastNotifiedAt({ delivered: 0, actionable: true, previousLastNotifiedAt: null, now })).toBeNull();
    });

    it("clears the marker when the grounded event is no longer actionable", () => {
      expect(nextLastNotifiedAt({ delivered: 0, actionable: false, previousLastNotifiedAt: previous, now })).toBeNull();
    });
  });
});

describe("rain-ending hysteresis", () => {
  it("keeps ending latched through a dry streak", () => {
    expect(nextRainEndingNotified({
      previousRainEndingNotified: true,
      rainStreak: 0,
      endingDelivered: false,
    })).toBe(true);
  });

  it("rearms only after three consecutive rain observations", () => {
    expect(nextRainEndingNotified({
      previousRainEndingNotified: true,
      rainStreak: 2,
      endingDelivered: false,
    })).toBe(true);
    expect(nextRainEndingNotified({
      previousRainEndingNotified: true,
      rainStreak: 3,
      endingDelivered: false,
    })).toBe(false);
  });

  it("keeps the latch set when a new ending notification is delivered", () => {
    expect(nextRainEndingNotified({
      previousRainEndingNotified: false,
      rainStreak: 3,
      endingDelivered: true,
    })).toBe(true);
  });
});


describe("notification regression characterization (2026-10-18)", () => {
  it("currently permits an ending notification independently of an earlier approach notification", () => {
    // Characterization, not desired policy: shouldNotifyForRain has no rain-episode ID
    // or prior approach-delivery argument.
    expect(shouldNotifyForRain({
      notificationsEnabled: true,
      currentUrgency: "INFO",
      previousUrgency: "INFO",
      lastNotifiedAt: null,
      rainEnding: true,
    })).toBe(true);
  });

  it("native Date parsing does not interpret the 14-digit JMA forecast timestamp", () => {
    // The watch-rain worker currently uses new Date(frame.validTime) for
    // severe forecast selection. RainInterpretationEngine uses a JMA parser.
    expect(Number.isNaN(new Date("20261018123000").getTime())).toBe(true);
    expect(new Date("2026-10-18T12:30:00Z").getTime()).toBe(1792326600000);
  });
});

describe("JMA forecast timestamp parsing", () => {
  it("accepts valid 14-digit JMA UTC timestamps", () => {
    expect(rainForecastTimeMs("20261018123000")).toBe(Date.parse("2026-10-18T12:30:00Z"));
  });
  it("accepts ISO timestamps used by other providers", () => {
    expect(rainForecastTimeMs("2026-10-18T12:30:00Z")).toBe(Date.parse("2026-10-18T12:30:00Z"));
  });
  it("fails closed on invalid or missing timestamps", () => {
    expect(Number.isNaN(rainForecastTimeMs("20261318123000"))).toBe(true);
    expect(Number.isNaN(rainForecastTimeMs("not-a-date"))).toBe(true);
    expect(Number.isNaN(rainForecastTimeMs(null))).toBe(true);
  });
});


describe("rain episode timeline characterization", () => {
  it("does not send an approach Push for a weak INFO forecast", () => {
    expect(shouldNotifyForRain({
      notificationsEnabled: true,
      currentUrgency: "INFO",
      previousUrgency: "INFO",
      lastNotifiedAt: null,
    })).toBe(false);
  });

  it("sends an actionable approach once, then suppresses its duplicate", () => {
    const base = {
      notificationsEnabled: true,
      currentUrgency: "LIFESTYLE_ACTION" as const,
    };
    expect(shouldNotifyForRain({
      ...base, previousUrgency: "INFO", lastNotifiedAt: null,
    })).toBe(true);
    expect(shouldNotifyForRain({
      ...base, previousUrgency: "LIFESTYLE_ACTION",
      lastNotifiedAt: "2026-10-19T03:00:00.000Z",
    })).toBe(false);
  });

  it("characterizes ending-only Push after a weak approach was suppressed", () => {
    const approach = shouldNotifyForRain({
      notificationsEnabled: true,
      currentUrgency: "INFO",
      previousUrgency: "INFO",
      lastNotifiedAt: null,
    });
    const ending = shouldNotifyForRain({
      notificationsEnabled: true,
      currentUrgency: "INFO",
      previousUrgency: "INFO",
      lastNotifiedAt: null,
      rainEnding: true,
    });
    expect({ approach, ending }).toEqual({ approach: false, ending: true });
  });

  it("does not notify when the target is OFF even for ending", () => {
    expect(shouldNotifyForRain({
      notificationsEnabled: false,
      currentUrgency: "INFO",
      previousUrgency: "INFO",
      lastNotifiedAt: null,
      rainEnding: true,
    })).toBe(false);
  });

  it("rearms the ending latch after three confirmed rainy checks", () => {
    const afterDry = nextRainEndingNotified({
      previousRainEndingNotified: true, rainStreak: 0, endingDelivered: false,
    });
    const afterTwo = nextRainEndingNotified({
      previousRainEndingNotified: afterDry, rainStreak: 2, endingDelivered: false,
    });
    const afterThree = nextRainEndingNotified({
      previousRainEndingNotified: afterTwo, rainStreak: 3, endingDelivered: false,
    });
    expect([afterDry, afterTwo, afterThree]).toEqual([true, true, false]);
  });

  it("parses the JMA timestamp at the exact 30-minute boundary", () => {
    const now = Date.parse("2026-10-19T03:00:00Z");
    const at30 = rainForecastTimeMs("20261019033000");
    const at35 = rainForecastTimeMs("20261019033500");
    expect((at30 - now) / 60000).toBe(30);
    expect((at35 - now) / 60000).toBe(35);
    // Worker severeFrame currently has no <=30 minute filter.
  });

  it("does not turn malformed JMA time into a future forecast", () => {
    expect(Number.isNaN(rainForecastTimeMs("20260230033000"))).toBe(true);
    expect(Number.isNaN(rainForecastTimeMs("20261019033099"))).toBe(true);
  });
});

describe("30-minute MY rain eligibility", () => {
  const now = Date.parse("2026-10-19T03:00:00Z");
  it("includes forecasts through 30 minutes", () => {
    expect(isWithinRainNotificationHorizon("20261019033000", now)).toBe(true);
  });
  it("excludes later and expired forecasts", () => {
    expect(isWithinRainNotificationHorizon("20261019033500", now)).toBe(false);
    expect(isWithinRainNotificationHorizon("20261019025500", now)).toBe(false);
  });
  it("rejects missing and invalid timestamps", () => {
    expect(isWithinRainNotificationHorizon(null, now)).toBe(false);
    expect(isWithinRainNotificationHorizon("invalid", now)).toBe(false);
  });
});
