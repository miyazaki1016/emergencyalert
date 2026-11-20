import Link from "next/link";
import NationalHeavyRainForecast from "./components/NationalHeavyRainForecast";
import MyForecastLegacyLink from "./my-forecast-legacy-link";
import styles from "./forecast-home.module.css";

export default function ForecastHome() {
  return (
    <div className={styles.site}>
      <MyForecastLegacyLink />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/?view=forecast" aria-label="さきどり トップ">さき<span>どり</span></Link>
          <nav className={styles.nav} aria-label="ページ切替">
            <Link href="#national-rain-heading" aria-current="page">全国の大雨</Link>
            <Link href="/my-amefuru">MYアメふる</Link>
          </nav>
        </div>
      </header>
      <main className={styles.main}>
        <NationalHeavyRainForecast />
      </main>
    </div>
  );
}
