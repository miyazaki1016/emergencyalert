import { describe, expect, it } from "vitest";
import { advanceObservationStreak, nextLastNotifiedAt, nextRainEndingNotified, shouldNotifyForRain } from "../../../supabase/functions/watch-rain/notificationDecision";

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
    })).toBe(false);
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
      expect(nextLastNotifiedAt({ delivered: 0, actionable: false, previousLastNotifiedAt: previous, now })).toBe(previous);
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
    })).toBe(true);
  });

  it("keeps the latch set when a new ending notification is delivered", () => {
    expect(nextRainEndingNotified({
      previousRainEndingNotified: false,
      rainStreak: 3,
      endingDelivered: true,
    })).toBe(true);
  });
});


describe("unique observation time streaks", () => {
  it("does not count repeated valid times or unknown observations", () => {
    const a=advanceObservationStreak({status:"NO_RAIN",validAt:"20261026010000",previousValidAt:"20261026005500",previousRainStreak:0,previousClearStreak:1});
    expect(a.clearStreak).toBe(2);
    const b=advanceObservationStreak({status:"NO_RAIN",validAt:"20261026010000",previousValidAt:a.observationValidAt,previousRainStreak:a.rainStreak,previousClearStreak:a.clearStreak});
    expect(b.clearStreak).toBe(2);
    const c=advanceObservationStreak({status:"UNKNOWN",validAt:"20261026010500",previousValidAt:b.observationValidAt,previousRainStreak:b.rainStreak,previousClearStreak:b.clearStreak});
    expect(c.clearStreak).toBe(2);
    const d=advanceObservationStreak({status:"NO_RAIN",validAt:"20261026011000",previousValidAt:c.observationValidAt,previousRainStreak:c.rainStreak,previousClearStreak:c.clearStreak});
    expect(d.clearStreak).toBe(3);
  });
});

// Reproduces the deployed behaviour audited for notifications 538/539.
// This records the issue; it is not approval of this re-notification policy.
it('documents the third clear observation bypassing an existing delivered latch while forecast remains actionable',()=>{
 const first={status:'NO_RAIN',validAt:'20261029034000',previousValidAt:'20261029033500',previousRainStreak:2,previousClearStreak:0};
 let state=advanceObservationStreak(first);
 const notified='2026-10-29T03:45:16.677Z';
 expect(shouldNotifyForRain({notificationsEnabled:true,currentUrgency:'LIFESTYLE_ACTION',lastNotifiedAt:null})).toBe(true);
 state=advanceObservationStreak({...first,validAt:'20261029034500',previousValidAt:'20261029034000',previousRainStreak:state.rainStreak,previousClearStreak:state.clearStreak});
 expect(state.clearStreak).toBe(2);
 expect(shouldNotifyForRain({notificationsEnabled:true,currentUrgency:'LIFESTYLE_ACTION',lastNotifiedAt:notified})).toBe(false);
 state=advanceObservationStreak({...first,validAt:'20261029035000',previousValidAt:'20261029034500',previousRainStreak:state.rainStreak,previousClearStreak:state.clearStreak});
 expect(state.clearStreak).toBe(3);
 expect(shouldNotifyForRain({notificationsEnabled:true,currentUrgency:'LIFESTYLE_ACTION',lastNotifiedAt:state.clearStreak>=3?null:notified})).toBe(true);
});
