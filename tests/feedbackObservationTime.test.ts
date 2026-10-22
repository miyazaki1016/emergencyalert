import { describe, expect, it } from "vitest";
import { buildWeatherObservation, observedTimeLabel, localDateTimeInputToIso } from "../lib/weather/rain/feedbackObservationTime";

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
