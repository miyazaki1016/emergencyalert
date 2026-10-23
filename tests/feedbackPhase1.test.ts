import { describe, expect, it } from "vitest";
import { negativeFeedbackNeedsWait, parseFeedbackHash, watchedPlaceLabel, filterFeedbackByTarget, selectFeedbackHistory, compactFeedbackHistory, toggleFeedbackCard, revealFeedbackCard, summarizeFeedbackObservations, filterHistoryAfterArchive, historyArchiveStorageKey, historyQuerySince } from "../lib/weather/rain/feedbackPhase1";

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

describe("short feedback history on iPhone", () => {
  const rows = Array.from({length:11}, (_,i) => ({id:11-i}));
  it("shows only two newest cards by default instead of a long list", () => {
    const selected = compactFeedbackHistory(rows,2,null);
    expect(selected.items.map(r=>r.id)).toEqual([11,10]);
    expect(selected.remaining).toBe(9);
  });
  it("reveals older cards in batches without reordering anything", () => {
    expect(compactFeedbackHistory(rows,7,null).items.map(r=>r.id)).toEqual([11,10,9,8,7,6,5]);
    expect(compactFeedbackHistory(rows,12,null).remaining).toBe(0);
  });
  it("never hides a linked notification even when it is older", () => {
    const selected=compactFeedbackHistory(rows,2,2);
    expect(selected.items.at(-1)?.id).toBe(2);
    expect(selected.remaining).toBe(1);
  });
  it("handles no notifications and invalid limits", () => {
    expect(compactFeedbackHistory([],2,null)).toEqual({items:[],remaining:0});
    expect(compactFeedbackHistory(rows,Number.NaN,null).items).toHaveLength(2);
  });
});

describe("tap-to-expand notification feedback cards", () => {
  it("starts with no opened cards and opens a tapped alert", () => {
    const opened = toggleFeedbackCard([], 209);
    expect(opened).toEqual([209]);
    expect(toggleFeedbackCard(opened, 209)).toEqual([]);
  });
  it("opens the specific Push-linked history without closing another card", () => {
    expect(revealFeedbackCard([210], 209)).toEqual([210, 209]);
    expect(revealFeedbackCard([209], 209)).toEqual([209]);
  });
  it("does not mutate previously opened cards or other items", () => {
    const previous = [211,210];
    expect(toggleFeedbackCard(previous,209)).toEqual([211,210,209]);
    expect(toggleFeedbackCard(previous,211)).toEqual([210]);
    expect(previous).toEqual([211,210]);
  });
});

describe("feedback observation totals", () => {
  it("keeps unknown and already-dry separate from observed rain and dry", () => {
    const rows = [1,2,3,4,5].map(id => ({id,event_type:"RAIN_ENDING"}));
    const answers = {1:"UNKNOWN",2:"ALREADY_DRY",3:"RAINED",4:"DID_NOT_RAIN",5:"DID_NOT_STOP"};
    expect(summarizeFeedbackObservations(rows,answers)).toEqual({
      answered:5, observedRain:2, observedDry:1, alreadyChanged:1, unknown:1,
    });
  });
  it("only counts notifications in the selected list", () => {
    expect(summarizeFeedbackObservations([{id:1,event_type:"RAIN_ENDING"}],{
      1:"STOPPED", 2:"UNKNOWN",
    })).toEqual({answered:1,observedRain:0,observedDry:1,alreadyChanged:0,unknown:0});
  });
});

describe("non-destructive history archive for a single account and device",()=>{
  const deliveries=[
    {id:3,delivered_at:"2026-10-22T10:02:00Z"},
    {id:2,delivered_at:"2026-10-22T10:00:00Z"},
    {id:1,delivered_at:"2026-10-21T00:00:00Z"},
  ];
  it("hides deliveries at or before the boundary but keeps new Push messages",()=>{
    const visible=filterHistoryAfterArchive(deliveries,"2026-10-22T10:00:00Z",false);
    expect(visible.map(x=>x.id)).toEqual([3]);
    expect(deliveries).toHaveLength(3);
  });
  it("reversibly shows all original records without changing any rows",()=>{
    expect(filterHistoryAfterArchive(deliveries,"2026-10-22T10:00:00Z",true)).toEqual(deliveries);
  });
  it("ignores invalid or absent archive boundaries",()=>{
    expect(filterHistoryAfterArchive(deliveries,null,false)).toEqual(deliveries);
    expect(filterHistoryAfterArchive(deliveries,"invalid",false)).toEqual(deliveries);
  });
  it("never shares the view preference across auth owners",()=>{
    expect(historyArchiveStorageKey("user-A")).not.toBe(historyArchiveStorageKey("user-B"));
  });
});

describe("archived feedback remains browsable after seven days", () => {
  it("uses seven days for the default short feed", () => {
    const now=Date.parse("2026-10-23T00:00:00Z");
    expect(historyQuerySince(false,now)).toBe("2026-10-16T00:00:00.000Z");
  });
  it("removes the seven-day cutoff when viewing saved older notifications", () => {
    expect(historyQuerySince(true,Date.parse("2026-10-23T00:00:00Z"))).toBeNull();
  });
});

describe("old Push deep links and history query", () => {
  it("removes the seven-day cutoff for a focused historical notification", () => {
    const now=Date.parse("2026-10-23T00:00:00Z");
    const focused=parseFeedbackHash("#rain-feedback-123");
    expect(focused).toBe(123);
    expect(historyQuerySince(focused !== null,now)).toBeNull();
  });
  it("retains the seven-day cutoff without a focused link", () => {
    const now=Date.parse("2026-10-23T00:00:00Z");
    const focused=parseFeedbackHash("#unrelated");
    expect(historyQuerySince(focused !== null,now)).toBe("2026-10-16T00:00:00.000Z");
  });
});
