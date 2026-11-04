import {expect,test} from "vitest";
import {classifyEvidenceRetention,inspectStoredEvidenceRetention,summarizeEvidenceRetention,type RetentionRecord} from "../lib/research/forecastEvidenceRetention";
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

test("future-dated evidence is reviewed, not silently expired",()=>{
  expect(classifyEvidenceRetention(record,"2026-10-31T00:00:00Z")).toBe("REVIEW");
});

test("actual diagnostic schema without expiry is never eligible for deletion",()=>{
  const row={checked_at:"2026-10-01T00:00:00Z",diagnostic:{forecastEvidenceCompact:{schemaVersion:1,frames:[]}}};
  expect(inspectStoredEvidenceRetention(row,"2026-12-01T00:00:00Z")).toBe("REVIEW");
});
test("legacy or unknown-version diagnostic is preserved untouched",()=>{
  expect(inspectStoredEvidenceRetention({checked_at:"2026-10-01T00:00:00Z",diagnostic:null},"2026-12-01T00:00:00Z")).toBe("KEEP");
  expect(inspectStoredEvidenceRetention({checked_at:"2026-10-01T00:00:00Z",diagnostic:{forecastEvidenceCompact:{schemaVersion:2}}},"2026-12-01T00:00:00Z")).toBe("KEEP");
});

test("dry-run summary never marks actual schema rows as eligible",()=>{
  const rows=[
    {checked_at:"2026-10-01T00:00:00Z",diagnostic:null},
    {checked_at:"2026-10-01T00:00:00Z",diagnostic:{forecastEvidenceCompact:{schemaVersion:1,frames:[]}}},
    {checked_at:"2026-10-01T00:00:00Z",diagnostic:{forecastEvidenceCompact:{schemaVersion:99,frames:[]}}},
  ];
  expect(summarizeEvidenceRetention(rows,"2026-11-03T00:00:00Z")).toEqual({
    total:3,keep:2,review:1,eligible:0,
  });
});
