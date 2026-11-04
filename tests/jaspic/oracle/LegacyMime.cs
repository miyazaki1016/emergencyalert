using System;
using System.IO;
#if NETFRAMEWORK
using JsonSerializer = FrameworkJson;
#else
using System.Text.Json;
#endif
using System.Collections.Generic;
using MimeKit;

partial class Program {
  // Offline recreation of the three legacy MimeMessage/BodyBuilder blocks.
  // Intentionally no MailKit dependency, network client, credentials or SMTP API.
  static void WriteMimeFixtures(string input, string directory) {
    Directory.CreateDirectory(directory);
    var fixtures = JsonSerializer.Deserialize<List<Fixture>>(File.ReadAllText(input))!;
    foreach (var f in fixtures) {
      var body = f.kind switch {
        "hiroshima-crime" => criminal_mail(f.previous,f.current,new city {city_name=f.cityName},new police_station {station_name=f.stationName}),
        "hiroshima-person" => suspicious_person_mail(f.previous,f.current,new city {city_name=f.cityName},new police_station {station_name=f.stationName}),
        "shiga-person" => suspicious_person_shiga_mail(f.previous,f.current,new Feature1 {properties=new Properties {full_name=f.cityName}}),
        _ => throw new Exception("Unknown synthetic fixture kind")
      };
      foreach (var mode in new [] {"unprepared","seven-bit","eight-bit"}) {
      var province = f.kind == "shiga-person" ? "滋賀" : "広島";
      var mail = new MimeMessage();
      var builder = new BodyBuilder();
      mail.From.Add(new MailboxAddress("", "hppmap@kishibojim.online"));
      mail.To.Add(new MailboxAddress("", "getter01@jaspic-nes.net"));
      mail.Cc.Add(new MailboxAddress("", f.kind == "shiga-person" ? "kishibojim@gmail.com" : "miyazaki1016@me.com"));
      mail.Subject = " [JASPIC-NES] " + province + "県警専用ツール";
      builder.TextBody = body;
      mail.Body = builder.ToMessageBody();
      // Only these volatile values are fixed, for reproducible offline byte comparisons.
      mail.Date = new DateTimeOffset(2026,11,4,18,0,0,TimeSpan.FromHours(9));
      mail.MessageId = "synthetic-jaspic@localhost.invalid";
      var options = FormatOptions.Default.Clone();
      options.NewLineFormat = NewLineFormat.Dos; // legacy Windows line endings
      var name = f.kind + (f.previous == null ? "-new" : "-update");
        if (mode != "unprepared") mail.Prepare(mode == "seven-bit" ? EncodingConstraint.SevenBit : EncodingConstraint.EightBit, 998);
        using var stream = File.Create(Path.Combine(directory, name + "-" + mode + ".eml"));
        mail.WriteTo(options,stream);
        mail.Dispose();
      }
    }
  }
}
