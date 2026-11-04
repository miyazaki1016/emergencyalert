import { describe, expect, it } from "vitest";
import { renderShigaText, SHIGA_SUBJECT, SHIGA_CC } from "../lib/jaspic/shigaMail";

const sample = {
  id:"TEST-001", city_code:"001", address:"架空町", address_code:"A",
  latitude:"35.0", longitude:"136.0", police_station:"架空署",
  case_type:"1", occurrence_dt:"2026/11/05 10:00:00",
  accident_situation:"架空の事案", criminal_car:"徒歩",
  criminal_feature:"不明", resolution:"0"
};

describe("JASPIC Shiga no-send rendering safeguards", () => {
  it("preserves leading subject space and distinct Shiga CC", () => {
    expect(SHIGA_SUBJECT.startsWith(" ")).toBe(true);
    expect(SHIGA_CC).toBe("kishibojim@gmail.com");
  });
  it("preserves CRLF, trailing CRLF and Shiga field punctuation", () => {
    const body=renderShigaText(sample,null,"架空市");
    expect(body).toContain('"id":"TEST-001"　→管理番号\r\n');
    expect(body).toContain("[JASPIC - NES] 滋賀県警アラート（新規）\r\n");
    expect(body).toContain("https://www.google.com/maps?q=35.0,136.0\r\n");
    expect(body.endsWith("https://map.police.shiga.dsvc.jp\r\n")).toBe(true);
    expect(body.replace(/\r\n/g,"")).not.toMatch(/[\r\n]/);
  });
  it("marks changed fields only on updates", () => {
    const body=renderShigaText({...sample,address:"変更後"},sample,"架空市");
    expect(body).toContain("アラート（更新）●\r\n");
    expect(body).toContain('"address":"変更後"　→発生場所●更新\r\n');
    expect(body).not.toContain('"city_code":"001"　→架空市●更新');
  });
  it("fails closed on invalid category", () => {
    expect(()=>renderShigaText({...sample,case_type:"99"},null,"架空市")).toThrow();
  });
});
