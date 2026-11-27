import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RadarPlayer from "../../components/RadarPlayer";
import { japanLandPath } from "../../../lib/weather/rain/japanLandPath";
import { forecastTime, type RadarTile } from "../../../lib/weather/rain/nationalForecastSnapshot";
import {
  caseDetailsExpired, caseLeadMinutes, caseRadarFrames, presentCaseVersions,
  type CaseBand, type CaseSlot, type RainCase, type RainCaseVersion,
} from "../../../lib/weather/rain/nationalRainCaseDisplay";
import { loadRainCaseDetails, readRainCase } from "./loadRainCase";
import styles from "./rain-case.module.css";

export const dynamic = "force-dynamic";
const site = "https://emergencyalert.news";
const zone = "Asia/Tokyo";
const clock = new Intl.DateTimeFormat("ja-JP", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const calendar = new Intl.DateTimeFormat("ja-JP", { timeZone: zone, year: "numeric", month: "long", day: "numeric" });
const timedDay = new Intl.DateTimeFormat("ja-JP", { timeZone: zone, month: "numeric", day: "numeric",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const states = { forecast: "予報中", ended: "終了", verified: "答え合わせ済み" };
const bands: { key: CaseBand; label: string }[] = [
  { key: "detail", label: "詳細帯（5〜30分先）" },
  { key: "extended", label: "延長帯（35〜60分先）" },
];
const dateTime = (input: string) => new Date(forecastTime(input)).toISOString();
const timeLabel = (input: string) => clock.format(forecastTime(input));
type Route = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Route): Promise<Metadata> {
  const incident = await readRainCase((await params).slug);
  if (!incident) return { title: "大雨予報の記録", robots: { index: false } };
  const title = `${incident.municipality}の大雨予報 | さきどり`;
  const description = `${calendar.format(forecastTime(incident.first_base))}の${incident.prefecture}${incident.municipality}。最大${incident.peak_tier} mm/h以上の予報、${states[incident.status]}。`;
  const url = `${site}/cases/${incident.slug}`;
  return {
    title, description, alternates: { canonical: url },
    openGraph: { type: "article", locale: "ja_JP", title, description, url },
    robots: caseDetailsExpired(incident) ? { index: false } : undefined,
  };
}

function CaseMap({ tile, municipality }: { tile: RadarTile; municipality: string }) {
  // Saved z10 radar tile centers are stored alongside forecast values.
  const x = (tile.x + 0.5) * 4;
  const y = (tile.y + 0.5) * 4;
  return <figure className={styles.map}>
    <svg viewBox={`${x - 45} ${y - 26} 90 52`} role="img" aria-label={`${municipality}の予報タイル付近の地図`}>
      <path d={japanLandPath} fill="var(--case-land)" fillRule="evenodd" />
      <circle cx={x} cy={y} r={2.4} stroke="white" strokeWidth={0.6} fill="#c32659" />
    </svg>
    <figcaption>予報に使ったタイルのおおよその位置。地図は Natural Earth の概形です。</figcaption>
  </figure>;
}

function TimeBands({ slots }: { slots: CaseSlot[] }) {
  return <div className={styles.bands}>{bands.map(({ key, label }) => {
    const times = slots.filter(slot => slot.band === key);
    return <section key={key} aria-label={label}>
      <h3>{label}</h3>
      {times.length ? <ul className={styles.slots}>
        {times.map(slot => <li key={slot.validTime} data-state={slot.state} data-tier={slot.tier ?? undefined}>
          <time dateTime={dateTime(slot.validTime)}>{timedDay.format(forecastTime(slot.validTime))}</time>
          {slot.state === "rain" && <strong>{slot.tier} mm/h以上</strong>}
          {slot.state === "below" && <span>30 mm/h未満</span>}
          {slot.state === "unknown" && <span className={styles.missing}>未取得</span>}
          {slot.basetime && <small>{timeLabel(slot.basetime)}基準</small>}
        </li>)}
      </ul> : <p>この帯の記録はありません。</p>}
    </section>;
  })}</div>;
}

function ActiveForecast({ incident, version, now }: { incident: RainCase; version: RainCaseVersion; now: number }) {
  return <section className={styles.card} aria-labelledby="active-forecast">
    <h2 id="active-forecast">予報詳細</h2>
    <p><time dateTime={dateTime(version.base_time)}>{timedDay.format(forecastTime(version.base_time))}</time> 基準</p>
    <TimeBands slots={version.slots.filter(slot => forecastTime(slot.validTime) > now)} />
    <div className={styles.bands}>{bands.map(({ key, label }) => {
      const frames = caseRadarFrames(incident, version, key, now);
      return <section className={styles.radar} key={key} aria-label={`${label}の雨雲再生`}>
        <h3>{label}の雨雲</h3>
        {frames.length ? <RadarPlayer key={version.base_time} frames={frames} blocky={key === "extended"} /> : <p>再生できる予報画像はありません。</p>}
      </section>;
    })}</div>
  </section>;
}

export default async function RainCasePage({ params }: Route) {
  const incident = await readRainCase((await params).slug);
  if (!incident) notFound();
  const now = Date.now();
  const { versions, expired, related } = await loadRainCaseDetails(incident, now);
  const { history, timeline, verification, latest, pin } = presentCaseVersions(versions);
  const strengthening = history.find(({ change }) => change === "強まった");
  const lead = caseLeadMinutes(incident);
  const summary = incident.verification_summary;

  return <main className={styles.page}>
    <header className={styles.hero}>
      <Link href="/" className={styles.brand}>さきどり</Link>
      <div className={styles.heading}>
        <span className={styles.status} data-status={incident.status}>{states[incident.status]}</span>
        <time dateTime={dateTime(incident.first_base)}>{calendar.format(forecastTime(incident.first_base))}</time>
      </div>
      <h1>{incident.municipality}の大雨予報</h1>
      <p>{incident.prefecture} · 気象庁の予報をもとにした記録</p>
      <div className={styles.numbers}>
        <div><span>最強の予報</span><strong>{incident.peak_tier} <small>mm/h以上</small></strong>
          <time dateTime={dateTime(incident.peak_valid_time)}>{timedDay.format(forecastTime(incident.peak_valid_time))}ごろ</time></div>
        <div><span>ピーク予報時刻まで</span><strong>{lead} <small>分</small></strong>
          <span>{timeLabel(incident.first_base)}に最初の予報を検出</span></div>
      </div>
    </header>

    {expired ? <section className={styles.card}>
      <h2>記録の要約</h2><p>この事案の詳細公開は終了しました。</p>
    </section> : <>
      <section className={styles.card} aria-labelledby="case-history">
        <h2 id="case-history">大雨予報の経過</h2>
        <ol className={styles.chapters}>
          <li><strong>始まり</strong><span>{timeLabel(incident.first_base)}に検出。最初の予報対象は{timeLabel(incident.first_valid_time)}ごろ。</span></li>
          <li><strong>強まり</strong><span>{strengthening
            ? `${timeLabel(strengthening.version.base_time)}基準で${strengthening.version.peak_tier} mm/h以上`
            : "強まりの記録はありません。"}</span></li>
          <li><strong>ピーク</strong><span>{timedDay.format(forecastTime(incident.peak_valid_time))}ごろ、{incident.peak_tier} mm/h以上の予報。</span></li>
          <li><strong>収束</strong><span>{incident.ended_at
            ? `${timedDay.format(forecastTime(incident.ended_at))}基準で事案終了。`
            : "終了の判定はまだ記録されていません。"}</span></li>
        </ol>
        {pin && <CaseMap tile={pin} municipality={incident.municipality} />}
        {!pin && <p>この事案に地図位置の記録はありません。</p>}
      </section>
      {incident.status === "forecast" && latest && <ActiveForecast incident={incident} version={latest} now={now} />}
      <section className={styles.card} aria-labelledby="recorded-forecast">
        <h2 id="recorded-forecast">記録した予報の時系列</h2>
        <p>各時刻について、保存された最新の版を表示しています。</p>
        <TimeBands slots={timeline} />
        <h3>予報の更新履歴</h3>
        <ol className={styles.history}>
          {history.map(({ version, change }) => <li key={version.base_time}>
            <time dateTime={dateTime(version.base_time)}>{timedDay.format(forecastTime(version.base_time))}基準</time>
            <span>{change}{version.peak_tier !== null && ` · 最大${version.peak_tier} mm/h以上`}</span>
          </li>)}
        </ol>
        {!history.length && <p>予報の版履歴は未取得です。</p>}
      </section>
    </>}

    {incident.status !== "forecast" && <section className={styles.card} aria-labelledby="case-verification">
      <h2 id="case-verification">答え合わせ</h2>
      {summary ? <p>気象庁のレーダー実況を使用。照合方法は{summary.method}。一致{summary.match}件、不一致{summary.different}件、不明{summary.unknown}件。</p>
        : <p>予報時刻の気象庁レーダー実況で照合します。答え合わせはまだ記録されていません。</p>}
      {!expired && verification.length > 0 && <ul className={styles.history}>
        {verification.map(row => <li key={row.validTime}>
          <time dateTime={dateTime(row.validTime)}>{timedDay.format(forecastTime(row.validTime))}</time>
          <span>{row.result === "match" ? "一致" : row.result === "different" ? "不一致" : "不明"}</span>
          <span>実況 {row.observedTier === null ? "未取得" : row.observedTier === 0 ? "30 mm/h未満" : `${row.observedTier} mm/h以上`}</span>
        </li>)}
      </ul>}
    </section>}

    <nav className={styles.card} aria-label="関連ページ">
      <h2>この地域の雨を、降る前に知る</h2>
      <div className={styles.links}><Link href="/my-amefuru">MYアメふるで通知を登録</Link><Link href="/">全国地図を見る</Link></div>
      {related.length > 0 && <>
        <h3>{incident.prefecture}のほかの大雨予報</h3>
        <ul className={styles.history}>{related.map(item => <li key={item.slug}>
          <Link href={`/cases/${item.slug}`}>{item.municipality}・{calendar.format(forecastTime(item.first_base))}・{item.peak_tier} mm/h以上</Link>
        </li>)}</ul>
      </>}
    </nav>
  </main>;
}
