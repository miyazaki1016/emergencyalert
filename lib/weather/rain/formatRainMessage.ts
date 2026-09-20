import type { RainInterpretation } from "./RainInterpretationEngine";

export interface RainMessage {
  headline: string;
  detail: string;
}

export function formatRainMessage(
  interpretation: RainInterpretation,
  now: Date,
): RainMessage {
  switch (interpretation.state) {
    case "ACTIONABLE_RAIN": {
      const mins = minutesUntil(now, interpretation.firstActionableRainTime);
      return {
        headline: mins !== null && mins <= 15
          ? "まもなく、まとまった雨の予報です。"
          : `${roundFive(mins)}分後ごろから、まとまった雨の予報です。`,
        detail: "洗濯物は今のうちに取り込んでおいた方がよさそうです。",
      };
    }
    case "RAIN_AHEAD": {
      const mins = minutesUntil(now, interpretation.firstRainTime);
      return {
        headline: mins === null
          ? "このあと、この場所に雨の予報が出ています。"
          : `${roundFive(mins)}分後ごろから、この場所に雨の予報が出ています。`,
        detail: interpretation.firstActionableRainTime
          ? "まとまった雨はまだ少し先です。引き続き見張ります。"
          : "今のところ、洗濯物を急いで取り込む強さとは判定していません。",
      };
    }
    case "RAINING":
      return {
        headline: "現在、この場所には雨の情報があります。",
        detail: "気象庁の最新データをもとに表示しています。",
      };
    case "ENDING": {
      const mins = minutesUntil(now, interpretation.endingTime);
      return {
        headline: "雨は弱まる方向です。",
        detail: mins === null
          ? "このあと降水のない予報が続いています。"
          : `${roundFive(mins)}分後ごろから、降水のない予報が続いています。`,
      };
    }
    case "DRY":
      return {
        headline: "今後1時間、この場所に雨の予報は出ていません。",
        detail: "気象庁の現在取得できているデータの範囲での表示です。",
      };
    case "EASING":
      return {
        headline: "雨は弱まる予報です。",
        detail: "まだ、やむとは判断していません。",
      };
    case "INSUFFICIENT_DATA":
      return {
        headline: "最新の雨情報を十分に確認できませんでした。",
        detail: "雨が降らないという意味ではありません。",
      };
  }
}

function minutesUntil(now: Date, value: string | null): number | null {
  if (!value || !/^\d{14}$/.test(value)) return null;
  const y = Number(value.slice(0, 4));
  const m = Number(value.slice(4, 6));
  const d = Number(value.slice(6, 8));
  const hh = Number(value.slice(8, 10));
  const mm = Number(value.slice(10, 12));
  const ss = Number(value.slice(12, 14));
  return Math.max(0, (Date.UTC(y, m - 1, d, hh, mm, ss) - now.getTime()) / 60_000);
}

function roundFive(value: number | null): number {
  if (value === null) return 0;
  return Math.max(5, Math.round(value / 5) * 5);
}
