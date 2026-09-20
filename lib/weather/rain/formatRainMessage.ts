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
          ? "もうすぐ、ちゃんとした雨くるよ☔️"
          : `${roundFive(mins)}分後くらいから、ちゃんとした雨くるよ☔️`,
        detail: "洗濯物、今のうちにいれとこ🧺",
      };
    }
    case "RAIN_AHEAD": {
      const mins = minutesUntil(now, interpretation.firstRainTime);
      return {
        headline: mins === null
          ? "このあと雨くるよ☔️"
          : `${roundFive(mins)}分後くらいから雨くるよ☔️`,
        detail: interpretation.firstActionableRainTime
          ? "まとまった雨はまだ少し先。引き続き見張ってるよ。"
          : "今のところ、洗濯物を急いで入れるほどじゃないよ。",
      };
    }
    case "RAINING":
      return {
        headline: "いま、この場所は雨だよ🌧️",
        detail: "気象庁の最新データで確認してるよ。",
      };
    case "ENDING": {
      const mins = minutesUntil(now, interpretation.endingTime);
      return {
        headline: "もうすぐやみそう🌤️",
        detail: mins === null
          ? "このあと、雨のない予報が続いてるよ。"
          : `${roundFive(mins)}分後くらいから、雨のない予報が続いてるよ。`,
      };
    }
    case "DRY":
      return {
        headline: "この先1時間、雨の予報は出てないよ☀️",
        detail: "気象庁のいま取れているデータで確認したよ。",
      };
    case "EASING":
      return {
        headline: "雨、だんだん弱くなりそう🌦️",
        detail: "まだ、やむとは言い切れないよ。",
      };
    case "INSUFFICIENT_DATA":
      return {
        headline: "いま、最新の雨情報をうまく確認できないよ。",
        detail: "雨が降らないって意味じゃないよ。",
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
