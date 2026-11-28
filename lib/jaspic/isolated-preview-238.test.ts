import { describe, expect, it } from "vitest";
import { extractIsolatedCandidates } from "./isolated-preview-238";

const valid = () => ({
  mode: "READ_ONLY", countsComplete: true, provinceErrors: [], total: 34,
  provinces: [
    { province: "hiroshima", count: 31, keys: Array.from({length:31},(_,i)=>`hiroshima-person:dryrun-${i}`) },
    { province: "shiga", count: 3, keys: Array.from({length:3},(_,i)=>`shiga-person:dryrun-${i}`) },
  ],
});

describe("isolated preview 34 candidate contract", () => {
  it("extracts exactly 31 Hiroshima + 3 Shiga", () => {
    const result = extractIsolatedCandidates(valid());
    expect(result).toHaveLength(34);
    expect(result.filter(x=>x.province==="shiga")).toHaveLength(3);
  });
  it("rejects incomplete preview", () => {
    expect(() => extractIsolatedCandidates({...valid(),countsComplete:false})).toThrow();
  });
  it("rejects missing record", () => {
    const p=valid();p.provinces[1].keys.pop();p.provinces[1].count=2;
    expect(() => extractIsolatedCandidates(p)).toThrow();
  });
  it("rejects duplicate keys", () => {
    const p=valid();p.provinces[0].keys[1]=p.provinces[0].keys[0];
    expect(() => extractIsolatedCandidates(p)).toThrow();
  });
  it("rejects wrong province and total", () => {
    const p=valid();p.provinces[1].keys[0]="hiroshima-person:wrong";
    expect(() => extractIsolatedCandidates(p)).toThrow();
    expect(() => extractIsolatedCandidates({...valid(),total:33})).toThrow();
  });
});
