import { describe, expect, it } from "vitest";

const simpleData = (name: string, value: string) => `<SimpleData name="${name}">${value}</SimpleData>`;
const placemark = (key: string, name: string, coords: string, extra = "") => `
<Placemark><ExtendedData><SchemaData>
${simpleData("KEY_CODE", key)}
${simpleData("CITY", "108")}
${simpleData("CITY_NAME", "江東区")}
${simpleData("S_NAME", name)}
${simpleData("KIGO_E", extra)}
${simpleData("HCODE", "8101")}
</SchemaData></ExtendedData><Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`;

describe("census town boundary KML contract", () => {
  it("preserves Shiohama names and duplicate polygon parts", () => {
    const source = `<kml><Document>
      ${placemark("13108019001", "塩浜一丁目", "139.80,35.66 139.81,35.66 139.81,35.67 139.80,35.67 139.80,35.66")}
      ${placemark("13108019002", "塩浜二丁目", "139.81,35.66 139.82,35.66 139.82,35.67 139.81,35.67 139.81,35.66")}
      ${placemark("13108019002", "塩浜二丁目", "139.82,35.66 139.821,35.66 139.821,35.661 139.82,35.661 139.82,35.66", "1")}
    </Document></kml>`;
    const marks = source.match(/<Placemark\\b[\\s\\S]*?<\\/Placemark>/g) ?? [];
    const field = (body: string, name: string) => body.match(new RegExp(`<SimpleData\\s+name=["']${name}["'][^>]*>([\\s\\S]*?)<\\/SimpleData>`))?.[1] ?? "";
    const rows = marks.map((body) => ({ key: field(body, "KEY_CODE"), city: field(body, "CITY"), name: field(body, "S_NAME"), duplicate: field(body, "KIGO_E") }));
    expect(rows).toHaveLength(3);
    expect(rows.filter((x) => x.city === "108").map((x) => x.name)).toEqual(["塩浜一丁目", "塩浜二丁目", "塩浜二丁目"]);
    expect(rows.filter((x) => x.key === "13108019002")).toHaveLength(2);
    expect(rows.some((x) => x.duplicate === "1")).toBe(true);
  });
});
