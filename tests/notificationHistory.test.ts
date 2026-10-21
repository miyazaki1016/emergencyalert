import { describe, expect, it } from "vitest";
import { prioritizeNotification, savedWeatherAnswerLabel, selectFeedbackHistory, parsePushNotificationId } from "../lib/weather/rain/notificationHistory";

describe("notification feedback experience", () => {
  const items = [{ id: 3 }, { id: 2 }, { id: 1 }];
  it("moves the tapped notification to the top without dropping or mutating the list", () => {
    const result = prioritizeNotification(items, 1);
    expect(result.map(item => item.id)).toEqual([1, 3, 2]);
    expect(items.map(item => item.id)).toEqual([3, 2, 1]);
  });
  it("keeps recent order when there is no matching deep link", () => {
    expect(prioritizeNotification(items, null)).toEqual(items);
    expect(prioritizeNotification(items, 9)).toEqual(items);
    expect(prioritizeNotification(items, 3)).toEqual(items);
  });
  it("shows only valid saved answers in the notification's own vocabulary", () => {
    const start = [["RAINED", "降った"], ["DID_NOT_RAIN", "降らなかった"]] as const;
    expect(savedWeatherAnswerLabel("RAINED", start)).toBe("回答済み：降った");
    expect(savedWeatherAnswerLabel("STOPPED", start)).toBeNull();
    expect(savedWeatherAnswerLabel(undefined, start)).toBeNull();
    expect(savedWeatherAnswerLabel("RAINED", null)).toBeNull();
  });
});

describe("unanswered notifications filter", () => {
  const notifications = [{id:3,type:"RAIN_ENDING"},{id:2,type:"SEVERE"},{id:1,type:"RAIN_START"}];
  const canAnswer = (item: typeof notifications[number]) => item.type !== "SEVERE";
  it("counts only eligible notifications and removes answered notifications", () => {
    const result = selectFeedbackHistory(notifications,{3:"STOPPED"},canAnswer,"unanswered",null);
    expect(result.answerable).toBe(2);
    expect(result.unanswered).toBe(1);
    expect(result.items.map(x=>x.id)).toEqual([1]);
  });
  it("shows the focused notification even when already answered", () => {
    const result = selectFeedbackHistory(notifications,{3:"STOPPED"},canAnswer,"unanswered",3);
    expect(result.items.map(x=>x.id)).toEqual([3,1]);
  });
  it("preserves unsupported alerts in the all-history view", () => {
    const result = selectFeedbackHistory(notifications,{3:"STOPPED"},canAnswer,"all",null);
    expect(result.items.map(x=>x.id)).toEqual([3,2,1]);
  });
  it("immediately removes newly answered items when no Push is focused", () => {
    expect(selectFeedbackHistory(notifications,{3:"STOPPED",1:"RAINED"},canAnswer,"unanswered",null).items).toEqual([]);
  });
});

describe("Push notification ID parsing", () => {
  it("accepts safe positive integer identifiers", () => {
    expect(parsePushNotificationId("1")).toBe(1);
    expect(parsePushNotificationId("123456789")).toBe(123456789);
  });
  it("rejects missing, malformed, negative and ambiguous values", () => {
    for (const value of [null,"","0","-1","001","1.5","1e2","1x"," 1 ","1234567890123456"]) {
      expect(parsePushNotificationId(value)).toBeNull();
    }
  });
});
