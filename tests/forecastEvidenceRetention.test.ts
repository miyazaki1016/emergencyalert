import {expect,test} from "vitest";
import {classifyEvidenceRetention,type RetentionRecord} from "../lib/research/forecastEvidenceRetention";
const record:RetentionRecord={
  schemaVersion:1,recordedAt:"2026-11-01T00:00:00Z",expiresAt:"2026-11-08T00:00:00Z",
  notificationEvidenceLinked:false,preservationHold:false,
};
test("keeps compact evidence until expiration",()=>{
  expect(classifyEvidenceRetention(record,"2026-11-07T23:59:59Z")).toBe("KEEP");
  expect(classifyEvidenceRetention(record,"2026-11-08T00:00:00Z")).toBe("ELIGIBLE");
});
test("never expires legacy diagnostic data",()=>{
  expect(classifyEvidenceRetention({...record,schemaVersion:null},"2026-12-01T00:00:00Z")).toBe("KEEP");
});
test("keeps linked notification evidence even past expiry",()=>{
  expect(classifyEvidenceRetention({...record,notificationEvidenceLinked:true},"2026-12-01T00:00:00Z")).toBe("KEEP");
});
test("keeps records under preservation hold",()=>{
  expect(classifyEvidenceRetention({...record,preservationHold:true},"2026-12-01T00:00:00Z")).toBe("KEEP");
});
test("does not silently expire records without a valid expiry",()=>{
  expect(classifyEvidenceRetention({...record,expiresAt:null},"2026-12-01T00:00:00Z")).toBe("REVIEW");
  expect(classifyEvidenceRetention({...record,expiresAt:"bad"},"2026-12-01T00:00:00Z")).toBe("REVIEW");
  expect(classifyEvidenceRetention({...record,expiresAt:"2026-10-31T00:00:00Z"},"2026-12-01T00:00:00Z")).toBe("REVIEW");
});
test("invalid clock needs review",()=>{
  expect(classifyEvidenceRetention(record,"bad")).toBe("REVIEW");
});
