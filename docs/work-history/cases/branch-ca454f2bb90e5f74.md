# handover/lrpm-artifact-220

**目的：** 未確認

**実装状態：** mainとの差分を収録。差分ゼロも記録

**検証の扱い：** 未確認

**PR状態：** PR未関連のブランチ差分

**main統合：** 未確認

**本番反映：** 未確認

**残課題：** 未確認

**次の作業：** 関連PR・mainとの同等実装を照合。ブランチの存在だけで未完成扱いしない

根拠取得日時 (UTC)：2026-11-15T07:49:49.172013+00:00


## 実際の変更処理（コードから抽出）

差分・ソースを参照

- [.github/workflows/lrpm-handover.yml](https://github.com/miyazaki1016/emergencyalert/blob/edcfc7699f543033887cb76b70aae7e68e8da8ab/.github/workflows/lrpm-handover.yml)：全文
- [design/sakidori-design-mock.html](https://github.com/miyazaki1016/emergencyalert/blob/edcfc7699f543033887cb76b70aae7e68e8da8ab/design/sakidori-design-mock.html)：対象外（秘密情報候補／非テキスト）
- [lrpm/lrpm-japan-20260101-v1.tar.gz](https://github.com/miyazaki1016/emergencyalert/blob/edcfc7699f543033887cb76b70aae7e68e8da8ab/lrpm/lrpm-japan-20260101-v1.tar.gz)：対象外（秘密情報候補／非テキスト）
- [strategy/sakidori-sns-content-strategy-2026-11-15.md](https://github.com/miyazaki1016/emergencyalert/blob/edcfc7699f543033887cb76b70aae7e68e8da8ab/strategy/sakidori-sns-content-strategy-2026-11-15.md)：全文

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

