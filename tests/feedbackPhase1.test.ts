import { describe, expect, it } from "vitest";
import { negativeFeedbackNeedsWait, parseFeedbackHash, watchedPlaceLabel, filterFeedbackByTarget, selectFeedbackHistory } from "../lib/weather/rain/feedbackPhase1";

describe("phase-one in-app history links", () => {
  it("accepts positive numeric feedback IDs", () => {
    expect(parseFeedbackHash("#rain-feedback-1")).toBe(1);
    expect(parseFeedbackHash("#rain-feedback-45321")).toBe(45321);
  });
  it("rejects malformed and ambiguous IDs", () => {
    for (const value of ["", "#rain-feedback-0", "#rain-feedback-01", "#rain-feedback--1",
      "#rain-feedback-1x", "#rain-feedback-1.5", "#rain-feedback-9007199254740992",
      "#rain-feedback-1234567890123456", "#rain-feedback-1?x=2", "#other-1"]) {
      expect(parseFeedbackHash(value)).toBeNull();
    }
  });
});

describe("phase-one legacy notification reply timing", () => {
  const deliveredAt = "2026-10-21T05:00:00.000Z";
  const started = Date.parse(deliveredAt);
  it("holds negative answers until an hour after notification", () => {
    expect(negativeFeedbackNeedsWait("DID_NOT_RAIN", deliveredAt, started)).toBe(true);
    expect(negativeFeedbackNeedsWait("DID_NOT_STOP", deliveredAt, started + 59 * 60_000)).toBe(true);
    expect(negativeFeedbackNeedsWait("DID_NOT_RAIN", deliveredAt, started + 60 * 60_000)).toBe(false);
  });
  it("does not hold eyewitness and unknown answers", () => {
    for (const value of ["RAINED", "ALREADY_RAINING", "ALREADY_DRY", "STOPPED", "UNKNOWN"]) {
      expect(negativeFeedbackNeedsWait(value, deliveredAt, started)).toBe(false);
    }
  });
  it("never enables a negative answer with invalid delivery time", () => {
    expect(negativeFeedbackNeedsWait("DID_NOT_RAIN", "invalid", Date.now())).toBe(true);
  });
});

describe("feedback always refers to a watched target", () => {
  it("shows the registered label of the specific target", () => {
    const labels = { "home-id": "自宅", "airport-id": "羽田空港" };
    expect(watchedPlaceLabel("airport-id", labels)).toBe("羽田空港");
    expect(watchedPlaceLabel("home-id", labels)).toBe("自宅");
  });
  it("never substitutes the current location or another target", () => {
    expect(watchedPlaceLabel("missing-id", { "home-id": "自宅" }))
      .toBe("登録地点（名称を確認できないよ）");
    expect(watchedPlaceLabel("empty", { empty: "   " }))
      .toBe("登録地点（名称を確認できないよ）");
  });
});

describe("per-watched-place feedback filter", () => {
  const notifications = [
    {id:10, target_id:"home-id"},
    {id:11, target_id:"airport-id"},
    {id:12, target_id:"home-id"},
  ];
  it("shows only matching monitored place, not device location", () => {
    expect(filterFeedbackByTarget(notifications,"airport-id").map(n => n.id)).toEqual([11]);
    expect(filterFeedbackByTarget(notifications,"home-id").map(n => n.id)).toEqual([10,12]);
  });
  it("shows all places without changing original ordering", () => {
    const items = filterFeedbackByTarget(notifications,"all");
    expect(items).toEqual(notifications);
    expect(items).not.toBe(notifications);
  });
  it("does not invent a location when the target was removed", () => {
    expect(filterFeedbackByTarget(notifications,"removed-id")).toEqual([]);
  });
});

describe("answered, unanswered and selected history views", () => {
  const items = [
    {id:5,event_type:"RAIN_APPROACHING"},
    {id:4,event_type:"SEVERE_RAIN"},
    {id:3,event_type:"RAIN_ENDING"},
    {id:2,event_type:"RAIN_APPROACHING"},
  ];
  const types = new Set(["RAIN_APPROACHING","RAIN_ENDING"]);
  const answers = {3:"STOPPED",2:"RAINED"};
  it("counts supported answers without counting unanswerable severe rain events", () => {
    const result = selectFeedbackHistory(items,answers,types,"all",null);
    expect([result.answerable,result.answered,result.unanswered]).toEqual([3,2,1]);
    expect(result.visible.map(item=>item.id)).toEqual([5,4,3,2]);
  });
  it("shows only unanswered and only answered, keeping chronological order", () => {
    expect(selectFeedbackHistory(items,answers,types,"unanswered",null).visible.map(x=>x.id)).toEqual([5]);
    expect(selectFeedbackHistory(items,answers,types,"answered",null).visible.map(x=>x.id)).toEqual([3,2]);
  });
  it("never hides the focused notification even when its answer status disagrees", () => {
    expect(selectFeedbackHistory(items,answers,types,"unanswered",3).visible.map(x=>x.id)).toEqual([5,3]);
    expect(selectFeedbackHistory(items,answers,types,"answered",5).visible.map(x=>x.id)).toEqual([5,3,2]);
  });
  it("does not count unsupported alert types as unanswered", () => {
    const result = selectFeedbackHistory(items,{},types,"unanswered",null);
    expect(result.unanswered).toBe(3);
    expect(result.visible.map(x=>x.id)).toEqual([5,3,2]);
  });
});
