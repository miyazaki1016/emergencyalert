// Port of legacy C# body builders. Transport intentionally absent.
export type RecordData = Record<string, string | null>;
export type MailContext = { cityName: string; stationName: string };
export type Kind = "hiroshima-crime" | "hiroshima-person" | "shiga-person";
export const fields: Record<Kind, string[]> = {
  "hiroshima-crime": [
    "occurrence_date_from",
    "latitude",
    "longitude",
    "id",
    "city_code",
    "address",
    "police_station",
    "crime_cd",
    "case_type",
    "location_type",
    "damage_goods",
    "occurrences",
    "offender",
    "occurrence_date_to",
    "date_from_format",
    "date_to_format"
  ],
  "hiroshima-person": [
    "occurrence_dt",
    "latitude",
    "longitude",
    "id",
    "city_code",
    "address",
    "police_station",
    "case_type",
    "crime_cd",
    "accident_situation",
    "victim",
    "criminal_age",
    "criminal_feature",
    "resolution",
    "resolution_info"
  ],
  "shiga-person": [
    "occurrence_dt",
    "id",
    "city_code",
    "address",
    "address_code",
    "latitude",
    "longitude",
    "police_station",
    "case_type",
    "accident_situation",
    "criminal_car",
    "criminal_feature",
    "resolution"
  ]
};
export function month(value: string | null): string {
  const m = /^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})(?:[ T]|$)/.exec(value ?? "");
  if (!m || +m[2] < 1 || +m[2] > 12 || +m[3] < 1 || +m[3] > new Date(Date.UTC(+m[1],+m[2],0)).getUTCDate()) throw new Error("Invalid occurrence date");
  return m[1].slice(2) + "." + m[2].padStart(2,"0");
}
export function generateMail(kind: Kind, current: RecordData, db: RecordData | null, context: MailContext) {
  // C# string concatenation renders null as empty, while comparisons preserve null.
  const json = new Proxy(current, { get: (target, key: string) => target[key] ?? "" });
  const city = {city_name: context.cityName};
  const police_station = {station_name: context.stationName};
  const feature = {properties: {full_name: context.cityName}};
  const caseName = ["声かけ","つきまとい","容姿撮影","身体接触","陰部露出","－－－","－－－","－－－","その他"];
  if (kind === "shiga-person" && (!/^\+?\d+$/.test((current.case_type ?? "").trim()) || Number(current.case_type) < 1 || Number(current.case_type) > 9)) throw new Error("Invalid Shiga category");
  const marker = (key: string) => db !== null && db[key] !== current[key] ? "●更新" : "";
  let mailbody = "";
  switch(kind) {
    case "hiroshima-crime": {
      const months = month(current.occurrence_date_from);
mailbody = "----------------------------------------\r\n";
            mailbody += "[JASPIC - NES] 広島県警アラート（" + (db === null ? "新規" : "更新") + "）" + (db === null ? "" : "●") + "\r\n";
            mailbody += "----------------------------------------\r\n";
            mailbody += "\r\n";
            mailbody += "広島県警が新しい犯罪情報を公表した可能性があります。\r\n";
            mailbody += "未配信情報の場合、県警サイトを確認して対応をお願いします。\r\n";
            mailbody += "https://map.police.hiroshima.dsvc.jp/?lat=" + json.latitude + "&lon=" + json.longitude + "&zoom=14&mode=0&period=1&months=" + months + "\r\n";
            mailbody += "\r\n";
            mailbody += "{\r\n";
            mailbody += "\"id\":\"" + json.id + "\",　→管理番号" + marker("id") + "\r\n";
            mailbody += "\"city_code\":\"" + json.city_code + "\",　→" + city.city_name + marker("city_code") + "\r\n";
            mailbody += "\"address\":\"" + json.address + "\",　→町域" + marker("address") + "\r\n";
            mailbody += "\"latitude\":\"" + json.latitude + "\",　→緯度（参考程度）" + marker("latitude") + "\r\n";
            mailbody += "\"longitude\":\"" + json.longitude + "\",　→経度（参考程度）" + marker("longitude") + "\r\n";
            mailbody += "\"police_station\":\"" + json.police_station + "\",　→" + police_station.station_name + (!police_station.station_name.includes("警察署") ? "警察署" : "") + marker("police_station") + "\r\n";
            mailbody += "\"crime_cd\":\"" + json.crime_cd + "\",　→不明" + marker("crime_cd") + "\r\n";
            mailbody += "\"case_type\":\"" + json.case_type + "\",　→カテゴリ" + marker("case_type") + "\r\n";
            mailbody += "\"location_type\":\"" + json.location_type + "\",　→発生場所かな？" + marker("location_type") + "\r\n";
            mailbody += "\"damage_goods\":\"" + json.damage_goods + "\",　→被害品かな？" + marker("damage_goods") + "\r\n";
            mailbody += "\"occurrences\":\"" + json.occurrences + "\",　→被害品" + marker("occurrences") + "\r\n";
            mailbody += "\"offender\":\"" + json.offender + "\",　→加害者" + marker("offender") + "\r\n";
            mailbody += "\"occurrence_date_from\":\"" + json.occurrence_date_from + "\",　→発生日時（から）" + marker("occurrence_date_from") + "\r\n";
            mailbody += "\"occurrence_date_to\":\"" + json.occurrence_date_to + "\",　→発生日時（まで）" + marker("occurrence_date_to") + "\r\n";
            mailbody += "\"date_from_format\":\"" + json.date_from_format + "\",　→不明" + marker("date_from_format") + "\r\n";
            mailbody += "\"date_to_format\":\"" + json.date_to_format + "\" →不明" + marker("date_to_format") + "\r\n";
            mailbody += "}\r\n";
            mailbody += "\r\n";
            mailbody += "---\r\n";
            mailbody += "JASPIC - NES（広島県警専用ツール）\r\n";
            mailbody += "↓ウェブサイト掲載情報とURLをここにコピペしてください↓\r\n";
            mailbody += "---\r\n";
      break;
    }
    case "hiroshima-person": {
      const months = month(current.occurrence_dt);
mailbody = "----------------------------------------\r\n";
            mailbody += "[JASPIC - NES] 広島県警アラート（" + (db === null ? "新規" : "更新") + "）" + (db === null ? "" : "●") + "\r\n";
            mailbody += "----------------------------------------\r\n";
            mailbody += "\r\n";
            mailbody += "広島県警が新しい不審者情報を公表した可能性があります。\r\n";
            mailbody += "未配信情報の場合、県警サイトを確認して対応をお願いします。\r\n";
            mailbody += "https://map.police.hiroshima.dsvc.jp/?lat=" + json.latitude + "&lon=" + json.longitude + "&zoom=14&mode=1&period=1&months=" + months + "\r\n";
            mailbody += "\r\n";
            mailbody += "{\r\n";
            mailbody += "\"id\":\"" + json.id + "\",　→管理番号" + marker("id") + "\r\n";
            mailbody += "\"city_code\":\"" + json.city_code + "\",　→" + city.city_name + marker("city_code") + "\r\n";
            mailbody += "\"address\":\"" + json.address + "\",　→発生場所" + marker("address") + "\r\n";
            mailbody += "\"latitude\":\"" + json.latitude + "\",　→緯度（参考程度）" + marker("latitude") + "\r\n";
            mailbody += "\"longitude\":\"" + json.longitude + "\",　→経度（参考程度）" + marker("longitude") + "\r\n";
            mailbody += "\"police_station\":\"" + json.police_station + "\",　→" + police_station.station_name + (!police_station.station_name.includes("警察署") ? "警察署" : "") + marker("police_station") + "\r\n";
            mailbody += "\"case_type\":\"" + json.case_type + "\",　→カテゴリ" + marker("case_type") + "\r\n";
            mailbody += "\"crime_cd\":\"" + json.crime_cd + "\",　→不明" + marker("crime_cd") + "\r\n";
            mailbody += "\"occurrence_dt\":\"" + json.occurrence_dt + "\",　→発生日時" + marker("occurrence_dt") + "\r\n";
            mailbody += "\"accident_situation\":\"" + json.accident_situation + "\",　→事案概要" + marker("accident_situation") + "\r\n";
            mailbody += "\"victim\":\"" + json.victim + "\",　→被害者" + marker("victim") + "\r\n";
            mailbody += "\"criminal_age\":\"" + json.criminal_age + "\",　→加害者年齢" + marker("criminal_age") + "\r\n";
            mailbody += "\"criminal_feature\":\"" + json.criminal_feature + "\",　→加害者特徴" + marker("criminal_feature") + "\r\n";
            mailbody += "\"resolution\":\"" + (json.resolution == "1" ? "検挙" : "") + (json.resolution == "2" ? "指導・警告" : "") + (json.resolution == "9" ? "その他" : "") + "\",　→解決" + marker("resolution") + "\r\n";
            mailbody += "\"resolution_info\":\"" + json.resolution_info + "\" →不明" + marker("resolution_info") + "\r\n";
            mailbody += "}\r\n";
            mailbody += "\r\n";
            mailbody += "---\r\n";
            mailbody += "JASPIC - NES（広島県警専用ツール）\r\n";
            mailbody += "↓ウェブサイト掲載情報とURLをここにコピペしてください↓\r\n";
            mailbody += "---\r\n";
      break;
    }
    case "shiga-person": {
      const months = month(current.occurrence_dt);
mailbody = "----------------------------------------\r\n";
            mailbody += "[JASPIC - NES] 滋賀県警アラート（" + (db === null ? "新規" : "更新") + "）" + (db === null ? "" : "●") + "\r\n";
            mailbody += "----------------------------------------\r\n";
            mailbody += "\r\n";
            mailbody += "滋賀県警が新しい不審者情報を公表した可能性があります。\r\n";
            mailbody += "https://map.police.shiga.dsvc.jp\r\n";
            mailbody += "\r\n";
            mailbody += "{\r\n";
            mailbody += "\"id\":\"" + json.id + "\"　→管理番号" + marker("id") + "\r\n";
            mailbody += "\"city_code\":\"" + json.city_code + "\"　→" + feature.properties.full_name + marker("city_code") + "\r\n";
            mailbody += "\"address\":\"" + json.address + "\"　→発生場所" + marker("address") + "\r\n";
            mailbody += "\"address_code\":\"" + json.address_code + "\"　→発生場所" + marker("address_code") + "\r\n";
            mailbody += "\"latitude\":\"" + json.latitude + "\"　→緯度（参考程度）" + marker("latitude") + "\r\n";
            mailbody += "\"longitude\":\"" + json.longitude + "\"　→経度（参考程度）" + marker("longitude") + "\r\n";
            mailbody += "\"police_station\":\"" + json.police_station + "\"　→管轄警察署" + marker("police_station") + "\r\n";
            mailbody += "\"case_type\":\"" + json.case_type + "\"　→" + caseName[Number(json.case_type) - 1] + marker("case_type") + "\r\n";
            mailbody += "\"occurrence_dt\":\"" + json.occurrence_dt + "\"　→発生日時" + marker("occurrence_dt") + "\r\n";
            mailbody += "\"accident_situation\":\"" + json.accident_situation + "\"　→発生状況" + marker("accident_situation") + "\r\n";
            mailbody += "\"criminal_car\":\"" + json.criminal_car + "\"　→不審者の移動手段" + marker("criminal_car") + "\r\n";
            mailbody += "\"criminal_feature\":\"" + json.criminal_feature + "\"　→不審者の特徴" + marker("criminal_feature") + "\r\n";
            mailbody += "\"resolution\":\"" + json.resolution + "\"　→" + (json.resolution == "0" ? "未解決" : "解決済み") + marker("resolution") + "\r\n";
            mailbody += "}\r\n";
            mailbody += "\r\n";
            mailbody += "データ中の緯度経度をグーグルマップで開く\r\n";
            mailbody += "https://www.google.com/maps?q=" + json.latitude + "," + json.longitude + "\r\n";
            mailbody += "\r\n";
            mailbody += "---\r\n";
            mailbody += "JASPIC - NES（滋賀県警専用ツール）\r\n";
            mailbody += "↓ウェブサイト掲載情報とURLをここにコピペしてください↓\r\n";
            mailbody += "---\r\n";
            mailbody += "https://map.police.shiga.dsvc.jp\r\n";
      break;
    }
  }
  const province = kind === "shiga-person" ? "滋賀" : "広島";
  return { from: "hppmap@kishibojim.online", to: "getter01@jaspic-nes.net",
    cc: kind === "shiga-person" ? "kishibojim@gmail.com" : "miyazaki1016@me.com",
    subject: " [JASPIC-NES] " + province + "県警専用ツール", body: mailbody };
}
