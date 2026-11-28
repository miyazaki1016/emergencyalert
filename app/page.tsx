import Link from "next/link";
import NationalHeavyRainForecast from "./components/NationalHeavyRainForecast";
import MyForecastLegacyLink from "./my-forecast-legacy-link";
import styles from "./forecast-home.module.css";

export default async function ForecastHome({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const mode = (await searchParams).view;
  const view = mode === "forecast" ? "list" : "map";
  if (!mode) return (
    <main className={styles.theater}>
      <MyForecastLegacyLink />
      <details className={styles.theaterMenu}>
        <summary className={styles.brand}>さき<span>どり</span></summary>
        <nav aria-label="ページ切替"><Link href="/?view=rain">全国地図</Link><Link href="/?view=forecast">全国の大雨</Link><Link href="/my-amefuru">MYアメふる</Link></nav>
      </details>
      <NationalHeavyRainForecast glow />
    </main>
  );
  return (
    <div className={styles.site}>
      <MyForecastLegacyLink />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.identity}>
            <Link className={styles.brand} href="/" aria-label="さきどり トップ">さき<span>どり</span></Link>
            <span className={styles.tagline}>暮らしを少し先回りする</span>
          </div>
          <nav className={styles.nav} aria-label="ページ切替">
            <Link href="/?view=rain" aria-current={view === "map" ? "page" : undefined}>全国地図</Link>
            <Link href="/?view=forecast" aria-current={view === "list" ? "page" : undefined}>全国の大雨</Link>
            <Link href="/my-amefuru">MYアメふる</Link>
          </nav>
        </div>
      </header>
      <main className={styles.main}>
        <NationalHeavyRainForecast view={view} />
      </main>
    </div>
  );
}
