export const N03_DATASET_YEAR = 2026;
export const N03_DATASET_DATE = "20260101";

export function n03PrefectureCode(code: string) {
  if (!/^\d{1,2}$/.test(code)) throw new Error("Invalid prefecture code");
  return code.padStart(2, "0");
}

export function n03PrefectureArchiveName(code: string) {
  const prefectureCode = n03PrefectureCode(code);
  return `N03-${N03_DATASET_DATE}_${prefectureCode}_GML.zip`;
}

export function n03PrefectureGeoJsonName(code: string) {
  const prefectureCode = n03PrefectureCode(code);
  return `N03-${N03_DATASET_DATE}_${prefectureCode}.geojson`;
}

export function n03PrefectureArchiveUrl(code: string) {
  const name = n03PrefectureArchiveName(code);
  return `https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-${N03_DATASET_YEAR}/${name}`;
}
