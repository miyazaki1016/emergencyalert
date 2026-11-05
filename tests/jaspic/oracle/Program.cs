using System; using System.IO; using System.Linq; using System.Collections.Generic;
#if NETFRAMEWORK
using JsonSerializer = FrameworkJson;
#else
using System.Text.Json;
#endif
class Data {
public string? occurrence_date_from {get;set;}
public string? latitude {get;set;}
public string? longitude {get;set;}
public string? id {get;set;}
public string? city_code {get;set;}
public string? address {get;set;}
public string? police_station {get;set;}
public string? crime_cd {get;set;}
public string? case_type {get;set;}
public string? location_type {get;set;}
public string? damage_goods {get;set;}
public string? occurrences {get;set;}
public string? offender {get;set;}
public string? occurrence_date_to {get;set;}
public string? date_from_format {get;set;}
public string? date_to_format {get;set;}
public string? occurrence_dt {get;set;}
public string? accident_situation {get;set;}
public string? victim {get;set;}
public string? criminal_age {get;set;}
public string? criminal_feature {get;set;}
public string? resolution {get;set;}
public string? resolution_info {get;set;}
public string? address_code {get;set;}
public string? criminal_car {get;set;}
}
class city {public string city_name {get;set;} = "";}
class police_station {public string station_name {get;set;} = "";}
class Properties {public string full_name {get;set;} = "";}
class Feature1 {public Properties properties {get;set;} = new();}
class Fixture { public string kind {get;set;} = ""; public Data current {get;set;} = new(); public Data? previous {get;set;} public string cityName {get;set;} = ""; public string stationName {get;set;} = ""; }
partial class Program {
static void Main(string[] args) { if(args.Length == 3 && args[0] == "--mime") { WriteMimeFixtures(args[1],args[2]); return; } var fixtures = JsonSerializer.Deserialize<List<Fixture>>(File.ReadAllText(args[0]))!; var result = fixtures.Select(f => { var body = f.kind switch { "hiroshima-crime" => criminal_mail(f.previous,f.current,new city {city_name=f.cityName},new police_station {station_name=f.stationName}), "hiroshima-person" => suspicious_person_mail(f.previous,f.current,new city {city_name=f.cityName},new police_station {station_name=f.stationName}), _ => suspicious_person_shiga_mail(f.previous,f.current,new Feature1 {properties=new Properties {full_name=f.cityName}}) }; return new {body}; }); File.WriteAllText(args[1],JsonSerializer.Serialize(result)); }
static string criminal_mail(Data? db, Data json, city city, police_station police_station)
        {
            var result = false;
            var months = DateTime.Parse(json.occurrence_date_from).Year.ToString().Substring(2, 2) + "." + String.Format("{0:D2}", DateTime.Parse(json.occurrence_date_from).Month);

            var mailbody = "----------------------------------------\r\n";
            mailbody += "[JASPIC - NES] 広島県警アラート（" + (db == null ? "新規" : "更新") + "）" + (db == null ? "" : "●") + "\r\n";
            mailbody += "----------------------------------------\r\n";
            mailbody += "\r\n";
            mailbody += "広島県警が新しい犯罪情報を公表した可能性があります。\r\n";
            mailbody += "未配信情報の場合、県警サイトを確認して対応をお願いします。\r\n";
            mailbody += "https://map.police.hiroshima.dsvc.jp/?lat=" + json.latitude + "&lon=" + json.longitude + "&zoom=14&mode=0&period=1&months=" + months + "\r\n";
            mailbody += "\r\n";
            mailbody += "{\r\n";
            mailbody += "\"id\":\"" + json.id + "\",　→管理番号" + (db != null && db.id != json.id ? "●更新" : "") + "\r\n";
            mailbody += "\"city_code\":\"" + json.city_code + "\",　→" + city.city_name + (db != null && db.city_code != json.city_code ? "●更新" : "") + "\r\n";
            mailbody += "\"address\":\"" + json.address + "\",　→町域" + (db != null && db.address != json.address ? "●更新" : "") + "\r\n";
            mailbody += "\"latitude\":\"" + json.latitude + "\",　→緯度（参考程度）" + (db != null && db.latitude != json.latitude ? "●更新" : "") + "\r\n";
            mailbody += "\"longitude\":\"" + json.longitude + "\",　→経度（参考程度）" + (db != null && db.longitude != json.longitude ? "●更新" : "") + "\r\n";
            mailbody += "\"police_station\":\"" + json.police_station + "\",　→" + police_station.station_name + (!police_station.station_name.Contains("警察署") ? "警察署" : "") + (db != null && db.police_station != json.police_station ? "●更新" : "") + "\r\n";
            mailbody += "\"crime_cd\":\"" + json.crime_cd + "\",　→不明" + (db != null && db.crime_cd != json.crime_cd ? "●更新" : "") + "\r\n";
            mailbody += "\"case_type\":\"" + json.case_type + "\",　→カテゴリ" + (db != null && db.case_type != json.case_type ? "●更新" : "") + "\r\n";
            mailbody += "\"location_type\":\"" + json.location_type + "\",　→発生場所かな？" + (db != null && db.location_type != json.location_type ? "●更新" : "") + "\r\n";
            mailbody += "\"damage_goods\":\"" + json.damage_goods + "\",　→被害品かな？" + (db != null && db.damage_goods != json.damage_goods ? "●更新" : "") + "\r\n";
            mailbody += "\"occurrences\":\"" + json.occurrences + "\",　→被害品" + (db != null && db.occurrences != json.occurrences ? "●更新" : "") + "\r\n";
            mailbody += "\"offender\":\"" + json.offender + "\",　→加害者" + (db != null && db.offender != json.offender ? "●更新" : "") + "\r\n";
            mailbody += "\"occurrence_date_from\":\"" + json.occurrence_date_from + "\",　→発生日時（から）" + (db != null && db.occurrence_date_from != json.occurrence_date_from ? "●更新" : "") + "\r\n";
            mailbody += "\"occurrence_date_to\":\"" + json.occurrence_date_to + "\",　→発生日時（まで）" + (db != null && db.occurrence_date_to != json.occurrence_date_to ? "●更新" : "") + "\r\n";
            mailbody += "\"date_from_format\":\"" + json.date_from_format + "\",　→不明" + (db != null && db.date_from_format != json.date_from_format ? "●更新" : "") + "\r\n";
            mailbody += "\"date_to_format\":\"" + json.date_to_format + "\" →不明" + (db != null && db.date_to_format != json.date_to_format ? "●更新" : "") + "\r\n";
            mailbody += "}\r\n";
            mailbody += "\r\n";
            mailbody += "---\r\n";
            mailbody += "JASPIC - NES（広島県警専用ツール）\r\n";
            mailbody += "↓ウェブサイト掲載情報とURLをここにコピペしてください↓\r\n";
            mailbody += "---\r\n";

return mailbody;
}
static string suspicious_person_mail(Data? db, Data json, city city, police_station police_station)
        {
            var result = false;
            var months = DateTime.Parse(json.occurrence_dt).Year.ToString().Substring(2, 2) + "." + String.Format("{0:D2}", DateTime.Parse(json.occurrence_dt).Month);

            var mailbody = "----------------------------------------\r\n";
            mailbody += "[JASPIC - NES] 広島県警アラート（" + (db == null ? "新規" : "更新") + "）" + (db == null ? "" : "●") + "\r\n";
            mailbody += "----------------------------------------\r\n";
            mailbody += "\r\n";
            mailbody += "広島県警が新しい不審者情報を公表した可能性があります。\r\n";
            mailbody += "未配信情報の場合、県警サイトを確認して対応をお願いします。\r\n";
            mailbody += "https://map.police.hiroshima.dsvc.jp/?lat=" + json.latitude + "&lon=" + json.longitude + "&zoom=14&mode=1&period=1&months=" + months + "\r\n";
            mailbody += "\r\n";
            mailbody += "{\r\n";
            mailbody += "\"id\":\"" + json.id + "\",　→管理番号" + (db != null && db.id != json.id ? "●更新" : "") + "\r\n";
            mailbody += "\"city_code\":\"" + json.city_code + "\",　→" + city.city_name + (db != null && db.city_code != json.city_code ? "●更新" : "") + "\r\n";
            mailbody += "\"address\":\"" + json.address + "\",　→発生場所" + (db != null && db.address != json.address ? "●更新" : "") + "\r\n";
            mailbody += "\"latitude\":\"" + json.latitude + "\",　→緯度（参考程度）" + (db != null && db.latitude != json.latitude ? "●更新" : "") + "\r\n";
            mailbody += "\"longitude\":\"" + json.longitude + "\",　→経度（参考程度）" + (db != null && db.longitude != json.longitude ? "●更新" : "") + "\r\n";
            mailbody += "\"police_station\":\"" + json.police_station + "\",　→" + police_station.station_name + (!police_station.station_name.Contains("警察署") ? "警察署" : "") + (db != null && db.police_station != json.police_station ? "●更新" : "") + "\r\n";
            mailbody += "\"case_type\":\"" + json.case_type + "\",　→カテゴリ" + (db != null && db.case_type != json.case_type ? "●更新" : "") + "\r\n";
            mailbody += "\"crime_cd\":\"" + json.crime_cd + "\",　→不明" + (db != null && db.crime_cd != json.crime_cd ? "●更新" : "") + "\r\n";
            mailbody += "\"occurrence_dt\":\"" + json.occurrence_dt + "\",　→発生日時" + (db != null && db.occurrence_dt != json.occurrence_dt ? "●更新" : "") + "\r\n";
            mailbody += "\"accident_situation\":\"" + json.accident_situation + "\",　→事案概要" + (db != null && db.accident_situation != json.accident_situation ? "●更新" : "") + "\r\n";
            mailbody += "\"victim\":\"" + json.victim + "\",　→被害者" + (db != null && db.victim != json.victim ? "●更新" : "") + "\r\n";
            mailbody += "\"criminal_age\":\"" + json.criminal_age + "\",　→加害者年齢" + (db != null && db.criminal_age != json.criminal_age ? "●更新" : "") + "\r\n";
            mailbody += "\"criminal_feature\":\"" + json.criminal_feature + "\",　→加害者特徴" + (db != null && db.criminal_feature != json.criminal_feature ? "●更新" : "") + "\r\n";
            mailbody += "\"resolution\":\"" + (json.resolution == "1" ? "検挙" : "") + (json.resolution == "2" ? "指導・警告" : "") + (json.resolution == "9" ? "その他" : "") + "\",　→解決" + (db != null && db.resolution != json.resolution ? "●更新" : "") + "\r\n";
            mailbody += "\"resolution_info\":\"" + json.resolution_info + "\" →不明" + (db != null && db.resolution_info != json.resolution_info ? "●更新" : "") + "\r\n";
            mailbody += "}\r\n";
            mailbody += "\r\n";
            mailbody += "---\r\n";
            mailbody += "JASPIC - NES（広島県警専用ツール）\r\n";
            mailbody += "↓ウェブサイト掲載情報とURLをここにコピペしてください↓\r\n";
            mailbody += "---\r\n";

return mailbody;
}
static string suspicious_person_shiga_mail(Data? db, Data json, Feature1 feature)
        {
            var caseName = new List<string>()
            {
                "声かけ", "つきまとい", "容姿撮影", "身体接触", "陰部露出", "－－－", "－－－", "－－－", "その他"
            };

            var result = false;
            var months = DateTime.Parse(json.occurrence_dt).Year.ToString().Substring(2, 2) + "." + String.Format("{0:D2}", DateTime.Parse(json.occurrence_dt).Month);

            var mailbody = "----------------------------------------\r\n";
            mailbody += "[JASPIC - NES] 滋賀県警アラート（" + (db == null ? "新規" : "更新") + "）" + (db == null ? "" : "●") + "\r\n";
            mailbody += "----------------------------------------\r\n";
            mailbody += "\r\n";
            mailbody += "滋賀県警が新しい不審者情報を公表した可能性があります。\r\n";
            mailbody += "https://map.police.shiga.dsvc.jp\r\n";
            mailbody += "\r\n";
            mailbody += "{\r\n";
            mailbody += "\"id\":\"" + json.id + "\"　→管理番号" + (db != null && db.id != json.id ? "●更新" : "") + "\r\n";
            mailbody += "\"city_code\":\"" + json.city_code + "\"　→" + feature.properties.full_name + (db != null && db.city_code != json.city_code ? "●更新" : "") + "\r\n";
            mailbody += "\"address\":\"" + json.address + "\"　→発生場所" + (db != null && db.address != json.address ? "●更新" : "") + "\r\n";
            mailbody += "\"address_code\":\"" + json.address_code + "\"　→発生場所" + (db != null && db.address_code != json.address_code ? "●更新" : "") + "\r\n";
            mailbody += "\"latitude\":\"" + json.latitude + "\"　→緯度（参考程度）" + (db != null && db.latitude != json.latitude ? "●更新" : "") + "\r\n";
            mailbody += "\"longitude\":\"" + json.longitude + "\"　→経度（参考程度）" + (db != null && db.longitude != json.longitude ? "●更新" : "") + "\r\n";
            mailbody += "\"police_station\":\"" + json.police_station + "\"　→管轄警察署" + (db != null && db.police_station != json.police_station ? "●更新" : "") + "\r\n";
            mailbody += "\"case_type\":\"" + json.case_type + "\"　→" + caseName[int.Parse(json.case_type) - 1].ToString() + (db != null && db.case_type != json.case_type ? "●更新" : "") + "\r\n";
            mailbody += "\"occurrence_dt\":\"" + json.occurrence_dt + "\"　→発生日時" + (db != null && db.occurrence_dt != json.occurrence_dt ? "●更新" : "") + "\r\n";
            mailbody += "\"accident_situation\":\"" + json.accident_situation + "\"　→発生状況" + (db != null && db.accident_situation != json.accident_situation ? "●更新" : "") + "\r\n";
            mailbody += "\"criminal_car\":\"" + json.criminal_car + "\"　→不審者の移動手段" + (db != null && db.criminal_car != json.criminal_car ? "●更新" : "") + "\r\n";
            mailbody += "\"criminal_feature\":\"" + json.criminal_feature + "\"　→不審者の特徴" + (db != null && db.criminal_feature != json.criminal_feature ? "●更新" : "") + "\r\n";
            mailbody += "\"resolution\":\"" + json.resolution + "\"　→" + (json.resolution == "0" ? "未解決" : "解決済み") + (db != null && db.resolution != json.resolution ? "●更新" : "") + "\r\n";
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

return mailbody;
}
}
