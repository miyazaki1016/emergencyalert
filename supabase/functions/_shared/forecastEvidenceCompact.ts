/**
 * Compact research history of every issued forecast frame.
 * Tuples preserve base/valid time independently; no frame sampling.
 * Not used for notification decisions.
 */
export type ForecastInput = {
  baseTime?: string; validTime?: string; status?: string;
  intensityClass?: string | null;
  rgba?: {r:number;g:number;b:number;a:number} | null;
};
export type ForecastTuple = [string|null,string|null,string|null,string|null,[number,number,number,number]|null];
export type CompactEvidence = {
  schemaVersion: 1;
  state: "COMPLETE" | "PARTIAL" | "MISSING";
  reason: string | null;
  expectedFrames: number | null;
  receivedFrames: number;
  usableFrames: number;
  frames: ForecastTuple[];
};
export function packForecastEvidence(
  forecast: ForecastInput[] | undefined,
  expectedFrameCount: number | null | undefined,
): CompactEvidence {
  const input = forecast ?? [];
  const expectedFrames = Number.isInteger(expectedFrameCount) && Number(expectedFrameCount)>0 ? Number(expectedFrameCount) : null;
  const frames: ForecastTuple[] = input.map(f=>[
    f.baseTime??null, f.validTime??null, f.status??null, f.intensityClass??null,
    f.rgba ? [f.rgba.r,f.rgba.g,f.rgba.b,f.rgba.a] : null,
  ]);
  const fieldsComplete = input.every(f=>typeof f.baseTime==="string"&&f.baseTime.length>0&&typeof f.validTime==="string"&&f.validTime.length>0&&typeof f.status==="string");
  const usableFrames = input.filter(f=>typeof f.baseTime==="string"&&f.baseTime.length>0&&typeof f.validTime==="string"&&f.validTime.length>0&&(f.status==="RAIN"||f.status==="NO_RAIN")).length;
  let reason: string|null = null;
  if (frames.length===0) reason="NO_FORECAST_FRAMES";
  else if (!fieldsComplete) reason="INCOMPLETE_FRAME_FIELDS";
  else if (expectedFrames===null) reason="EXPECTED_COUNT_UNKNOWN";
  else if (frames.length!==expectedFrames) reason="FRAME_COUNT_MISMATCH";
  else if (usableFrames!==frames.length) reason="UNUSABLE_FRAME_STATUS";
  return {
    schemaVersion:1,
    state:frames.length===0?"MISSING":reason?"PARTIAL":"COMPLETE",
    reason,expectedFrames,receivedFrames:frames.length,usableFrames,frames,
  };
}

/** Decode a stored evidence payload for research and replay; reject malformed versions. */
export function unpackForecastEvidence(value: unknown): {
  state: CompactEvidence["state"];
  expectedFrames: number | null;
  frames: Array<Required<Pick<ForecastInput,"baseTime"|"validTime"|"status">> & Pick<ForecastInput,"intensityClass"|"rgba">>;
} | null {
  if (!value || typeof value!=="object") return null;
  const data=value as Partial<CompactEvidence>;
  if (data.schemaVersion!==1 || !Array.isArray(data.frames) ||
      !["COMPLETE","PARTIAL","MISSING"].includes(String(data.state))) return null;
  const frames: Array<Required<Pick<ForecastInput,"baseTime"|"validTime"|"status">> & Pick<ForecastInput,"intensityClass"|"rgba">> = [];
  for(const row of data.frames){
    if(!Array.isArray(row)||row.length!==5) return null;
    const [baseTime,validTime,status,intensityClass,rgba]=row;
    if(baseTime!==null&&typeof baseTime!=="string"||validTime!==null&&typeof validTime!=="string"||
       status!==null&&typeof status!=="string"||intensityClass!==null&&typeof intensityClass!=="string") return null;
    if(rgba!==null&&(!Array.isArray(rgba)||rgba.length!==4||rgba.some(channel=>!Number.isInteger(channel)||channel<0||channel>255))) return null;
    frames.push({
      baseTime:baseTime??"",validTime:validTime??"",status:status??"",
      intensityClass,rgba:rgba===null?null:{r:rgba[0],g:rgba[1],b:rgba[2],a:rgba[3]},
    });
  }
  const expectedFrames = Number.isInteger(data.expectedFrames)&&Number(data.expectedFrames)>0 ? Number(data.expectedFrames) : null;
  return {state:data.state as CompactEvidence["state"],expectedFrames,frames};
}

/** Decode only schema-v1 evidence; reject damaged tuples instead of treating missing data as dry. */
export function unpackForecastEvidence(value: unknown): {
  state: CompactEvidence["state"];
  reason: string|null;
  expectedFrames: number|null;
  frames: ForecastInput[];
} | null {
  if (typeof value!=="object"||value===null||Array.isArray(value)) return null;
  const v=value as Record<string,unknown>;
  if (v.schemaVersion!==1||!Array.isArray(v.frames)) return null;
  if (v.state!=="COMPLETE"&&v.state!=="PARTIAL"&&v.state!=="MISSING") return null;
  if (!(v.expectedFrames===null||(typeof v.expectedFrames==="number"&&Number.isInteger(v.expectedFrames)&&v.expectedFrames>0))) return null;
  if (typeof v.receivedFrames!=="number"||v.receivedFrames!==v.frames.length) return null;
  const frames:ForecastInput[]=[];
  for(const unknownFrame of v.frames){
    if (!Array.isArray(unknownFrame)||unknownFrame.length!==5) return null;
    const [baseTime,validTime,status,intensityClass,rgba]=unknownFrame;
    if (![baseTime,validTime,status,intensityClass].every(x=>x===null||typeof x==="string")) return null;
    if (rgba!==null&&(!Array.isArray(rgba)||rgba.length!==4||!rgba.every(x=>typeof x==="number"&&Number.isInteger(x)&&x>=0&&x<=255))) return null;
    frames.push({
      baseTime:baseTime??undefined,validTime:validTime??undefined,
      status:status??undefined,intensityClass:intensityClass??null,
      rgba:rgba===null?null:{r:rgba[0],g:rgba[1],b:rgba[2],a:rgba[3]},
    });
  }
  const checked=packForecastEvidence(frames,v.expectedFrames as number|null);
  if (checked.state!==v.state||checked.receivedFrames!==v.receivedFrames||checked.usableFrames!==v.usableFrames||checked.reason!==v.reason) return null;
  return {state:checked.state,reason:checked.reason,expectedFrames:checked.expectedFrames,frames};
}
