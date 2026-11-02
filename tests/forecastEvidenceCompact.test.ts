import { expect, test } from "vitest";
import { packForecastEvidence, unpackForecastEvidence } from "../supabase/functions/_shared/forecastEvidenceCompact.ts";

const frame = {
  baseTime:"20261102110000",validTime:"20261102113000",
  status:"RAIN",intensityClass:"30_TO_50",rgba:{r:12,g:34,b:56,a:255},
};
test("normal diagnostic-null API forecast packs complete losslessly",()=>{
  expect(packForecastEvidence([frame],1)).toEqual({
    schemaVersion:1,state:"COMPLETE",reason:null,expectedFrames:1,
    receivedFrames:1,usableFrames:1,
    frames:[[frame.baseTime,frame.validTime,"RAIN","30_TO_50",[12,34,56,255]]],
  });
});
test("retains all forecast issuances and distinct valid times",()=>{
  const frames=[frame,{...frame,baseTime:"20261102110500"},{...frame,validTime:"20261102113500"}];
  const packed=packForecastEvidence(frames,3);
  expect(packed.frames).toHaveLength(3);
  expect(packed.frames[0][0]).not.toBe(packed.frames[1][0]);
  expect(packed.frames[0][1]).not.toBe(packed.frames[2][1]);
});
test("unknown expected count is not complete",()=>{
  expect(packForecastEvidence([frame],null)).toMatchObject({state:"PARTIAL",reason:"EXPECTED_COUNT_UNKNOWN"});
});
test("missing forecast is distinct from dry",()=>{
  expect(packForecastEvidence([],6)).toMatchObject({state:"MISSING",reason:"NO_FORECAST_FRAMES"});
});
test("mismatched count is incomplete",()=>{
  expect(packForecastEvidence([frame],6)).toMatchObject({state:"PARTIAL",reason:"FRAME_COUNT_MISMATCH"});
});
test("fetch error keeps frame but is incomplete",()=>{
  const result=packForecastEvidence([{...frame,status:"FETCH_ERROR",rgba:null}],1);
  expect(result).toMatchObject({state:"PARTIAL",reason:"UNUSABLE_FRAME_STATUS",receivedFrames:1,usableFrames:0});
  expect(result.frames[0][2]).toBe("FETCH_ERROR");
});
test("transparent no-rain frame remains complete",()=>{
  expect(packForecastEvidence([{...frame,status:"NO_RAIN",intensityClass:null,rgba:{r:0,g:0,b:0,a:0}}],1)).toMatchObject({state:"COMPLETE",usableFrames:1});
});
test("missing time fields are retained with null markers",()=>{
  const result=packForecastEvidence([{status:"RAIN"}],1);
  expect(result).toMatchObject({state:"PARTIAL",reason:"INCOMPLETE_FRAME_FIELDS",receivedFrames:1});
  expect(result.frames[0]).toEqual([null,null,"RAIN",null,null]);
});

test("compact evidence round trips timestamps, rain intensity and rgba",()=>{
  const input=[frame,{...frame,baseTime:"20261102110500",validTime:"20261102113500",status:"NO_RAIN",intensityClass:null,rgba:{r:0,g:0,b:0,a:0}}];
  const decoded=unpackForecastEvidence(JSON.parse(JSON.stringify(packForecastEvidence(input,2))));
  expect(decoded).toMatchObject({state:"COMPLETE",expectedFrames:2});
  expect(decoded?.frames).toEqual(input);
});
test("partially unavailable forecast retains failure marker through replay",()=>{
  const input=[{...frame,status:"FETCH_ERROR",intensityClass:null,rgba:null}];
  const decoded=unpackForecastEvidence(packForecastEvidence(input,1));
  expect(decoded?.state).toBe("PARTIAL");
  expect(decoded?.frames).toEqual(input);
});
test("rejects unknown schema version and invalid rgba",()=>{
  const packed=packForecastEvidence([frame],1);
  expect(unpackForecastEvidence({...packed,schemaVersion:2})).toBeNull();
  expect(unpackForecastEvidence({...packed,frames:[[frame.baseTime,frame.validTime,"RAIN","30_TO_50",[300,0,0,255]]]})).toBeNull();
});
test("legacy missing evidence is not silently treated as a dry forecast",()=>{
  expect(unpackForecastEvidence(null)).toBeNull();
});

test("reconstructs every original time, status, intensity and RGBA",()=>{
  const input=[frame,{...frame,baseTime:"20261102110500",validTime:"20261102113500",rgba:null}, {...frame,status:"NO_RAIN",intensityClass:null,rgba:{r:0,g:0,b:0,a:0}}];
  const decoded=unpackForecastEvidence(packForecastEvidence(input,3));
  expect(decoded?.state).toBe("COMPLETE");
  expect(decoded?.frames).toEqual(input);
});
test("missing or unusable frames round-trip without becoming no-rain",()=>{
  const input=[{...frame,status:"FETCH_ERROR",rgba:null},{status:"UNKNOWN_PIXEL"}];
  const encoded=packForecastEvidence(input,2);
  expect(unpackForecastEvidence(encoded)?.frames).toEqual([input[0],{baseTime:undefined,validTime:undefined,status:"UNKNOWN_PIXEL",intensityClass:null,rgba:null}]);
  expect(unpackForecastEvidence(encoded)?.state).toBe("PARTIAL");
});
test("rejects incompatible schema version and corrupted RGBA",()=>{
  const packed=packForecastEvidence([frame],1);
  expect(unpackForecastEvidence({...packed,schemaVersion:2})).toBeNull();
  expect(unpackForecastEvidence({...packed,frames:[[frame.baseTime,frame.validTime,"RAIN","30_TO_50",[300,0,0,255]]]})).toBeNull();
});
test("rejects falsified completeness metadata",()=>{
  const packed=packForecastEvidence([frame],1);
  expect(unpackForecastEvidence({...packed,state:"PARTIAL"})).toBeNull();
  expect(unpackForecastEvidence({...packed,receivedFrames:2})).toBeNull();
});
