# test/watch-rain-notification-regression-20261018

**目的：** 未確認

**実装状態：** mainとの差分を収録。差分ゼロも記録

**検証の扱い：** 未確認

**PR状態：** PR未関連のブランチ差分

**main統合：** 未確認

**本番反映：** 未確認

**残課題：** 未確認

**次の作業：** 関連PR・mainとの同等実装を照合。ブランチの存在だけで未完成扱いしない

根拠取得日時 (UTC)：2026-11-13T03:37:57.868129+00:00


## 実際の変更処理（コードから抽出）

差分・ソースを参照

- [lib/weather/rain/watchNotificationDecision.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/0e8ed4c4e61f228a404b3d97e93355c3229cfbfb/lib/weather/rain/watchNotificationDecision.test.ts)：全文
- [supabase/functions/watch-rain/index.ts](https://github.com/miyazaki1016/emergencyalert/blob/0e8ed4c4e61f228a404b3d97e93355c3229cfbfb/supabase/functions/watch-rain/index.ts)：全文
- [supabase/functions/watch-rain/notificationDecision.ts](https://github.com/miyazaki1016/emergencyalert/blob/0e8ed4c4e61f228a404b3d97e93355c3229cfbfb/supabase/functions/watch-rain/notificationDecision.ts)：全文

## 検証実行の事実

| ワークフロー | 結果 | 対象SHA |
| --- | --- | --- |
| 実行証拠未取得 | 未確認 | — |

## 当時の説明・結論（原文。作者の主張と実測を区別）

```text

```

## ソース・テスト・資料の抜粋（実行はしない）

### lib/weather/rain/watchNotificationDecision.test.ts

```text
diff --git a/lib/weather/rain/watchNotificationDecision.test.ts b/lib/weather/rain/watchNotificationDecision.test.ts
index b0c33525..d1380eec 100644
--- a/lib/weather/rain/watchNotificationDecision.test.ts
+++ b/lib/weather/rain/watchNotificationDecision.test.ts
@@ -1,5 +1,5 @@
 import { describe, expect, it } from "vitest";
-import { nextLastNotifiedAt, nextRainEndingNotified, shouldNotifyForRain } from "../../../supabase/functions/watch-rain/notificationDecision";
+import { nextLastNotifiedAt, nextRainEndingNotified, rainForecastTimeMs, isWithinRainNotificationHorizon, shouldNotifyForRain } from "../../../supabase/functions/watch-rain/notificationDecision";
 
 describe("watch-rain notification decision", () => {
   it("notifies when a target becomes actionable", () => {
@@ -157,3 +157,134 @@ describe("rain-ending hysteresis", () => {
     })).toBe(true);
   });
 });
+
+
+describe("notification regression characterization (2026-10-18)", () => {
+  it("currently permits an ending notification independently of an earlier approach notification", () => {
+    // Characterization, not desired policy: shouldNotifyForRain has no rain-episode ID
+    // or prior approach-delivery argument.
+    expect(shouldNotifyForRain({
+      notificationsEnabled: true,
+      currentUrgency: "INFO",
+      previousUrgency: "INFO",
+      lastNotifiedAt: null,
+      rainEnding: true,
+    })).toBe(true);
+  });
+
+  it("native Date parsing does not interpret the 14-digit JMA forecast timestamp", () => {
+    // The watch-rain worker currently uses new Date(frame.validTime) for
+    // severe forecast selection. RainInterpretationEngine uses a JMA parser.
+    expect(Number.isNaN(new Date("20261018123000").getTime())).toBe(true);
+    expect(new Date("2026-10-18T12:30:00Z").getTime()).toBe(1792326600000);
+  });
+});
+
+describe("JMA forecast timestamp parsing", () => {
+  it("accepts valid 14-digit JMA UTC timestamps", () => {
+    expect(rainForecastTimeMs("20261018123000")).toBe(Date.parse("2026-10-18T12:30:00Z"));
+  });
+  it("accepts ISO timestamps used by other providers", () => {
+    expect(rainForecastTimeMs("2026-10-18T12:30:00Z")).toBe(Date.parse("2026-10-18T12:30:00Z"));
+  });
+  it("fails closed on invalid or missing timestamps", () => {
+    expect(Number.isNaN(rainForecastTimeMs("20261318123000"))).toBe(true);
+    expect(Number.isNaN(rainForecastTimeMs("not-a-date"))).toBe(true);
+    expect(Number.isNaN(rainForecastTimeMs(null))).toBe(true);
+  });
+});
+
+
+describe("rain episode timeline characterization", () => {
+  it("does not send an approach Push for a weak INFO forecast", () => {
+    expect(shouldNotifyForRain({
+      notificationsEnabled: true,
+      currentUrgency: "INFO",
+      previousUrgency: "INFO",
+      lastNotifiedAt: null,
+    })).toBe(false);
+  });
+
+  it("sends an actionable approach once, then suppresses its duplicate", () => {
+    const base = {
+      notificationsEnabled: true,
+      currentUrgency: "LIFESTYLE_ACTION" as const,
+    };
+    expect(shouldNotifyForRain({
+      ...base, previousUrgency: "INFO", lastNotifiedAt: null,
+    })).toBe(true);
+    expect(shouldNotifyForRain({
+      ...base, previousUrgency: "LIFESTYLE_ACTION",
+      lastNotifiedAt: "2026-10-19T03:00:00.000Z",
+    })).toBe(false);
+  });
+
+  it("characterizes ending-only Push after a weak approach was suppressed", () => {
+    const approach = shouldNotifyForRain({
+      notificationsEnabled: true,
+      currentUrgency: "INFO",
+      previousUrgency: "INFO",
+      lastNotifiedAt: null,
+    });
+    const ending = shouldNotifyForRain({
+      notificationsEnabled: true,
+      currentUrgency: "INFO",
+      previousUrgency: "INFO",
+      lastNotifiedAt: null,
+      rainEnding: true,
+    });
+    expect({ approach, ending }).toEqual({ approach: false, ending: true });
+  });
+
+  it("does not notify when the target is OFF even for ending", () => {
+    expect(shouldNotifyForRain({
+      notificationsEnabled: false,
+      currentUrgency: "INFO",
+      previousUrgency: "INFO",
+      lastNotifiedAt: null,
+      rainEnding: true,
+    })).toBe(false);
+  });
+
+  it("rearms the ending latch after three confirmed rainy checks", () => {
+    const afterDry = nextRainEndingNotified({
+      previousRainEndingNotified: true, rainStreak: 0, endingDelivered: false,
+    });
+    const afterTwo = nextRainEndingNotified({
+      previousRainEndingNotified: afterDry, rainStreak: 2, endingDelivered: false,
+    });
+    const afterThree = nextRainEndingNotified({
+      previousRainEndingNotified: afterTwo, rainStreak: 3, endingDelivered: false,
+    });
+    expect([afterDry, afterTwo, afterThree]).toEqual([true, true, false]);
+  });
+
+  it("parses the JMA timestamp at the exact 30-minute boundary", () => {
+    const now = Date.parse("2026-10-19T03:00:00Z");
+    const at30 = rainForecastTimeMs("20261019033000");
+    const at35 = rainForecastTimeMs("20261019033500");
+    expect((at30 - now) / 60000).toBe(30);
+    expect((at35 - now) / 60000).toBe(35);
+    // Worker severeFrame currently has no <=30 minute filter.
+  });
+
+  it("does not turn malformed JMA time into a future forecast", () => {
+    expect(Number.isNaN(rainForecastTimeMs("20260230033000"))).toBe(true);
+    expect(Number.isNaN(rainForecastTimeMs("20261019033099"))).toBe(true);
+  });
+});
+
+describe("30-minute MY rain eligibility", () => {
+  const now = Date.parse("2026-10-19T03:00:00Z");
+  it("includes forecasts through 30 minutes", () => {
+    expect(isWithinRainNotificationHorizon("20261019033000", now)).toBe(true);
+  });
+  it("excludes later and expired forecasts", () => {
+    expect(isWithinRainNotificationHorizon("20261019033500", now)).toBe(false);
+    expect(isWithinRainNotificationHorizon("20261019025500", now)).toBe(false);
+  });
+  it("rejects missing and invalid timestamps", () => {
+    expect(isWithinRainNotificationHorizon(null, now)).toBe(false);
+    expect(isWithinRainNotificationHorizon("invalid", now)).toBe(false);
+  });
+});

```

### supabase/functions/watch-rain/index.ts

```text
diff --git a/supabase/functions/watch-rain/index.ts b/supabase/functions/watch-rain/index.ts
index b4b59922..cea3c8ee 100644
--- a/supabase/functions/watch-rain/index.ts
+++ b/supabase/functions/watch-rain/index.ts
@@ -1,6 +1,6 @@
 import { createClient } from "jsr:@supabase/supabase-js@2";
 import webpush from "npm:web-push@3.6.7";
-import { nextLastNotifiedAt, nextRainEndingNotified, shouldNotifyForRain } from "./notificationDecision.ts";
+import { nextLastNotifiedAt, nextRainEndingNotified, rainForecastTimeMs, isWithinRainNotificationHorizon, shouldNotifyForRain } from "./notificationDecision.ts";
 
 type RainEvent = { schemaVersion:1; eventType:string; urgency:"INFO"|"LIFESTYLE_ACTION"; suggestedAction:string; startsAt:string|null; actionableAt:string|null; endingAt:string|null; source:string; checkedAt:string; sourceValidAt:string|null; };
 type Rgba = { r:number; g:number; b:number; a:number };
@@ -32,14 +32,14 @@ Deno.serve(async(req:Request)=>{
   const clearStreak=currentStatus==="NO_RAIN"?Math.min(Number(previous?.clear_streak??0)+1,3):0;
   const rainConfirmed=rainStreak>=3&&!previous?.rain_confirmed_notified;
   const severeRank=(v?:string|null)=>v==="GTE_80"?3:v==="50_TO_80"?2:v==="30_TO_50"?1:0;
-  const severeFrame=(rain.forecast??[]).filter(f=>f.validTime&&new Date(f.validTime).getTime()>=Date.now()&&severeRank(f.intensityClass)>0).sort((a,b)=>severeRank(b.intensityClass)-severeRank(a.intensityClass)||new Date(a.validTime!).getTime()-new Date(b.validTime!).getTime())[0];
+  const severeFrame=(rain.forecast??[]).filter(f=>isWithinRainNotificationHorizon(f.validTime, Date.now())&&severeRank(f.intensityClass)>0).sort((a,b)=>severeRank(b.intensityClass)-severeRank(a.intensityClass)||rainForecastTimeMs(a.validTime)-rainForecastTimeMs(b.validTime))[0];
   const severeLevel=severeRank(severeFrame?.intensityClass); const previousSevere=Number(previous?.severe_rain_level??0); const severeEscalation=severeLevel>previousSevere;
   const initialRaining=false;
   const rainEnding=rain.event.eventType==="RAIN_ENDING"&&previousEvent?.eventType!=="RAIN_ENDING"&&!previous?.rain_ending_notified&&previous?.confirmed_weather==="RAINING";
   const confirmedAndEnding=rainConfirmed&&rain.event.eventType==="RAIN_ENDING";
   const shouldNotify=Boolean(target.notifications_enabled)&&(severeEscalation||shouldNotifyForRain({notificationsEnabled:true,currentUrgency:rain.event.urgency,previousUrgency:previousEvent?.urgency,lastNotifiedAt:previous?.last_notified_at,rainEnding:rainEnding||confirmedAndEnding}));
   let delivered=0,failed=0;
-  const severeMinutes=severeFrame?.validTime?Math.max(0,Math.round((new Date(severeFrame.validTime).getTime()-Date.now())/60000)):null;
+  const severeMinutes=severeFrame?.validTime?Math.max(0,Math.round((rainForecastTimeMs(severeFrame.validTime)-Date.now())/60000)):null;
   const severeName=severeLevel===3?"猛烈な雨":severeLevel===2?"非常に激しい雨":"激しい雨";
   const severeBody=notificationLabel?`${notificationLabel}：${severeMinutes===0?"まもなく":`約${severeMinutes}分後`}に${severeName}（${severeLevel===3?"80mm/h以上":severeLevel===2?"50〜80mm/h":"30〜50mm/h"}）の予測です。周囲の状況に注意してね`:`${severeMinutes===0?"まもなく":`約${severeMinutes}分後`}に${severeName}の予測です。周囲の状況に注意してね`;
   const returningRain=previous?.confirmed_weather==="RAINING"&&clearStreak>0&&clearStreak<3&&actionable;

```

### supabase/functions/watch-rain/notificationDecision.ts

```text
diff --git a/supabase/functions/watch-rain/notificationDecision.ts b/supabase/functions/watch-rain/notificationDecision.ts
index 35482dfa..048922ee 100644
--- a/supabase/functions/watch-rain/notificationDecision.ts
+++ b/supabase/functions/watch-rain/notificationDecision.ts
@@ -34,3 +34,28 @@ export function nextRainEndingNotified(args: {
   if (args.rainStreak >= 3) return false;
   return args.previousRainEndingNotified;
 }
+
+/** Convert a JMA YYYYMMDDHHmmss timestamp (UTC), or ISO timestamp, to epoch ms.
+ * Invalid timestamps fail closed rather than being treated as future forecasts.
+ */
+export function rainForecastTimeMs(value: string | null | undefined): number {
+  if (!value) return NaN;
+  if (/^\d{14}$/.test(value)) {
+    const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}Z`;
+    const ms = Date.parse(iso);
+    return Number.isFinite(ms) && new Date(ms).toISOString() === iso.replace("Z", ".000Z") ? ms : NaN;
+  }
+  return /^\d{4}-\d{2}-\d{2}T/.test(value) ? Date.parse(value) : NaN;
+}
+
+/** Only forecast events within the MY rain notification horizon are eligible. */
+export function isWithinRainNotificationHorizon(
+  validTime: string | null | undefined,
+  nowMs: number,
+  horizonMinutes = 30,
+): boolean {
+  const timeMs = rainForecastTimeMs(validTime);
+  return Number.isFinite(timeMs) &&
+    timeMs >= nowMs &&
+    timeMs - nowMs <= horizonMinutes * 60_000;
+}

```

