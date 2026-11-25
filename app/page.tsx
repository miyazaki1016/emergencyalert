import Link from "next/link";
import NationalHeavyRainForecast from "./components/NationalHeavyRainForecast";
import MyForecastLegacyLink from "./my-forecast-legacy-link";
import styles from "./forecast-home.module.css";

export default async function ForecastHome({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const view = (await searchParams).view === "forecast" ? "list" : "map";
  return (
    <div className={styles.site}>
      <MyForecastLegacyLink />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/" aria-label="さきどり トップ">さき<span>どり</span></Link>
          <nav className={styles.nav} aria-label="ページ切替">
            <Link href="/" aria-current={view === "map" ? "page" : undefined}>全国地図</Link>
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
