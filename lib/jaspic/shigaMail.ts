/**
 * JASPIC Shiga text renderer, transcribed from legacy HomeController.cs
 * suspicious_person_shiga_mail. No SMTP transport is exposed here.
 * MIME parity is NOT established until a legacy .eml is compared.
 */
export type ShigaRecord = Record<string, string | null | undefined>;
const names = ["声かけ", "つきまとい", "容姿撮影", "身体接触", "陰部露出", "－－－", "－－－", "－－－", "その他"];
const str = (v: string | null | undefined) => v ?? "";
export const SHIGA_SUBJECT = " [JASPIC-NES] 滋賀県警専用ツール";
export const SHIGA_FROM = "hppmap@kishibojim.online";
export const SHIGA_TO = "getter01@jaspic-nes.net";
export const SHIGA_CC = "kishibojim@gmail.com";
export function renderShigaText(current: ShigaRecord, previous: ShigaRecord | null, cityName: string): string {
  const update = previous !== null;
  const changed = (key: string) => update && str(previous[key]) !== str(current[key]) ? "●更新" : "";
  const lines: string[] = [
    "----------------------------------------",
    "[JASPIC - NES] 滋賀県警アラート（" + (update ? "更新" : "新規") + "）" + (update ? "●" : ""),
    "----------------------------------------", "",
    "滋賀県警が新しい不審者情報を公表した可能性があります。",
    "https://map.police.shiga.dsvc.jp", "", "{",
  ];
  const field = (key: string, description: string) =>
    lines.push('"' + key + '":"' + str(current[key]) + '"　→' + description + changed(key));
  field("id", "管理番号");
  field("city_code", cityName);
  field("address", "発生場所");
  field("address_code", "発生場所");
  field("latitude", "緯度（参考程度）");
  field("longitude", "経度（参考程度）");
  field("police_station", "管轄警察署");
  const index = Number(current.case_type) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= names.length) throw new Error("invalid Shiga case_type");
  field("case_type", names[index]);
  field("occurrence_dt", "発生日時");
  field("accident_situation", "発生状況");
  field("criminal_car", "不審者の移動手段");
  field("criminal_feature", "不審者の特徴");
  field("resolution", current.resolution === "0" ? "未解決" : "解決済み");
  lines.push("}", "", "データ中の緯度経度をグーグルマップで開く",
    "https://www.google.com/maps?q=" + str(current.latitude) + "," + str(current.longitude),
    "", "---", "JASPIC - NES（滋賀県警専用ツール）",
    "↓ウェブサイト掲載情報とURLをここにコピペしてください↓",
    "---", "https://map.police.shiga.dsvc.jp");
  return lines.join("\r\n") + "\r\n";
}
