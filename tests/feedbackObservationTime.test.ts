import { describe, expect, it } from "vitest";
import { buildWeatherObservation, observedTimeLabel, localDateTimeInputToIso, observationAsLocalInput, resolveFeedbackObservation, summarizeObservationTimeCoverage, observationVsDeliveryLabel } from "../lib/weather/rain/feedbackObservationTime";

describe("the time rain was actually observed",()=>{
  const now = new Date("2026-10-22T00:00:00.000Z");
  it("keeps unknown time null, never using notification or save time",()=>{
    expect(buildWeatherObservation("unknown","",now)).toEqual({observed_at:null,observed_time_source:"UNKNOWN"});
    expect(observedTimeLabel("UNKNOWN",null)).toBe("確認時刻は未登録");
  });
  it("captures response time only when the user says they checked right now",()=>{
    expect(buildWeatherObservation("now","",now)).toEqual({observed_at:now.toISOString(),observed_time_source:"AT_RESPONSE"});
  });
  it("keeps earlier eyewitness time distinct from response time",()=>{
    const local="2026-10-21T12:40";
    const iso=localDateTimeInputToIso(local);
    expect(iso).not.toBeNull();
    const result=buildWeatherObservation("earlier",local,now);
    expect(result).toEqual({observed_at:iso,observed_time_source:"RECALLED"});
  });
  it("rejects missing, invalid, and future dates",()=>{
    for(const value of ["","2026-10-22","2026-99-99T99:99"]){
      expect(()=>buildWeatherObservation("earlier",value,now)).toThrow();
    }
    const future=new Date(now.getTime()+86400_000);
    const input = [future.getFullYear(),String(future.getMonth()+1).padStart(2,"0"),String(future.getDate()).padStart(2,"0")].join("-")+
      "T"+String(future.getHours()).padStart(2,"0")+":"+String(future.getMinutes()).padStart(2,"0");
    expect(()=>buildWeatherObservation("earlier",input,now)).toThrow();
  });
  it("does not interpret an old feedback update timestamp as observation time",()=>{
    expect(observedTimeLabel(undefined,"2026-10-21T00:00:00Z")).toBe("確認時刻は未登録");
  });
});

describe("answer correction must not falsify observation timing", () => {
  const now = new Date("2026-10-22T00:00:00Z");
  const original = {observed_at:"2026-10-21T09:12:00.000Z",observed_time_source:"RECALLED" as const};
  it("preserves previous observation when only changing rain answer", () => {
    expect(resolveFeedbackObservation(undefined,original,"",now)).toEqual(original);
    expect(resolveFeedbackObservation(undefined,original,"",now)).toBe(original);
  });
  it("preserves the unknown status of older records without inventing time", () => {
    expect(resolveFeedbackObservation(undefined,undefined,"",now)).toEqual({
      observed_at:null,observed_time_source:"UNKNOWN",
    });
  });
  it("only clears a time if the user explicitly chooses unknown", () => {
    expect(resolveFeedbackObservation("unknown",original,"",now)).toEqual({
      observed_at:null,observed_time_source:"UNKNOWN",
    });
  });
  it("shows a previously saved observation in the local datetime picker", () => {
    const input=observationAsLocalInput(original.observed_at);
    expect(input).toMatch(/^2026-10-21T\d{2}:\d{2}$|^2026-10-22T\d{2}:\d{2}$/);
    expect(localDateTimeInputToIso(input)).toEqual(original.observed_at);
  });

  it("uses existing observed time when the recalled-time picker is not touched", () => {
    expect(resolveFeedbackObservation("earlier",original,undefined,now)).toEqual(original);
  });
  it("rejects a date that was explicitly cleared instead of silently restoring the old time", () => {
    expect(() => resolveFeedbackObservation("earlier",original,"",now)).toThrow("invalid_observed_time");
  });
  it("does not invent a recalled-time value when older feedback has no time", () => {
    expect(() => resolveFeedbackObservation("earlier",undefined,"",now)).toThrow("invalid_observed_time");
  });
  it("rejects a timestamp in the future even if it is remembered", () => {
    const future = new Date(now.getTime()+86400_000);
    const input = observationAsLocalInput(future.toISOString());
    expect(() => resolveFeedbackObservation("earlier", undefined,input,now)).toThrow("future_observation");
  });
});

describe("observation-time completeness by watched place", () => {
  const answers={209:"UNKNOWN",210:"ALREADY_DRY",211:"RAINED"};
  const times={
    209:{observed_at:null,observed_time_source:"UNKNOWN" as const},
    210:{observed_at:"2026-10-21T09:12:00Z",observed_time_source:"RECALLED" as const},
    211:{observed_at:"2026-10-22T00:00:00Z",observed_time_source:"AT_RESPONSE" as const},
  };
  it("separates time availability from weather unknown", () => {
    expect(summarizeObservationTimeCoverage([209,210,211],answers,times))
      .toEqual({answered:3,withTime:2,withoutTime:1});
  });
  it("counts only the selected place's history", () => {
    expect(summarizeObservationTimeCoverage([209,210],answers,times))
      .toEqual({answered:2,withTime:1,withoutTime:1});
  });
  it("does not invent observation time for older answers", () => {
    expect(summarizeObservationTimeCoverage([209,210],answers,{}))
      .toEqual({answered:2,withTime:0,withoutTime:2});
  });
});

describe("notification time compared to eyewitness time", () => {
  const delivery="2026-10-22T00:00:00.000Z";
  it("shows time gap only, never an accuracy judgment", () => {
    expect(observationVsDeliveryLabel(delivery,"2026-10-22T00:25:00.000Z"))
      .toBe("通知から25分後に確認");
    expect(observationVsDeliveryLabel(delivery,"2026-10-21T23:55:00.000Z"))
      .toBe("通知より5分前に確認");
  });
  it("handles hours, nearly simultaneous observations and unknown time", () => {
    expect(observationVsDeliveryLabel(delivery,"2026-10-22T02:05:00.000Z"))
      .toBe("通知から2時間5分後に確認");
    expect(observationVsDeliveryLabel(delivery,delivery)).toBe("通知とほぼ同じ時刻に確認");
    expect(observationVsDeliveryLabel(delivery,null)).toBeNull();
    expect(observationVsDeliveryLabel("invalid",delivery)).toBeNull();
  });
});
