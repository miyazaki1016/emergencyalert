# handover/lrpm-artifact-220

**目的：** 未確認

**実装状態：** mainとの差分を収録。差分ゼロも記録

**検証の扱い：** 未確認

**PR状態：** PR未関連のブランチ差分

**main統合：** 未確認

**本番反映：** 未確認

**残課題：** 未確認

**次の作業：** 関連PR・mainとの同等実装を照合。ブランチの存在だけで未完成扱いしない

根拠取得日時 (UTC)：2026-11-26T11:59:46.668068+00:00


## 実際の変更処理（コードから抽出）

差分・ソースを参照

- [.github/workflows/lrpm-handover.yml](https://github.com/miyazaki1016/emergencyalert/blob/073da5c1959e88765b64be02c3d6ee858c6de25b/.github/workflows/lrpm-handover.yml)：全文
- [design/live-japan-design-mock-spec.md](https://github.com/miyazaki1016/emergencyalert/blob/073da5c1959e88765b64be02c3d6ee858c6de25b/design/live-japan-design-mock-spec.md)：全文
- [design/live-japan-design-mock.html](https://github.com/miyazaki1016/emergencyalert/blob/073da5c1959e88765b64be02c3d6ee858c6de25b/design/live-japan-design-mock.html)：対象外（秘密情報候補／非テキスト）
- [design/nationwide-forecast-display-memo-2026-11-20.md](https://github.com/miyazaki1016/emergencyalert/blob/073da5c1959e88765b64be02c3d6ee858c6de25b/design/nationwide-forecast-display-memo-2026-11-20.md)：全文
- [design/sakidori-design-mock.html](https://github.com/miyazaki1016/emergencyalert/blob/073da5c1959e88765b64be02c3d6ee858c6de25b/design/sakidori-design-mock.html)：対象外（秘密情報候補／非テキスト）
- [lrpm/lrpm-japan-20260101-v1.tar.gz](https://github.com/miyazaki1016/emergencyalert/blob/073da5c1959e88765b64be02c3d6ee858c6de25b/lrpm/lrpm-japan-20260101-v1.tar.gz)：対象外（秘密情報候補／非テキスト）
- [strategy/sakidori-sns-content-strategy-2026-11-15.md](https://github.com/miyazaki1016/emergencyalert/blob/073da5c1959e88765b64be02c3d6ee858c6de25b/strategy/sakidori-sns-content-strategy-2026-11-15.md)：全文
- [verification/nationwide-heavy-rain-verification-design-2026-11-16.md](https://github.com/miyazaki1016/emergencyalert/blob/073da5c1959e88765b64be02c3d6ee858c6de25b/verification/nationwide-heavy-rain-verification-design-2026-11-16.md)：全文

## 検証実行の事実

| ワークフロー | 結果 | 対象SHA |
| --- | --- | --- |
| 実行証拠未取得 | 未確認 | — |

## 当時の説明・結論（原文。作者の主張と実測を区別）

```text

```

## ソース・テスト・資料の抜粋（実行はしない）

### .github/workflows/lrpm-handover.yml

```text
diff --git a/.github/workflows/lrpm-handover.yml b/.github/workflows/lrpm-handover.yml
new file mode 100644
index 00000000..f1d4e5ee
--- /dev/null
+++ b/.github/workflows/lrpm-handover.yml
@@ -0,0 +1,18 @@
+name: lrpm-handover-artifact
+on:
+  push:
+    branches: [handover/lrpm-artifact-220]
+  workflow_dispatch:
+permissions:
+  contents: read
+jobs:
+  upload:
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - uses: actions/upload-artifact@v4
+        with:
+          name: lrpm-japan-20260101-v1
+          path: lrpm/lrpm-japan-20260101-v1.tar.gz
+          retention-days: 7
+          if-no-files-found: error

```

### design/live-japan-design-mock-spec.md

```text
diff --git a/design/live-japan-design-mock-spec.md b/design/live-japan-design-mock-spec.md
new file mode 100644
index 00000000..24190ae6
--- /dev/null
+++ b/design/live-japan-design-mock-spec.md
@@ -0,0 +1,56 @@
+# LIVE JAPAN デザインモック — 再現用パーツ分解
+
+対象モック： `live-japan-design-mock.html`（単一ファイル、外部依存なし。そのままブラウザで開ける）
+位置づけ： さきどり（emergencyalert.news）の最終トップページ「LIVE JAPAN」（呼び名は仮称・正式名称未決定）の全体像モック。製品憲章 `docs/SAKIKURU_PRODUCT_CHARTER.md` §1 の構想に基づく。数値はすべて 2026-11-24 の大雨事例に基づく埋め込みサンプルであり、本番データではない。
+
+## 1. 全体構成（上から）
+
+1. ヘッダー： 「さきどり」ワードマーク＋タグライン「日本の今と、少し先の未来。」＋ MYアメふるへの固定ナビ
+2. 状態切替： 3状態セグメント（平常時／雨のとき／大雨の日）。実運用ではデータ側の状態で自動的に顔が変わる想定。モックでは手動切替で3つの顔を確認できる
+3. 地図： 画面の主役。ドット＋簡略ポリゴンの日本地図（模式図）。全国表示⇔関東・東海拡大の切替
+4. 時間軸： 「これまで・いま・このあと」＋再生ボタン＋予報対象時刻の表示
+5. 自治体カード： 地図で選んだ自治体の詳細（名前・都道府県・強さの級・予報対象時刻・そのタイルの基準時刻）
+6. 全国の大雨一覧： 地図の相棒として下に配置（地図で掴み、一覧で確認する）
+7. フッター： 出典（気象庁）・データは公的機関のものを加工しない旨
+
+## 2. デザイントークン
+
+- 基調： 既存承認モックの「暗いレーダー管制室」（近黒背景、細いグリッド、抑えた発光）を継承。平常時のみ暖色寄りの柔らかいトーンに寄せ、警戒時に管制室の顔へ寄せる二面性
+- 強さの色（気象庁カラー、データ色は演出色と混ぜない）：
+  - 30mm/h以上50未満： `#FF9900`
+  - 50以上80未満： `#FF2800`
+  - 80以上： `#B40068`
+- 未取得： 斜線ハッチ＋「未取得」の文字で示す。空白（＝雨なし）にしない
+- 凡例： 色に数値範囲を必ず併記する
+
+## 3. 地図レイヤー（重ね順）
+
+1. 地形ベース（ドット／簡略ポリゴン）
+2. 演出レイヤー（平常時のみ）： 太陽位置による昼夜グラデーション＋季節の淡い色味。データ色とは色相を分け、観測と誤認させない
+3. 雨域レイヤー（形）： レーダー状の雨の形。時間軸の予報対象時刻ごとに切り替わる
+4. 自治体レイヤー（色）： 級ごとの自治体強調。80mm/h以上は大雨状態で脈動
+5. 状態レイヤー： 未取得の斜線、帯の要約チップ（例「東海の帯 13:30ごろピーク」）
+
+## 4. 状態ごとの振る舞い
+
+- 平常時： 演出レイヤーのみ＋主要都市の気温を小さく。データ表示は最小限で静かに
+- 雨のとき： 雨域レイヤー＋自治体レイヤーを表示。時間軸の再生／スクラブで、公式予報の有効時刻どおりに雨域と自治体の色が連動して変わる（架空のフレームは作らない）
+- 大雨の日： 管制室の顔。危険情報を最優先し、80mm/h以上の脈動、帯ごとの要約チップ、出典・基準時刻・鮮度を常時表示
+
+## 5. 常時表示する情報（鮮度と出所）
+
+- 出典： 気象庁
+- 基準時刻（タイルごとに異なる場合は自治体カード側にもそのタイルの基準時刻を出す）
+- 予報対象時刻（JST）
+- 旧版採用と未取得は区別する（旧版はその版の時刻を出す）
+
+## 6. サンプルデータ（大雨の日シナリオ）
+
+2026-11-24 の実事例： 東海・伊豆の帯。80mm/h以上＝箱根町（13:30〜）、小田原市（13:40〜）、南足柄市（13:35〜）、三島市・裾野市・函南町（13:30〜）ほか計23地域。モック内では御殿場市を「未取得」の見せ方のサンプルとして斜線表示している（実際の取得状態とは無関係）。
+
+## 7. 実装へ渡すときの対応づけ
+
+- 地図操作・時間軸の構成は既存試作 PR #61（LIVE JAPAN プロトタイプ）を再利用する前提。作り直さない
+- 予報データは既存の公開API（全国大雨予報、タイルごとの版・取得範囲つき）を読む。表示層のみ
+- 第1段階（自治体の色のみ）と後続（雨域の形の重ね＋アニメーション）の段階分けは、フロント担当の #293 提案と整合させる。本モックは全体像（完成形の見え方）を示すもので、段階分け自体は変更しない
+- 自治体形状の配布形式、地図素材の利用条件・出典表記は未確定（#293 報告の未決事項のまま）

```

### design/live-japan-design-mock.html

```text
diff --git a/design/live-japan-design-mock.html b/design/live-japan-design-mock.html
new file mode 100644
index 00000000..39164e98
--- /dev/null
+++ b/design/live-japan-design-mock.html
@@ -0,0 +1,584 @@
+<!doctype html>
+<html lang="ja">
+<head>
+<meta charset="utf-8">
+<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
+<meta name="color-scheme" content="dark">
+<link rel="icon" href="data:,">
+<title>LIVE JAPAN デザインモック — さきどり</title>
+<style>
+  :root{
+    --bg:#07090d; --bg2:#0b0f16; --panel:#0e141f; --panel2:#111a29;
+    --line:#1e2a3d; --line2:#2a3a52;
+    --text:#e8edf3; --muted:#8b9bb0; --muted2:#5f718a;
+    --amber:#f5c86b; --teal:#38d9c5;
+    --c30:#FF9900; --c50:#FF2800; --c80:#B40068;
+    --radius:14px;
+  }
+  *{box-sizing:border-box}
+  html,body{margin:0;background:var(--bg);color:var(--text);font-family:"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
+  a{color:inherit;text-decoration:none}
+  button{font:inherit;cursor:pointer}
+  /* header */
+  .topbar{position:sticky;top:0;z-index:30;background:rgba(7,9,13,.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
+  .topbar-inner{max-width:1080px;margin:0 auto;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
+  .brand{display:flex;align-items:center;gap:12px;min-width:0}
+  .mark{width:36px;height:36px;border-radius:9px;background:#0f1a2b;border:1px solid var(--line2);display:grid;place-items:center;flex-shrink:0}
+  .mark i{display:block;width:18px;height:18px;border-radius:50%;background:radial-gradient(circle at 35% 35%, #7dd3fc, #0ea5e9 45%, transparent 70%);box-shadow:0 0 12px rgba(56,189,248,.6);position:relative}
+  .mark i:after{content:"";position:absolute;inset:5px;border:1px solid rgba(255,255,255,.7);border-radius:50%;border-top-color:transparent;transform:rotate(40deg)}
+  .brand-text{line-height:1.1}
+  .brand-text strong{font-size:20px;letter-spacing:.08em;font-weight:800}
+  .brand-text strong span{color:var(--teal)}
+  .brand-text p{margin:2px 0 0;font-size:11px;letter-spacing:.06em;color:var(--muted);white-space:nowrap}
+  .my-btn{flex-shrink:0;display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:8px 13px;border-radius:999px;background:#fff;color:#0a0f16;font-weight:700;font-size:13px;border:1px solid #fff}
+  .my-btn small{font-weight:600;background:#0a0f16;color:#fff;font-size:10px;padding:2px 6px;border-radius:999px;letter-spacing:.04em}
+  /* layout */
+  .wrap{max-width:1080px;margin:0 auto;padding:14px 14px 0}
+  /* segmented */
+  .seg-wrap{background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:4px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px}
+  .seg-wrap button{min-height:44px;border:0;border-radius:999px;background:transparent;color:var(--muted);font-weight:700;font-size:13.5px;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1;padding:6px 2px}
+  .seg-wrap button span{font-size:10px;font-weight:500;opacity:.75;margin-top:2px;letter-spacing:.03em}
+  .seg-wrap button[aria-pressed="true"]{background:#e8edf3;color:#0a0f16}
+  body[data-state="heavy"] .seg-wrap button[aria-pressed="true"]{background:var(--c80);color:#fff}
+  body[data-state="rain"] .seg-wrap button[aria-pressed="true"]{background:#12263f;color:#7dd3fc;box-shadow:inset 0 0 0 1px #2a4a6b}
+  .state-desc{margin:10px 2px 0;font-size:12.5px;line-height:1.6;color:var(--muted)}
+  .state-desc strong{color:var(--text)}
+  /* meta bar */
+  .meta-bar{margin-top:12px;display:flex;flex-wrap:wrap;gap:6px}
+  .meta-bar div{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:7px 9px;font-size:11px;line-height:1.3;color:var(--muted)}
+  .meta-bar b{color:var(--text);font-weight:700}
+  .meta-bar .live-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.15);margin-right:5px;vertical-align:1px}
+  body[data-state="heavy"] .meta-bar .live-dot{background:#f43f5e;box-shadow:0 0 0 4px rgba(244,63,94,.15)}
+  /* map card */
+  .map-card{margin-top:12px;background:radial-gradient(120% 90% at 50% 0%, #101a2a 0%, #0a0f18 55%, #07090d 100%);border:1px solid var(--line);border-radius:18px;overflow:hidden;position:relative}
+  body[data-state="calm"] .map-card{background:radial-gradient(120% 100% at 20% 0%, #1a1a14 0%, #121a22 38%, #0b111a 100%)}
+  body[data-state="heavy"] .map-card{border-color:#3a1a2e;background:radial-gradient(120% 90% at 70% 20%, #1c0f1a 0%, #0a0f18 55%)}
+  .map-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:14px 14px 6px}
+  .map-head h1{margin:0;font-size:18px;line-height:1.25;letter-spacing:.02em}
+  .map-head h1 em{font-style:normal;color:var(--amber)}
+  body[data-state="heavy"] .map-head h1 em{color:#ff6b9d}
+  .map-head p{margin:5px 0 0;font-size:12px;line-height:1.5;color:var(--muted)}
+  .zoom-toggle{display:flex;background:#0a0f16;border:1px solid var(--line2);border-radius:999px;padding:3px;flex-shrink:0}
+  .zoom-toggle button{min-height:36px;border:0;background:transparent;color:var(--muted);font-size:12px;font-weight:700;padding:6px 11px;border-radius:999px}
+  .zoom-toggle button.active{background:#fff;color:#000}
+  .map-stage{position:relative;margin:2px 10px 0;border-radius:12px;overflow:hidden;background:
+    linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
+    linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
+    background-size:28px 28px;background-color:#080d14}
+  body[data-state="calm"] .map-stage{background-color:#0d141d}
+  .map-stage svg{display:block;width:100%;height:auto}
+  .map-viewport{transition:transform .6s cubic-bezier(.2,.8,.2,1);transform-origin:68% 62%}
+  .map-stage.zoomed .map-viewport{transform:scale(2.05)}
+  /* chips on map */
+  .band-chip{position:absolute;z-index:4;background:rgba(7,9,13,.88);border:1px solid var(--line2);backdrop-filter:blur(6px);border-radius:999px;padding:6px 10px;font-size:11px;font-weight:700;line-height:1.2;display:none;align-items:center;gap:6px}
+  .band-chip i{width:8px;height:8px;border-radius:50%;flex-shrink:0}
+  body[data-state="heavy"] .band-chip{display:inline-flex}
+  .chip-a{top:12px;left:12px}
+  .chip-b{top:46px;left:12px}
+  .chip-a i{background:var(--c80);box-shadow:0 0 10px var(--c80)}
+  .chip-b i{background:var(--c50);box-shadow:0 0 10px var(--c50)}
+  .unknown-label{position:absolute;right:12px;top:12px;z-index:4;display:none;background:repeating-linear-gradient(45deg,#1a2436 0 6px,#0e1622 6px 12px);border:1px dashed #5b6f8d;color:#cbd5e1;font-size:11px;font-weight:700;padding:7px 9px;border-radius:8px}
+  body[data-state="heavy"] .unknown-label{display:block}
+  /* legend + freshness inside map */
+  .map-foot{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:flex-end;padding:10px 14px 14px}
+  .legend{display:flex;flex-wrap:wrap;gap:6px}
+  .legend span{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);background:rgba(255,255,255,.04);border:1px solid var(--line);padding:6px 8px;border-radius:999px}
+  .legend i{width:10px;height:10px;border-radius:3px;display:inline-block}
+  .fresh{font-size:11px;line-height:1.5;color:var(--muted);text-align:right}
+  .fresh b{color:var(--text)}
+  /* time axis */
+  .time-panel{margin-top:12px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px 14px 14px}
+  .time-panel[hidden]{display:none}
+  .time-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
+  .time-top label{font-size:12px;font-weight:700;letter-spacing:.04em}
+  .time-top output{font-variant-numeric:tabular-nums;font-weight:800;font-size:15px}
+  .time-top output small{font-size:11px;color:var(--muted);font-weight:600}
+  .play-btn{width:44px;height:44px;border-radius:50%;border:1px solid var(--line2);background:#fff;color:#000;display:grid;place-items:center;flex-shrink:0;font-size:16px}
+  .play-btn[aria-pressed="true"]{background:var(--teal);border-color:var(--teal)}
+  .scrub{margin-top:10px}
+  input[type="range"]{width:100%;accent-color:#38bdf8;height:36px}
+  .time-labels{display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-top:2px}
+  .time-labels b{color:var(--text)}
+  .ticks{display:flex;justify-content:space-between;margin-top:6px}
+  .ticks button{min-height:36px;flex:1;border:0;background:transparent;color:var(--muted);font-size:11px;font-variant-numeric:tabular-nums;font-weight:700;padding:4px 0;border-top:2px solid var(--line)}
+  .ticks button.active{color:#fff;border-top-color:#38bdf8}
+  /* detail + list grid */
+  .below{display:grid;gap:12px;margin-top:12px}
+  @media(min-width:760px){.below{grid-template-columns:1fr 1.15fr}}
+  .card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px}
+  .card h2{margin:0;font-size:13px;letter-spacing:.06em;color:var(--muted);font-weight:700}
+  .detail-main{display:flex;justify-content:space-between;gap:12px;margin-top:10px;align-items:flex-start}
+  .detail-main h3{margin:0;font-size:22px;line-height:1.1}
+  .detail-main p{margin:4px 0 0;font-size:12px;color:var(--muted)}
+  .badge{flex-shrink:0;text-align:center;border-radius:10px;padding:9px 10px;min-width:86px;color:#fff}
+  .badge strong{display:block;font-size:18px;line-height:1}
+  .badge span{font-size:11px;opacity:.9}
+  .badge.c0{background:#1e2a3d;color:var(--muted)}
+  .badge.c1{background:var(--c30);color:#1a1000}
+  .badge.c2{background:var(--c50)}
+  .badge.c3{background:var(--c80)}
+  .badge.unknown{background:repeating-linear-gradient(45deg,#243044 0 6px,#182233 6px 12px);color:#e2e8f0;border:1px dashed #64748b}
+  .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
+  .detail-grid div{background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:9px 10px}
+  .detail-grid dt{font-size:11px;color:var(--muted)}
+  .detail-grid dd{margin:3px 0 0;font-size:13px;font-weight:700}
+  .hint{margin:10px 0 0;font-size:11.5px;line-height:1.6;color:var(--muted)}
+  /* list */
+  .list-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
+  .list-head span{font-size:11px;color:var(--muted);background:var(--bg2);border:1px solid var(--line);padding:4px 7px;border-radius:999px;white-space:nowrap}
+  .rain-list{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:7px}
+  .rain-list li{margin:0}
+  .rain-list button{width:100%;min-height:52px;display:flex;align-items:center;gap:10px;text-align:left;background:var(--bg2);border:1px solid var(--line);border-radius:11px;padding:9px 11px;color:var(--text)}
+  .rain-list button.selected{border-color:#7dd3fc;box-shadow:0 0 0 1px #7dd3fc inset}
+  .dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}
+  .dot.calm{background:#334155;border:1px solid #475569}
+  .dot.c1{background:var(--c30)} .dot.c2{background:var(--c50)} .dot.c3{background:var(--c80);box-shadow:0 0 10px rgba(180,0,104,.8)}
+  .dot.unknown{background:repeating-linear-gradient(45deg,#475569 0 3px,#1e293b 3px 6px);border:1px solid #64748b;border-radius:4px}
+  @keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.35);opacity:.65}}
+  body[data-state="heavy"] .dot.c3{animation:pulse 1.4s ease-in-out infinite}
+  .rain-list b{font-size:14px}
+  .rain-list small{display:block;font-size:11px;color:var(--muted);margin-top:1px}
+  .rain-list em{margin-left:auto;font-style:normal;font-weight:800;font-size:13px;white-space:nowrap}
+  /* calm cities */
+  .calm-note{display:none;margin-top:12px;background:linear-gradient(135deg,#171a12,#0e141f);border:1px solid #2a2f22;border-radius:14px;padding:14px}
+  body[data-state="calm"] .calm-note{display:block}
+  .calm-note h2{margin:0;font-size:13px;color:#d6c9a8;letter-spacing:.05em}
+  .calm-note p{margin:6px 0 0;font-size:12.5px;line-height:1.7;color:var(--muted)}
+  .city-temps{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
+  .city-temps span{font-size:12px;background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:999px;padding:6px 9px}
+  .city-temps b{color:var(--amber)}
+  /* footer */
+  footer{max-width:1080px;margin:18px auto 0;padding:16px 16px 28px;border-top:1px solid var(--line);color:var(--muted);font-size:11.5px;line-height:1.7}
+  footer strong{color:var(--text)}
+  .foot-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
+  .foot-links a{min-height:36px;display:inline-flex;align-items:center;padding:6px 10px;border:1px solid var(--line);border-radius:999px;font-size:12px;font-weight:700;color:var(--text);background:var(--panel)}
+  /* svg muni */
+  .muni{cursor:pointer}
+  .muni circle.core{stroke:#07090d;stroke-width:1.5}
+  .muni text{font-size:9px;fill:#e8edf3;font-weight:700;paint-order:stroke;stroke:#07090d;stroke-width:3px;pointer-events:none}
+  .muni.selected circle.halo{fill:none;stroke:#7dd3fc;stroke-width:1.5}
+  body[data-state="heavy"] .muni.c3 circle.core{animation:pulse 1.4s ease-in-out infinite;transform-origin:center;transform-box:fill-box}
+  .city-label{font-size:9.5px;fill:#cbd5e1;font-weight:600;paint-order:stroke;stroke:#07090d;stroke-width:3px}
+  .city-temp{font-size:9px;fill:#f5c86b;font-weight:700;paint-order:stroke;stroke:#07090d;stroke-width:3px}
+  @media(max-width:520px){
+    .brand-text p{display:block;font-size:10px;white-space:normal;line-height:1.35}
+    .brand-text strong{font-size:17px}
+    .map-head{flex-direction:column}
+    .zoom-toggle{align-self:flex-start}
+    .fresh{text-align:left}
+    .chip-b{top:auto;bottom:12px;left:12px}
+    .unknown-label{top:52px}
+    .band-chip{max-width:62%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
+  }
+  @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
+</style>
+</head>
+<body data-state="calm">
+<header class="topbar">
+  <div class="topbar-inner">
+    <div class="brand">
+      <div class="mark" aria-hidden="true"><i></i></div>
+      <div class="brand-text">
+        <strong>さきどり <span>LIVE JAPAN</span></strong>
+        <p>日本の今と、少し先の未来。 — 呼び名は仮称</p>
+      </div>
+    </div>
+    <a class="my-btn" href="#my">MYアメふる <small>登録地点</small></a>
+  </div>
+</header>
+
+<main class="wrap">
+  <!-- State switch -->
+  <div class="seg-wrap" role="group" aria-label="表示状態の切り替え">
+    <button type="button" data-set-state="calm" aria-pressed="true">平常時<span>何もない日の顔</span></button>
+    <button type="button" data-set-state="rain" aria-pressed="false">雨のとき<span>形 ＋ 色の二重表示</span></button>
+    <button type="button" data-set-state="heavy" aria-pressed="false">大雨の日<span>2026年11月24日事例</span></button>
+  </div>
+  <p class="state-desc" id="stateDesc"><strong>平常時：</strong>雨がない日でも開きたくなる、静かな日本の地図。昼夜と季節の演出はデータの色と分けてあります。</p>
+
+  <!-- Freshness / source always visible -->
+  <div class="meta-bar" aria-label="出典と鮮度">
+    <div><span class="live-dot"></span><b id="metaStatus">平常時 — 特別な警戒なし</b></div>
+    <div>出典： <b>気象庁</b>（降水短時間予報・ナウキャスト）</div>
+    <div>基準時刻： <b id="metaBase">2026/11/24 12:50</b></div>
+    <div>予報対象： <b id="metaValid">13:00 時点</b></div>
+  </div>
+
+  <!-- MAP -->
+  <section class="map-card" aria-label="日本地図">
+    <div class="map-head">
+      <div>
+        <h1 id="mapTitle">いまの日本は、<em>穏やかな午後</em>です</h1>
+        <p id="mapSub">太陽の位置に合わせた昼夜のグラデーションと、晩秋の淡い色味。観測データではない演出として、色の体系を分けています。</p>
+      </div>
+      <div class="zoom-toggle" role="group" aria-label="地図の拡大">
+        <button type="button" id="zoomNational" class="active">全国</button>
+        <button type="button" id="zoomDetail">関東・東海を拡大</button>
+      </div>
+    </div>
+
+    <div class="map-stage" id="mapStage">
+      <div class="band-chip chip-a"><i></i>東海の帯 — 13:30ごろピーク</div>
+      <div class="band-chip chip-b"><i></i>伊豆・箱根 — 80mm/h超が継続</div>
+      <div class="unknown-label">〰 御殿場市付近：未取得（不明）</div>
+
+      <svg viewBox="0 0 360 400" role="img" aria-label="日本地図（模式図）" id="japanSvg">
+        <defs>
+          <radialGradient id="sunGrad" cx="62%" cy="38%" r="75%">
+            <stop offset="0%" stop-color="#f5c86b" stop-opacity=".28"/>
+            <stop offset="42%" stop-color="#f5c86b" stop-opacity=".08"/>
+            <stop offset="72%" stop-color="#0b1220" stop-opacity=".05"/>
+            <stop offset="100%" stop-color="#020617" stop-opacity=".55"/>
+          </radialGradient>
+          <linearGradient id="seasonGrad" x1="0" y1="0" x2="1" y2="1">
+            <stop offset="0%" stop-color="#b45309" stop-opacity=".10"/>
+            <stop offset="55%" stop-color="#0f766e" stop-opacity=".05"/>
+            <stop offset="100%" stop-color="#1e3a5f" stop-opacity=".12"/>
+          </linearGradient>
+          <filter id="blur18" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="14"/></filter>
+          <filter id="blur10" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8"/></filter>
+          <pattern id="hatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
+            <rect width="7" height="7" fill="#162033"/><line x1="0" y1="0" x2="0" y2="7" stroke="#64748b" stroke-width="2"/>
+          </pattern>
+          <pattern id="dotPat" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="#3a4f6d"/></pattern>
+        </defs>
+
+        <g class="map-viewport" id="mapViewport">
+          <!-- Land silhouette: stylized simplified polygon -->
+          <path d="M286 18 L330 10 L352 34 L344 68 L312 84 L282 62 L272 36 Z
+                   M268 92 L292 104 L282 132 L258 150 L238 178 L228 208 L208 238 L186 262 L158 282 L128 302 L102 326 L84 350 L66 342 L78 316 L98 292 L122 268 L148 242 L168 214 L186 184 L204 152 L226 124 L248 100 Z
+                   M96 306 L118 316 L112 340 L84 348 
```

### design/nationwide-forecast-display-memo-2026-11-20.md

```text
diff --git a/design/nationwide-forecast-display-memo-2026-11-20.md b/design/nationwide-forecast-display-memo-2026-11-20.md
new file mode 100644
index 00000000..20f45667
--- /dev/null
+++ b/design/nationwide-forecast-display-memo-2026-11-20.md
@@ -0,0 +1,72 @@
+# 全国大雨予報リスト 表示改善メモ（2026-11-20）
+
+作成：Muse（企画側）。宛先：制作側（ChatGPT側ソラ）。
+根拠：2026-11-20 18:09〜18:10 の実物スクリーンショット14枚（emergencyalert.news トップの全国大雨予報リスト）と、承認済みデザインモック v6（2026-11-15）の決定事項。
+
+## 0. 実物で観測した事実
+
+- 詳細予報（30分先まで・250m）のリストが正常に表示されている。80mm/h以上が4件（新潟県 長岡市・小千谷市・魚沼市、鹿児島県 龍郷町）、50mm/h以上が10件、30mm/h以上が少なくとも28件。スクショの範囲でも合計42件以上あり、リストはさらに続く。
+- カード構成は全件共通：都道府県（小）／市区町村名（大）／クラス数値（特大）／対象時刻の羅列／「雨雲の動きを見る」ボタン。カード内の余白が大きい。
+- 並びはクラス降順（80→50→30）。同一クラス内は都道府県が飛ぶ（新潟→鹿児島→新潟→石川…）ため、地理的なまとまりは読み取れない。
+- 35〜60分先の予報（1km）は最下部に「この時間帯の予報は現在取得できていません」と表示されている。
+
+## 1. 問題点（優先順）
+
+### P1. 全体像（要約）がない
+今夜の本当のニュースは「新潟・北陸に集中、最強は80mm/h超、鹿児島にも飛び地」という全体像だが、カードを読み進めないと分からない。ファーストビューで状況がつかめない。
+
+### P2. 長くて密度が低い
+40件超の同形カードが縦に続く。各カードの情報量（県・市町村・数字・時刻・ボタン）に対して面積が大きく、スクロール量の割に得られる情報が少ない。途中で読むのをやめる前提の設計になっていない。
+
+### P3. 時刻の羅列が読みにくい
+「18:10、18:15、18:20、18:25、18:30」では、知りたいこと（何時ごろから強まるか、どれくらい続くか）が読み取りにくい。
+
+### P4. 並び順に地理の軸がない
+クラス降順は妥当だが、同一クラス内は県単位でまとまっていないため、「自分の県はどうか」を探しにくい。
+
+### P5. クラスの色の確認
+80以上＝ピンク系、50＝サーモン系、30＝淡い橙で表示されている。JMA本家の色（30–50：#FF9900、50–80：#FF2800、80以上：#B40068）と「クラス↔色」の対応が一致しているか確認したい。利用者が他媒体で覚えた色と一致することが、瞬時の理解につながる。
+
+### P6. 未取得表示と鮮度の見え方
+- 延長帯（35〜60分）の未取得表示がリスト最下部にあり、到達する利用者はほぼいない。害は小さいが、置き場所は要検討。
+- 基準時刻（いつの予報か）がファーストビューで見えるかはスクショ範囲では未確認。予報リストは鮮度が命なので、基準時刻と「あと何分先までか」は常に見える位置に置くべき。
+
+## 2. 改善案
+
+モック v6 の承認済み決定を基準にする（大きな日本地図ヒーローは予報ページに置かない、要約ストリップ、カードに雨雲アニメーション、30mm/h以上のみ表示、色はJMA本家）。
+
+### A. 先頭に要約ストリップ（P1対応）
+- 例：「80mm/h以上 4件を含む 42市区町村／最も強いのは新潟県（80mm/h以上）／対象は18:30まで」のような1〜2行。
+- 件数・最強クラス・主な都道府県・対象時刻の上限だけに絞る。地図ヒーローは置かない（モック決定どおり）。
+
+### B. 県でグループ化し、カードを詰める（P2・P4対応）
+- クラス降順を維持しつつ、同一クラス内は都道府県でまとめる（県見出し＋その県の市区町村）。
+- カードは「県名＋市町村名＋クラス＋開始時刻」を1〜2行に収める密な行形式も検討。大きな数字の見せ方は最強クラス帯だけに残すなど、全部を同じ大きさにしない。
+- 「雨雲の動きを見る」はカード全体タップに寄せ、ボタンUIの反復を減らす。
+
+### C. 時刻は「開始＋帯」で見せる（P3対応）
+- 主表示は「18:10ごろから」＋継続を示す帯（対象枠内のミニタイムライン）。詳細な5分刻みは展開時に出す。
+- クラスが上がる時刻（例：30→50に強まる）がある場合は、それも帯の色分けで表現できる。
+
+### D. 色はJMA本家に統一（P5対応）
+- クラス色はJMA本家の3色を基準にする。暗背景で文字色として使う場合は視認性のための明度調整のみ可とし、クラスと色の対応関係は崩さない。
+- モック v6 のカードアニメーション（レーダーGIF風の雨雲）も本家色で統一済みなので、実物側もそれに寄せる。
+
+### E. 未取得・鮮度の置き方（P6対応）
+- 基準時刻と対象範囲（例：「18:05基準・18:35までの予報」）を要約ストリップに含める。
+- 延長帯が未取得のときは、詳細帯の末尾ではなく延長帯セクションの見出し位置で短く示す。全帯が未取得のときの表示（17:01の「現在、全国の予報を確認できません」）は現行の正直な表示を維持する。
+
+## 3. 変えないこと
+
+- データ原則：表示の工夫のみで、公的機関のデータ自体には手を入れない。
+- 対象は30mm/h以上の市区町村のみ（現行仕様・モック決定どおり）。
+- 取れていないものを取れているように見せない（未取得は未取得と書く）。
+
+## 4. 未決・確認事項
+
+- 要約ストリップの文言と更新タイミング（毎枠自動生成でよいか）。
+- 行形式にした場合の「雨雲の動き」の見せ方（モックのアニメーションをどこに残すか）。
+- 基準時刻表示の現行実装の有無（スクショ範囲外の確認）。
+- 並び順：クラス降順＋県まとめ、で確定してよいか（県を先にしクラスは県内順、という案もあり得る）。
+
+以上は表示の設計メモであり、実装指示ではない。採用範囲は制作側とユーザーの判断で決めること。

```

### design/sakidori-design-mock.html

```text
diff --git a/design/sakidori-design-mock.html b/design/sakidori-design-mock.html
new file mode 100644
index 00000000..ca415538
--- /dev/null
+++ b/design/sakidori-design-mock.html
@@ -0,0 +1,1266 @@
+<!doctype html>
+<html lang="ja">
+  <head>
+    <meta charset="utf-8" />
+    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
+    <meta name="color-scheme" content="dark" />
+    <link rel="icon" href="data:," />
+    <title>さきどり ― 全国大雨予報 / MYアメふる（デザイン案）</title>
+    <link rel="preconnect" href="https://fonts.googleapis.com" />
+    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
+    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&family=IBM+Plex+Mono:wght@500;600;700&display=swap" rel="stylesheet" />
+    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
+    <style>
+      button, [role="button"], select, summary, input:not([type="checkbox"], [type="radio"]) { min-height: 2rem; }
+
+      :root{
+        --bg:#04070f;
+        --bg2:#060d1d;
+        --panel:rgba(12,24,44,.78);
+        --panel-solid:#0b1626;
+        --panel-soft:rgba(20,38,66,.55);
+        --line:rgba(110,170,255,.16);
+        --line-strong:rgba(110,170,255,.32);
+        --ink:#eaf2ff;
+        --mut:#93a9c9;
+        --dim:#5f7594;
+        --cyan:#3ae2ff;
+        --sky:#6fd3ff;
+        --blue:#3b9dff;
+        --yellow:#ffd23e;
+        --orange:#ff8a3c;
+        --red:#ff2800; /* JMA 50–80mm/h */
+        --green:#5ee08a;
+        --mono:"IBM Plex Mono", ui-monospace, monospace;
+        --sans:"Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif;
+      }
+      *{ box-sizing:border-box; }
+      html{ scroll-behavior:smooth; }
+      body{
+        margin:0; background:var(--bg); color:var(--ink);
+        font-family:var(--sans); font-size:15px; line-height:1.65;
+        -webkit-font-smoothing:antialiased;
+      }
+      /* faint radar grid backdrop */
+      body::before{
+        content:""; position:fixed; inset:0; z-index:0; pointer-events:none;
+        background:
+          radial-gradient(900px 480px at 85% -80px, rgba(38,110,220,.16), transparent 60%),
+          radial-gradient(700px 420px at -120px 30%, rgba(58,226,255,.07), transparent 60%),
+          linear-gradient(rgba(90,140,220,.045) 1px, transparent 1px),
+          linear-gradient(90deg, rgba(90,140,220,.045) 1px, transparent 1px);
+        background-size:auto,auto,44px 44px,44px 44px;
+      }
+      .wrap{ position:relative; z-index:1; max-width:1120px; margin:0 auto; padding:0 16px 64px; }
+
+      /* ---------- header / tabs ---------- */
+      header.site{
+        position:sticky; top:0; z-index:60;
+        background:rgba(4,8,16,.82); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
+        border-bottom:1px solid var(--line);
+      }
+      .site-in{ max-width:1120px; margin:0 auto; padding:10px 16px; display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
+      .brand{ display:flex; align-items:baseline; gap:10px; min-width:0; }
+      .brand .logo{ font-weight:900; font-size:24px; letter-spacing:.14em; line-height:1; }
+      .brand .logo em{ font-style:normal; color:var(--cyan); }
+      .brand .tag{ font-size:11px; color:var(--mut); letter-spacing:.08em; white-space:nowrap; }
+      .live-dot{ display:inline-flex; align-items:center; gap:6px; font-family:var(--mono); font-size:11px; color:var(--green); letter-spacing:.08em; }
+      .live-dot i{ width:8px; height:8px; border-radius:50%; background:var(--green); box-shadow:0 0 10px var(--green); animation:blink 2.2s infinite; }
+      @keyframes blink{ 0%,100%{opacity:1} 50%{opacity:.35} }
+      nav.tabs{ margin-left:auto; display:flex; gap:6px; background:rgba(16,30,54,.7); border:1px solid var(--line); border-radius:999px; padding:4px; }
+      nav.tabs button{
+        border:0; cursor:pointer; font-family:var(--sans); font-weight:700; font-size:13.5px;
+        color:var(--mut); background:transparent; border-radius:999px; padding:8px 18px; min-height:40px;
+        transition:color .2s, background .2s;
+      }
+      nav.tabs button[aria-selected="true"]{ background:linear-gradient(180deg,#1d5fd6,#144a9e); color:#fff; box-shadow:0 2px 14px rgba(38,110,220,.45); }
+      nav.tabs button:focus-visible{ outline:2px solid var(--cyan); outline-offset:2px; }
+
+      .view{ display:none; }
+      .view.active{ display:block; animation:fadein .35s ease; }
+      @keyframes fadein{ from{opacity:0; transform:translateY(6px)} to{opacity:1; transform:none} }
+
+      /* ---------- summary strip ---------- */
+      .summary-strip{
+        margin-top:18px; display:flex; gap:22px; flex-wrap:wrap; align-items:flex-start;
+        background:var(--panel); border:1px solid var(--line-strong); border-radius:20px; padding:24px 22px 20px;
+        backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
+        box-shadow:0 24px 60px rgba(0,0,0,.45);
+        position:relative; overflow:hidden;
+      }
+      .summary-strip::before{ content:""; position:absolute; inset:0 0 auto 0; height:3px; background:linear-gradient(90deg, var(--cyan), var(--blue), var(--yellow)); }
+      .sum-main{ flex:1 1 290px; min-width:0; }
+      .sum-main h1{ margin:0; font-size:clamp(24px,4.6vw,34px); font-weight:900; letter-spacing:.04em; line-height:1.25; }
+      .sum-main h1 .accent{ color:var(--cyan); }
+      .sum-main p{ margin:8px 0 0; color:var(--mut); font-size:13.5px; max-width:36em; }
+      .threshold-note{ display:inline-flex; align-items:center; gap:7px; margin-top:12px; background:rgba(255,153,0,.13); border:1px solid rgba(255,153,0,.55); color:#ffc46b; border-radius:999px; padding:6px 13px; font-size:12.5px; font-weight:700; letter-spacing:.02em; }
+      .threshold-note i{ width:8px; height:8px; border-radius:50%; background:#FF9900; flex:0 0 auto; }
+      .map-link{ display:inline-block; margin-top:12px; color:var(--sky); font-size:13.5px; font-weight:700; text-decoration:none; border-bottom:1px solid rgba(111,211,255,.45); padding-bottom:1px; }
+      .map-link:hover{ color:var(--cyan); border-bottom-color:var(--cyan); }
+      .sum-side{ flex:1 1 300px; min-width:0; display:flex; flex-direction:column; gap:12px; }
+      .sum-side .stat-chip{ flex:1 1 104px; }
+      .leaflet-container{ font-family:var(--sans); }
+      .stat-chips{ display:flex; gap:8px; flex-wrap:wrap; pointer-events:auto; }
+      .stat-chip{
+        background:rgba(6,14,28,.78); border:1px solid var(--line-strong); border-radius:12px;
+        padding:8px 14px; backdrop-filter:blur(8px); min-width:104px;
+      }
+      .stat-chip .k{ font-size:10.5px; color:var(--mut); letter-spacing:.1em; }
+      .stat-chip .v{ font-family:var(--mono); font-size:22px; font-weight:700; line-height:1.15; }
+      .stat-chip .v small{ font-size:12px; color:var(--mut); font-weight:500; }
+      .stat-chip .v.hot{ color:var(--red); }
+
+      /* rain intensity legend */
+      .legend{ display:flex; gap:6px; align-items:center; flex-wrap:wrap; font-size:11px; color:var(--mut); }
+      .legend .sw{ width:14px; height:10px; border-radius:3px; display:inline-block; vertical-align:-1px; margin-right:3px; border:1px solid rgba(255,255,255,.22); }
+      .legend .lg-title{ font-weight:700; color:var(--ink); letter-spacing:.06em; }
+
+
+      /* ---------- sections & cards ---------- */
+      section.block{ margin-top:38px; }
+      .sec-head{ display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; margin-bottom:14px; }
+      .sec-head h2{ margin:0; font-size:21px; font-weight:900; letter-spacing:.03em; }
+      .sec-head .when{ font-family:var(--mono); font-size:12px; color:var(--cyan); letter-spacing:.1em; }
+      .sec-head p{ margin:0; color:var(--mut); font-size:13px; }
+      .sec-head .bar{ flex:1; height:1px; background:linear-gradient(90deg, var(--line-strong), transparent); min-width:40px; align-self:center; }
+
+      .cards{ display:grid; grid-template-columns:repeat(auto-fill, minmax(248px, 1fr)); gap:12px; }
+      .rain-card{
+        background:var(--panel); border:1px solid var(--line); border-radius:16px; padding:0;
+        backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
+        position:relative; overflow:hidden;
+      }
+      .card-anim{ position:relative; border-bottom:3px solid var(--chip,#3b9dff); background:#081222; line-height:0; }
+      .card-anim canvas{ display:block; width:100%; height:96px; }
+      .card-body{ padding:14px 18px 14px; }
+      .rain-card .pref{ font-size:11.5px; color:var(--mut); letter-spacing:.06em; }
+      .rain-card .city{ font-size:19px; font-weight:900; line-height:1.3; }
+      .rain-card .numrow{ display:flex; align-items:baseline; gap:6px; margin-top:6px; }
+      .rain-card .num{ font-family:var(--mono); font-size:46px; font-weight:700; line-height:1; color:var(--chip,#3b9dff); }
+      .rain-card .unit{ font-family:var(--mono); font-size:14px; color:var(--mut); }
+      .rain-card .meta{ display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:10px; flex-wrap:wrap; }
+      .chip{ font-size:11.5px; font-weight:700; color:var(--chip-ink,#04101f); background:var(--chip,#3b9dff); border-radius:999px; padding:3px 10px; white-space:nowrap; }
+      .rain-card .band{ font-family:var(--mono); font-size:12px; color:var(--mut); }
+      .meter{ height:5px; border-radius:99px; background:rgba(255,255,255,.08); margin-top:12px; overflow:hidden; }
+      .meter i{ display:block; height:100%; background:var(--chip,#3b9dff); border-radius:99px; }
+
+      /* ---------- data bands (予報の時間帯ごとのデータ区分) ---------- */
+      .band-spec{ display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin:-4px 0 14px; }
+      .spec-chip{ font-family:var(--mono); font-size:11px; font-weight:600; letter-spacing:.03em; color:var(--mut); background:rgba(24,44,76,.75); border:1px solid var(--line-strong); border-radius:8px; padding:4px 9px; white-space:nowrap; }
+      .spec-chip b{ color:var(--ink); font-weight:700; }
+      .spec-chip.metric{ border-color:rgba(255,210,62,.55); color:var(--yellow); background:rgba(255,210,62,.08); }
+      .spec-chip.metric b{ color:var(--yellow); }
+      .band-rule{ font-size:11.5px; color:var(--mut); }
+      .band-divider{
+        margin-top:38px; display:flex; gap:10px; align-items:center;
+        background:rgba(255,210,62,.07); border:1px dashed rgba(255,210,62,.5); border-radius:14px;
+        padding:12px 16px; font-size:13px; color:#ffe1a1; line-height:1.6;
+      }
+      .band-divider .bd-ic{ font-size:17px; flex:0 0 auto; }
+      .band-divider p{ margin:0; }
+      .band-divider b{ color:var(--yellow); }
+      section.block.tight{ margin-top:20px; }
+      .card-spec{ display:flex; gap:5px; flex-wrap:wrap; margin-top:10px; }
+      .card-spec span{ font-family:var(--mono); font-size:10.5px; color:var(--mut); border:1px solid var(--line); border-radius:6px; padding:2px 7px; white-space:nowrap; background:rgba(5,11,22,.45); }
+      .future-note{ margin-top:26px; font-size:12px; color:var(--dim); border:1px dashed rgba(110,170,255,.25); border-radius:12px; padding:11px 15px; background:rgba(10,20,38,.35); line-height:1.7; }
+      /* band3: 短時間予報の面表示＋1時間ごとの降水量バー */
+      .card-area{ position:relative; border-bottom:3px solid var(--chip,#3b9dff); background:#081222; padding:10px 12px 9px; }
+      .area-grid{ display:grid; grid-template-columns:repeat(14,1fr); gap:2px; }
+      .area-grid i{ display:block; height:15px; border-radius:2px; }
+      .area-tag{ position:absolute; right:10px; top:8px; font-family:var(--mono); font-size:10px; color:#cfe6ff; background:rgba(4,10,20,.65); border:1px solid rgba(207,230,255,.25); border-radius:6px; padding:2px 7px; }
+      .hour-bars{ display:flex; align-items:flex-end; gap:5px; height:76px; margin-top:12px; }
+      .hour-bars .hb{ flex:1; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; height:100%; gap:3px; min-width:0; }
+      .hour-bars .hb .bar{ width:100%; border-radius:3px 3px 0 0; min-height:3px; }
+      .hour-bars .hb .hv{ font-family:var(--mono); font-size:10.5px; color:var(--mut); line-height:1; }
+      .hour-bars .hb .ht{ font-family:var(--mono); font-size:9.5px; color:var(--dim); line-height:1; }
+      .hour-bars .hb.peak .hv{ color:var(--ink); font-weight:700; }
+      .hour-bars .hb.peak .ht{ color:var(--ink); }
+      .hour-bars .hb.peak .bar{ outline:1px solid rgba(255,255,255,.45); outline-offset:0; }
+
+      .quiet{
+        display:flex; gap:12px; align-items:center;
+        border:1px dashed rgba(110,170,255,.3); border-radius:16px; padding:16px 18px; color:var(--mut);
+        background:rgba(10,20,38,.4); font-size:13.5px;
+      }
+      .quiet .moon{ font-size:20px; }
+      .quiet b{ color:var(--ink); }
+
+      .foot-note{ margin-top:34px; color:var(--dim); font-size:11.5px; line-height:1.7; border-top:1px solid var(--line); padding-top:14px; }
+      .foot-note a{ color:var(--mut); }
+
+      /* ---------- install banner (top) ---------- */
+      .top-install-banner{
+        margin-top:14px; display:flex; align-items:center; gap:14px; flex-wrap:wrap;
+        background:linear-gradient(90deg, rgba(58,226,255,.14), rgba(29,95,214,.16));
+        border:1px solid rgba(58,226,255,.45); border-radius:16px; padding:14px 18px;
+      }
+      .top-install-banner .bell{ font-size:22px; line-height:1; }
+      .top-install-banner .txt{ flex:1 1 260px; min-width:0; }
+      .top-install-banner .txt b{ font-size:15px; }
+      .top-install-banner .txt span{ display:block; color:var(--mut); font-size:12.5px; margin-top:1px; }
+      .top-install-banner button{
+        cursor:pointer; border:0; border-radius:999px; padding:11px 20px; min-height:44px;
+        background:linear-gradient(90deg,#2f8bff,#37c6ff); color:#03182e;
+        font-family:var(--sans); font-weight:900; font-size:14px; white-space:nowrap;
+        box-shadow:0 8px 22px rgba(47,139,255,.35);
+      }
+
+      /* ---------- install guide (MY) ---------- */
+      .install-panel{
+        margin-top:18px; border-radius:20px; padding:22px;
+        background:linear-gradient(135deg, rgba(10,32,58,.96), rgba(7,18,36,.96));
+        border:1.5px solid rgba(58,226,255,.55);
+        box-shadow:0 0 0 1px rgba(58,226,255,.12), 0 24px 60px rgba(0,0,0,.55), 0 0 42px rgba(58,226,255,.10);
+        position:relative; overflow:hidden;
+      }
+      .install-panel::before{ content:""; position:absolute; inset:0 0 auto 0; height:3px; background:linear-gradient(90deg, var(--cyan), var(--blue), var(--yellow)); }
+      .install-head{ display:flex; gap:14px; align-items:flex-start; flex-wrap:wrap; }
+      .install-head .phone-ic{ flex:0 0 auto; width:48px; height:48px; border-radius:14px; display:grid; place-items:center; font-size:24px; background:rgba(58,226,255,.14); border:1px solid rgba(58,226,255,.45); }
+      .install-head .ttl-wrap{ flex:1 1 260px; min-width:0; }
+      .install-head h2{ margin:0; font-size:clamp(19px,4vw,25px); font-weight:900; line-height:1.35; }
+      .install-head h2 .accent{ color:var(--cyan); }
+      .install-head .why{ margin:6px 0 0; color:#c6d7f2; font-size:13.5px; line-height:1.7; }
+      .install-head .why b{ color:var(--yellow); }
+      .install-status{
+        flex:0 0 auto; font-family:var(--mono); font-size:11.5px; font-weight:700; letter-spacing:.06em;
+        border-radius:999px; padding:6px 12px; white-space:nowrap;
+        background:rgba(255,210,62,.14); color:var(--yellow); border:1px solid rgba(255,210,62,.45);
+      }
+      .install-panel.completed .install-status{ background:rgba(94,224,138,.14); color:var(--green); border-color:rgba(94,224,138,.5); }
+      .install-progress{ display:flex; align-items:center; gap:10px; margin-top:16px; }
+      .install-progress .bar-bg{ flex:1; height:7px; border-radius:99px; background:rgba(255,255,255,.09); overflow:hidden; }
+      .install-progress .bar-fg{ height:100%; width:0%; border-radius:99px; background:linear-gradient(90deg, var(--blue), var(--cyan)); transition:width .45s ease; }
+      .install-progress .p-label{ font-family:var(--mono); font-size:12px; color:var(--mut); white-space:nowrap; }
+      .install-progress .p-label b{ color:var(--ink); }
+      .steps{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:16px; }
+      .step-card{
+        background:rgba(5,11,22,.6); border:1px solid var(--line); border-radius:16px; padding:16px 14px 14px;
+        display:flex; flex-direction:column; gap:10px; position:relative; transition:border-color .25s, opacity .25s;
+      }
+      .step-card.active{ border-color:rgba(58,226,255,.7); box-shadow:0 0 0 1px rgba(58,226,255,.25), 0 0 24px rgba(58,226,255,.10); }
+      .step-card.locked{ opacity:.55; }
+      .step-card.done{ border-color:rgba(94,224,138,.55); }
+      .step-top{ display:flex; align-items:center; gap:8px; }
+      .step-num{
+        flex:0 0 auto; width:26px; height:26px; border-radius:50%; display:grid; place-items:center;
+        font-family:var(--mono); font-size:13px; font-weight:700; background:rgba(58,226,255,.16); color:var(--cyan); border:1px solid rgba(58,226,255,.5);
+      }
+      .step-card.done .step-num{ background:var(--green); color:#062b16; border-color:var(--green); }
+      .step-card .step-ttl{ font-weight:900; font-size:14.5px; line-height:1.4; }
+      .step-card .step-desc{ font-size:12.5px; color:var(--mut); line-height:1.65; margin:0; }
+      .step-card .step-desc b{ color:var(--ink); }
+      /* iOS mock visuals */
+      .ios-mock{ background:#101b30; border:1px solid var(--line-strong); border-radius:12px; padding:10px 12px; }
+      .ios-bar{ display:flex; align-items:flex-end; justify-content:space-around; padding-top:2px; }
+      .ios-bar .ib{ display:flex; flex-direction:column; align-items:center; gap:3px; font-si
```

### lrpm/lrpm-japan-20260101-v1.tar.gz

```text
diff --git a/lrpm/lrpm-japan-20260101-v1.tar.gz b/lrpm/lrpm-japan-20260101-v1.tar.gz
new file mode 100644
index 00000000..e3d23a5d
Binary files /dev/null and b/lrpm/lrpm-japan-20260101-v1.tar.gz differ

```

### strategy/sakidori-sns-content-strategy-2026-11-15.md

```text
diff --git a/strategy/sakidori-sns-content-strategy-2026-11-15.md b/strategy/sakidori-sns-content-strategy-2026-11-15.md
new file mode 100644
index 00000000..f3a49a73
--- /dev/null
+++ b/strategy/sakidori-sns-content-strategy-2026-11-15.md
@@ -0,0 +1,96 @@
+# さきどり SNS・コンテンツ戦略
+
+作成: 2026-11-15（Muse側ソラ）／ 位置づけ: 提案。実装判断はせいちゃんとChatGPT側ソラに委ねる。
+
+## 0. 前提（決定済み・不変）
+
+- **データ原則**: データはすべて公的機関（気象庁・警察/JASPIC等）のもの。自らデータを作ったり改変したりしない。さきどりの仕事は「早く届ける」「市区町村単位で使いやすくする」「答え合わせで検証する」こと。
+- **サイト構造**: トップは日本地図（全員の入口）、登録ユーザーはMYページ（MYアメふる）が入口。全国大雨予報は地図の雨レイヤー（集客）、MYアメふるが定着装置。
+- **ブランド**: 「さきどり ― 暮らしを少し先回りする」。ドメインは emergencyalert.news。
+- **旧アカウントの教訓**: @_emergencyalert は全盛期1ツイート数万ビューを記録したが、X APIの上限（大雨の日に即枯渇）で2023年に自動投稿が停止した。配信の背骨はプラットフォームに借りるもの、という前提で設計する。
+
+## 1. 全体像（ファネル）
+
+~~~
+SNS（Bluesky / X）= 入口・拡散
+    ↓ リンク
+サイト（地図・市区町村詳細）= 内容の本体・受け皿
+    ↓ PWAインストール
+MYアメふる = 定着（通知・答え合わせ）
+~~~
+
+SNSはゴールではなく入口。すべての投稿は、最終的にサイトの市区町村詳細ページとPWA登録につなげる。
+
+## 2. SNS戦略
+
+### 2.1 役割分担
+
+| 媒体 | 役割 | 理由 |
+|---|---|---|
+| Bluesky | 実況の本拠地（全量投稿） | APIが無料で開かれており、投稿コスト・上限の壁がない。大雨の日に止まる死因が構造的に消える |
+| X（@_emergencyalert） | 看板と信頼（厳選投稿） | 2,912フォロワーと「緊急速報まとめ」の実績が資産。ただし従量課金はURL付き1件 $0.200 と高く、全量投稿は成立しない |
+| サイト/MYアメふる | 最終目的地 | 両SNSからの流入を受け、PWA登録で定着させる |
+
+### 2.2 投稿の3段階
+
+1. **両方に出す（看板級）**: 特別警報級、80mm/h超、首都圏の大規模事例など、Xの看板として出す価値があるものだけ。
+2. **Blueskyのみ**: 30mm/h以上の全市区町村予報＋レーダーアニメGIF。量で勝負する層。
+3. **Blueskyのみ・高頻度**: 実況の途中経過と**答え合わせ結果**。予報を流す速報アカウントは他にもいるが、自分の予報の検証結果まで公開するアカウントはない。ここが最大の差別化。
+
+### 2.3 運用の注意
+
+- 完全ミラーにしない。Blueskyは速報連投の作り、Xは厳選＋まとめスレッドの作りに文面を変える。
+- XのPublic Utility申請（下書き準備済み）は並行して進める。承認されればXの投稿量を格上げする。承認まではXは厳選＋必要最小限の従量で運用。
+- Blueskyの日本の防災クラスタはまだ小さい。初期は「記録と本拠地」と割り切り、Xのプロフィールとサイトから誘導する。
+- 効果測定: 流入元（Bluesky/X/その他）ごとに、サイト流入数とPWA登録数を分けて測る。測れない導線は作らない。
+
+### 2.4 進行中の実装との対応
+
+- Issue #219（1mm/h全国予報→Bluesky実投稿）: 段階2の土台。
+- Issue #221（Bluesky添付用アニメGIF）: 段階2の見た目の中核。生成方式は「JMAタイルをサーバー側で合成」が本命（旧システムのSeleniumスクリーンショット方式は復活させない）。
+- Issue #213（重要変化のみ自動投稿）: 段階1・2の振り分けロジックに相当。
+- Issue #216（検証モード→ドライラン）: 本投稿前の安全装置として維持。
+
+## 3. サイトのコンテンツ戦略
+
+### 3.1 コンテンツの4本柱
+
+**柱1: 予報（先回りできるもの）＝本丸**
+- 雨: ナウキャスト（〜30分/250m、35〜60分/1km）→降水短時間予報（1〜6時間/1km）→15時間予報（7〜15時間/5km）と、解像度と指標（降水強度 mm/h と1時間降水量 mm）の違いを分けて見せる。
+- 市区町村ごとの詳細ページを全量用意する。ここがSNS投稿すべてのリンク先＝受け皿になる。
+- 熱中症（WBGT予報）: 旧システムにも実装があった。雨と並ぶ「先回りできる危険」で、夏の集客柱。
+- 防犯（JASPIC）: 現在実装が進行中。雨・熱中症と並べ、「その場所のカード」に束ねて見せる。
+
+**柱2: 速報（先回りできないもの）＝別枠**
+- 地震情報と避難所情報。旧アカウントが数万ビューを取った領域。
+- 予報系と混ぜると旧サイトのように詰め込んだ見た目になるため、地図上でも表示の面を分ける。「起きたら一番速く、避難所まで出す」が役割。
+
+**柱3: 答え合わせ（独自コンテンツ）**
+- 予報の成績（的中・空振り・見逃し・保留）を公開する。外れたものも隠さないことが信頼の証拠になる。
+- MYアメふる内の個人向け答え合わせと、サイト全体の公開統計は分ける。公開側はSNSの段階3（差別化コンテンツ）の供給源。
+
+**柱4: 置かないもの**
+- ニュース記事の転載・要約。
+- 独自観測を装うデータ作り（データ原則違反）。
+- 地震予知めいた表現。
+- さきどりの信用の源泉は「公的データを一番早く・分かりやすく・検証付きで届ける」一点に置く。
+
+### 3.2 優先順位
+
+1. 雨＋市区町村詳細ページ＋答え合わせ（既存資産の完成）
+2. 防犯（JASPIC、実装進行中）
+3. 熱中症WBGT（来夏までに）
+4. 地震・避難所（速報枠として表示設計から）
+
+## 4. 未決事項（判断が要るもの）
+
+- X Public Utility申請を実行するか・いつ出すか（下書きは `x-public-utility-application-draft.md` に準備済み）。
+- 申請結果が出るまでのX従量課金の月額上限を決めるか。
+- Blueskyアカウントのハンドル（独自ドメイン emergencyalert.news をハンドルに使うと本人性の証明になる）。
+- 答え合わせ公開の粒度（市区町村別まで出すか、全国集計のみか）。
+- レーダーGIFの生成を5分サイクルに組み込むか、別ジョブにするか（Issue #221では「5分更新から分離」が既定方針）。
+
+## 5. この文書の扱い
+
+- 本書は戦略の提案であり、仕様ではない。データ原則と決定済みのサイト構造には反しない範囲で書いた。
+- 実装に落とす際は、既存Issue（#209/#210/#213/#216/#219/#221ほか）との重複を作らず、拡張か新規かを各Issueで判断すること。

```

### verification/nationwide-heavy-rain-verification-design-2026-11-16.md

```text
diff --git a/verification/nationwide-heavy-rain-verification-design-2026-11-16.md b/verification/nationwide-heavy-rain-verification-design-2026-11-16.md
new file mode 100644
index 00000000..2aae5957
--- /dev/null
+++ b/verification/nationwide-heavy-rain-verification-design-2026-11-16.md
@@ -0,0 +1,84 @@
+# 全国大雨予報の検証設計
+
+作成: 2026-11-16（Muse側ソラ）／ 位置づけ: 実装のための設計提案。対象は emergencyalert.news トップの「今後30分以内に、1時間あたり30mm以上の雨が予測される地域」一覧（全国スキャナの出力）。
+
+## 0. 検証は2層に分ける
+
+| 層 | 問い | 捕まえるもの |
+|---|---|---|
+| 第1層: パイプライン検証 | 出した一覧は、正しく計算できていたか | 枠の欠落、タイル欠落、版の取り違え、計算バグ |
+| 第2層: 予報の腕の検証 | 出した一覧は、当たっていたか | 的中・空振り・見逃し、タイミング誤差 |
+
+混ぜてはいけない。第1層が壊れていると、第2層の数字はすべて無意味になる。
+
+## 1. 原則
+
+- **判定の共通化**: 予報と実況で、同一のマスク（LRPM）と同一の色分類を使う。検証側で別の判定ロジックを作らない。判定が違えば、差は予報の腕ではなく判定の差になる。
+- **予測は「出した瞬間」に保存する**: 後から再構成した予測は予測ではない（初期の答え合わせで、通知後に回収した予測画像が低精度になった教訓）。
+- **レーダー同士の比較と、地上の真実は分ける**: 予報レーダーと実況レーダーの比較では「空振り」と言えるが、「地上で降らなかった」とは言わない。アメダスは補助証拠に留める。
+- **データ原則の維持**: 公的データを改変しない。検証は記録と比較のみ。
+- **小さい n で結論を出さない**: すべての集計に件数と信頼区間（95%CI）を付ける。
+
+## 2. 第1層: パイプライン検証
+
+### 2.1 枠ごとに保存するもの
+
+- 基準時刻（basetime）と、使用した targetTimes の内容
+- validtime 別・市区町村別の最大雨量クラス（**一覧に載った所だけでなく全市区町村分**。第2層の見逃し判定に必須）
+- 公開した一覧（市区町村コードの集合）と公開時刻
+- 版情報: スキャナのコミットSHA、マスクの N03 バージョン＋アルゴリズムバージョン
+
+データ量の見積もり: 全市区町村×6 validtime の最大クラスは1枠あたり数十KB以下。1日288枠でも数MBに収まる。安い。
+
+### 2.2 再計算照合
+
+- 保存したタイル（または同一 basetime/validtime の再取得タイル）でオフライン再計算し、公開した一覧と集合が完全一致するか照合する。
+- 不一致は事故として記録し、原因を区別する: 枠欠落／タイル欠落／版違い／計算差。
+- タイル自体の保存は、雨があった枠のみ・期間限定（例: 7日）で十分。
+
+## 3. 第2層: 予報の腕の検証
+
+### 3.1 実況集合の作り方
+
+- 各 validtime について、その時刻の解析フレーム（basetime = validtime の hrpns 解析）を、予報と同一のマスク・分類にかける。
+- 市区町村ごとに「その validtime の実況最大クラス」を得る。予報ウィンドウ（basetime+5分〜+30分）の全 validtime 分を作る。
+
+### 3.2 突合せ
+
+- 単位は（basetime × 市区町村）。
+- 予報側: 一覧に載ったか／最初に30mm以上と予測した validtime／予測最大クラス。
+- 実況側: ウィンドウ内に実況30mm以上があったか／最初の実況 validtime／実況最大クラス。
+- 分類: **的中**（予報あり・実況あり）、**空振り**（予報あり・実況なし）、**見逃し**（予報なし・実況あり）。
+- タイミング: 予報の初回30以上 validtime と実況の初回30以上 validtime の差（開始誤差）を分布で見る。
+
+### 3.3 集計の切り口と指標
+
+- 切り口: リードタイム別（初回予測が +5/+10/+15/+20/+25/+30分）、強さ別（30〜50／50〜80／80以上）、都道府県別。
+- 指標: 的中率（precision）、捕捉率（recall）、空振り率、見逃し率、開始誤差の中央値と分布。すべて n と 95%CI 付き。
+- 同一の雨域が多数の市区町村に広がる事例では、市区町村単位の n が水増しされる。事例（イベント）単位の集計も併記する。
+
+## 4. アメダスの補助証拠
+
+- 市区町村内のアメダス観測点について、対象ウィンドウの10分雨量と1時間雨量を併記する。
+- 1時間雨量30mm以上の観測は「地上でも強い雨があった」強い裏付けとして扱う。
+- 観測点のない市区町村では使えないため、主判定にはしない。あくまで解釈の補助。
+
+## 5. 運用
+
+- 実況は validtime の数分後には揃うため、採点は枠の30分後には自動で回せる。
+- 日次で集計し、食い違いの大きい事例（大きな空振り・見逃し）だけをレビューキューに上げる。
+- 公開（サイトの「答え合わせ」コンテンツ）への接続は別途判断。まず内部の検証として回す。
+
+## 6. 既存資産との対応・注意
+
+- マスクと判定は LRPM（PR #242／統合 PR #243）をそのまま使う。新規の判定実装は不要。
+- 保存の器は `nationalForecastSnapshot` の考え方を拡張する。一覧だけでなく全市区町村の最大クラスを持つこと。
+- 個人向け通知の答え合わせ（rain_notification_evaluations 等）とは混ぜない。全国予報用に保存先を分ける。
+- 採点は予報自身の validtime 軸で行う。公開が基準時刻から5〜6分遅れても採点には影響しない（適時性の判断は Issue #220 コメント 6891177704 を参照）。
+
+## 7. 未決事項（実装前に決める）
+
+- 空振りの確定条件: 実況レーダーのみで確定とするか、アメダスの裏付けがない事例を「保留」に残すか。
+- イベント（雨域）のグルーピング方法: 時空間でどう一塊とみなすか。
+- 保存期間: 枠スナップショットとタイルの保持期間。
+- 公開粒度: 将来公開する場合、市区町村別まで出すか全国集計のみか。

```

