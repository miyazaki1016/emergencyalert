import { describe, expect, it } from "vitest";
import fixtures from "./fixtures.json";
import expected from "./expected.json";
import { generateMail, month, type Kind, type RecordData } from "../../supabase/functions/_shared/jaspic/mail";
import { renderShigaText } from "../../lib/jaspic/shigaMail";

describe("legacy C# body byte parity", () => {
  fixtures.forEach((f, index) => it(`${f.kind} fixture ${index}`, () => {
    const mail = generateMail(f.kind as Kind, f.current as RecordData, f.previous as RecordData | null, f);
    expect(Buffer.from(mail.body, "utf8")).toEqual(Buffer.from(expected[index].body, "utf8"));
    expect(mail.subject).toBe(` [JASPIC-NES] ${f.kind === "shiga-person" ? "滋賀" : "広島"}県警専用ツール`);
    expect(mail.from).toBe("hppmap@kishibojim.online");
    expect(mail.to).toBe("getter01@jaspic-nes.net");
    expect(mail.cc).toBe(f.kind === "shiga-person" ? "kishibojim@gmail.com" : "miyazaki1016@me.com");
    expect(mail.body.replaceAll("\r\n", "")).not.toMatch(/[\r\n]/);
    expect(mail.body.endsWith("\r\n")).toBe(true);
    if (f.kind === "shiga-person") expect(renderShigaText(f.current, f.previous, f.cityName)).toBe(mail.body);
  }));
  it("rejects invalid dates and categories rather than silently changing output", () => {
    expect(() => month("2026/02/30")).toThrow();
    const f = fixtures.find(f => f.kind === "shiga-person")!;
    expect(() => generateMail("shiga-person", { ...f.current, case_type: "10" } as RecordData, null, f)).toThrow();
  });
});
