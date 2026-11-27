import type { Metadata } from "next";
import Link from "next/link";

const title = "ふたご座流星群 2026年12月14日｜さきどり";
const description = "2026年のふたご座流星群は12月14日23時ごろに極大。見頃は15日0〜2時ごろ。観察のコツと当日の天気の更新予定を紹介します。";
const canonical = "https://emergencyalert.news/sky/2026-12-14-geminids";
const source = "https://www.nao.ac.jp/astro/sky/2026/12-topics02.html";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical },
  openGraph: { type: "article", locale: "ja_JP", url: canonical, title, description },
};

const card = {
  marginTop: 18,
  padding: "clamp(16px, 4vw, 26px)",
  border: "1px solid #35516d",
  borderRadius: 16,
  background: "#11253b",
} as const;

const heading = { margin: "0 0 8px", fontSize: "1.2rem", lineHeight: 1.4 } as const;
const link = { color: "#b4e9ff", textUnderlineOffset: 4 } as const;

export default function Geminids2026Page() {
  return (
    <main style={{
      minHeight: "100vh", boxSizing: "border-box", padding: "32px clamp(16px, 5vw, 48px) 48px",
      background: "radial-gradient(ellipse at 75% 0, #213e62, #101f35 50%, #0c1828 85%)",
      color: "#edf5ff", fontFamily: '"Hiragino Sans", "Noto Sans JP", system-ui, sans-serif', lineHeight: 1.7,
    }}>
      <article style={{ maxWidth: 700, marginInline: "auto" }}>
        <header>
          <p style={{ margin: 0, color: "#c0def7" }}>
            <time dateTime="2026-12-14">2026年12月14日（月）</time>の夜から15日（火）の明け方
          </p>
          <h1 style={{ margin: "8px 0 12px", fontSize: "clamp(2rem, 8vw, 3.4rem)", lineHeight: 1.2 }}>
            ふたご座流星群
          </h1>
          <p style={{ margin: "0 0 18px" }}>
            流星群の活動は<time dateTime="2026-12-14T23:00:00+09:00">14日23時ごろ</time>に最も活発になる予想です。時刻はすべて日本時間です。
          </p>
        </header>

        <section style={card} aria-labelledby="best-time">
          <h2 id="best-time" style={heading}>一番の見頃</h2>
          <p style={{ margin: "0 0 8px", color: "#b4e9ff", fontWeight: 800, fontSize: "clamp(1.45rem, 6vw, 2.15rem)", lineHeight: 1.3 }}>
            <time dateTime="2026-12-15T00:00:00+09:00">15日0時</time>〜
            <time dateTime="2026-12-15T02:00:00+09:00">2時</time>ごろ
          </p>
          <p style={{ margin: "0 0 8px" }}>東京付近では、空が暗ければ1時間に約60個が目安です。</p>
          <p style={{ margin: 0 }}>
            14日は月が21時ごろまでに沈む見込みです。その後は月明かりの影響がなく、21時ごろからでも、暗い空なら1時間に35〜40個ほどが期待されます。
          </p>
        </section>

        <section style={card} aria-labelledby="viewing-tips">
          <h2 id="viewing-tips" style={heading}>見るコツ</h2>
          <ul style={{ margin: 0, paddingInlineStart: "1.25em" }}>
            <li>街灯が少なく、空を広く見渡せる場所を選びましょう。</li>
            <li>暗い場所に着いたら、15分ほど目を慣らしてから探しましょう。</li>
            <li>上着や手袋などを用意し、体を冷やさないようにしましょう。</li>
          </ul>
        </section>

        <section style={card} aria-labelledby="event-weather">
          <h2 id="event-weather" style={heading}>当日の天気</h2>
          <p style={{ margin: 0 }}>地域ごとの見通しは、12月13日（日）の夕方にこの欄へ追記する予定です。</p>
        </section>

        <footer style={{ marginTop: 24, color: "#c7d9eb" }}>
          <p>見頃と流星数の目安は <a href={source} style={link}>国立天文台「ほしぞら情報 2026年12月」</a> から。</p>
          <Link href="/" style={{ ...link, fontWeight: 700 }}>全国地図に戻る</Link>
        </footer>
      </article>
    </main>
  );
}
