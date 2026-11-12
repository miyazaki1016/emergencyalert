# Verify seven JMA PNG bands; withdraw unsupported yellow mapping

[PR原本](https://github.com/miyazaki1016/emergencyalert/pull/1)

**目的：** 雨量判定・予測・全国候補抽出に関する変更／画面表示や操作に関する変更

**実装状態：** 変更差分を取得。実装の受入完了は未認定

**検証の扱い：** Actionsの成否は実行単位の事実。製品の受入検証とは別

**PR状態：** merged

**main統合：** mainに祖先コミットとして存在（機能受入・本番は別）

**本番反映：** 未確認（main統合／Vercelプレビューから推定しない）

**残課題：** 受入条件・未解決事項をPR本文、レビュー、台帳と照合

**次の作業：** 類似コード・既存結論を確認し、未解決条件だけを次の作業にする

根拠取得日時 (UTC)：2026-11-09T09:02:35.033623+00:00

## 日本語で確認した成果

JMAのPNG色7段階を検証し、根拠のない黄色対応を撤回

日本語見出しは変更目的の案内。受入完了・本番反映の認定ではない。差分・検証・残課題を原本で確認。

- [根拠](https://github.com/miyazaki1016/emergencyalert/pull/1)

## 実装判断の検索候補（コード・テスト・検証資料）

テスト名と期待値は同じコミットのソースを読むための手掛かりです。

### contains only explicitly evidence-gated current JMA mappings

- 条件：contains only explicitly evidence-gated current JMA mappings
- 動作・設定：return VERIFIED_JMA_PNG_PALETTE.find(
- 検証範囲：テストの期待値: expect(VERIFIED_JMA_PNG_PALETTE).toHaveLength(7); ／ expect(VERIFIED_JMA_PNG_PALETTE.every((entry) =&gt; entry.evidence === &quot;CURRENT_JMA_ASSET&quot;)).toBe(true); ／ expect(findVerifiedIntensity({ r, g, b, a: 255 })).toBe(band); ／ 実行証拠: 個別の実行結果は未確認
- 残課題：呼び出し元・本番採用・実機を確認
- 根拠：[原本](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/pngPalette.ts#L22) ／ [原本](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/pngPalette.test.ts#L19)

## 実際の変更処理（コードから抽出）

VERIFIED_JMA_PNG_PALETTE、boundaries、colors、explicitly、fetcher、findVerifiedIntensity、frames、i、observed、png、pngPixel、provider、response、result、series、targets、tile、unresolvedYellow、url、verified

- テストの期待値・条件：`provider; it independently contains multiple pixels of every listed RGB.`（[docs/PNG_PALETTE_EVIDENCE.md](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/PNG_PALETTE_EVIDENCE.md)）
- テストの期待値・条件：`The SVG establishes the legend&#x27;s 20–30 color; it does not establish the meaning`（[docs/PNG_PALETTE_EVIDENCE.md](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/PNG_PALETTE_EVIDENCE.md)）
- 関数・クラス定義：`Its &#96;symbolStyle.iconId&#96; function explicitly returns &#96;circle_000_170_255&#96; for`（[docs/PNG_PALETTE_EVIDENCE.md](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/PNG_PALETTE_EVIDENCE.md)）
- テストの期待値・条件：`that #FF9900 was obsolete is superseded: current hrpns SVG and PNG both confirm it.`（[docs/PNG_PALETTE_EVIDENCE.md](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/PNG_PALETTE_EVIDENCE.md)）
- 関数・クラス定義：`function pngPixel(r: number, g: number, b: number, a: number): ArrayBuffer {`（[lib/weather/providers/jma/JmaPublicImageProvider.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/JmaPublicImageProvider.test.ts)）
- DB・ストレージ操作の呼出し：`return Uint8Array.from(PNG.sync.write(png)).buffer;`（[lib/weather/providers/jma/JmaPublicImageProvider.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/JmaPublicImageProvider.test.ts)）
- テストの期待値・条件：`it.each([[1, 2, 3], [250, 245, 0], [255, 245, 0], [0, 170, 255], [255, 170, 0]])(&quot;keeps unsupported RGB (%i,%i,%i) UNKNOWN_PIXEL&quot;, async (r, g, b) =&gt; {`（[lib/weather/providers/jma/JmaPublicImageProvider.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/JmaPublicImageProvider.test.ts)）
- テストの期待値・条件：`expect(classifyRainPixel({ r: 255, g: 153, b: 0, a: 255 })).toEqual({`（[lib/weather/providers/jma/classifyPixel.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/classifyPixel.test.ts)）
- テストの期待値・条件：`it(&quot;withdraws yellow when current SVG and PNG evidence disagree&quot;, () =&gt; {`（[lib/weather/providers/jma/classifyPixel.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/classifyPixel.test.ts)）
- テストの期待値・条件：`expect(classifyRainPixel({ r: 250, g: 245, b: 0, a: 255 }).status).toBe(&quot;UNKNOWN_PIXEL&quot;);`（[lib/weather/providers/jma/classifyPixel.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/classifyPixel.test.ts)）
- テストの期待値・条件：`expect(VERIFIED_JMA_PNG_PALETTE.find((x) =&gt; x.intensityClass === &quot;30_TO_50&quot;)?.rgba)`（[lib/weather/providers/jma/paletteWatcher.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/paletteWatcher.test.ts)）
- テストの期待値・条件：`expect(result.changes.some((x) =&gt; x.intensityClass === &quot;20_TO_30&quot; &amp;&amp; x.expected === null)).toBe(true);`（[lib/weather/providers/jma/paletteWatcher.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/paletteWatcher.test.ts)）
- テストの期待値・条件：`expect(VERIFIED_JMA_PNG_PALETTE).toHaveLength(7);`（[lib/weather/providers/jma/pngPalette.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/pngPalette.test.ts)）
- テストの期待値・条件：`it.each(verified)(&quot;classifies raw RGB (%i,%i,%i) as %s&quot;, (r, g, b, band) =&gt; {`（[lib/weather/providers/jma/pngPalette.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/pngPalette.test.ts)）
- テストの期待値・条件：`expect(findVerifiedIntensity({ r, g, b, a: 255 })).toBe(band);`（[lib/weather/providers/jma/pngPalette.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/pngPalette.test.ts)）
- テストの期待値・条件：`expect(findVerifiedIntensity({ r, g, b, a: 191 })).toBeNull();`（[lib/weather/providers/jma/pngPalette.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/pngPalette.test.ts)）
- テストの期待値・条件：`it.each([`（[lib/weather/providers/jma/pngPalette.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/pngPalette.test.ts)）
- テストの期待値・条件：`expect(classifyRainPixel({ r, g, b, a: 255 })).toEqual({ status: &quot;UNKNOWN_PIXEL&quot;, intensityClass: null });`（[lib/weather/providers/jma/pngPalette.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/pngPalette.test.ts)）
- テストの期待値・条件：`it(&quot;decodes corroborated colors from the archived native-zoom JMA PNG&quot;, () =&gt; {`（[lib/weather/providers/jma/pngPalette.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/pngPalette.test.ts)）
- 条件分岐・閾値：`if (r === 250 &amp;&amp; g === 245 &amp;&amp; b === 0 &amp;&amp; a === 255) {`（[lib/weather/providers/jma/pngPalette.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/pngPalette.test.ts)）
- テストの期待値・条件：`expect(classifyRainPixel({ r, g, b, a }).status).toBe(&quot;UNKNOWN_PIXEL&quot;);`（[lib/weather/providers/jma/pngPalette.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/pngPalette.test.ts)）
- テストの期待値・条件：`for (const [r, g, b] of verified) expect(colors.has(&#96;${r},${g},${b},255&#96;)).toBe(true);`（[lib/weather/providers/jma/pngPalette.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/pngPalette.test.ts)）
- テストの期待値・条件：`expect(unresolvedYellow).toBe(562);`（[lib/weather/providers/jma/pngPalette.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/pngPalette.test.ts)）
- [docs/PNG_PALETTE_EVIDENCE.md](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/PNG_PALETTE_EVIDENCE.md)：全文
- [docs/PROJECT_OVERVIEW.md](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/PROJECT_OVERVIEW.md)：全文
- [docs/evidence/jma-palette-2026-09-23/.gitattributes](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/.gitattributes)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/circle_000_170_255.svg](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/circle_000_170_255.svg)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/circle_242_242_255.svg](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/circle_242_242_255.svg)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/circle_250_245_000.svg](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/circle_250_245_000.svg)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/circle_255_040_000.svg](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/circle_255_040_000.svg)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/circle_255_170_000.svg](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/circle_255_170_000.svg)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-10-891-411.png](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-10-891-411.png)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-4-13-5.png](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-4-13-5.png)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-4-13-6.png](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-4-13-6.png)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-4-13-7.png](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-4-13-7.png)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-4-14-5.png](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-4-14-5.png)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-4-14-6.png](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-4-14-6.png)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-4-14-7.png](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-4-14-7.png)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-4-15-5.png](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-4-15-5.png)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-4-15-6.png](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-4-15-6.png)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-4-15-7.png](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-4-15-7.png)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/index.html](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/index.html)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/jmatile-opacity-excerpt.txt](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/jmatile-opacity-excerpt.txt)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/jmatile.xml](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/jmatile.xml)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/legend_jp_deep_hrpns.svg](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/legend_jp_deep_hrpns.svg)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/legend_jp_normal_hrpns.svg](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/legend_jp_normal_hrpns.svg)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/legend_jp_thin_hrpns.svg](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/legend_jp_thin_hrpns.svg)：対象外（秘密情報候補／非テキスト）
- [docs/evidence/jma-palette-2026-09-23/manifest.json](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/manifest.json)：先頭18000文字・原本リンク参照
- [docs/evidence/jma-palette-2026-09-23/nowc.xml](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/docs/evidence/jma-palette-2026-09-23/nowc.xml)：対象外（秘密情報候補／非テキスト）
- [lib/weather/providers/jma/JmaPublicImageProvider.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/JmaPublicImageProvider.test.ts)：全文
- [lib/weather/providers/jma/classifyPixel.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/classifyPixel.test.ts)：全文
- [lib/weather/providers/jma/paletteWatcher.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/paletteWatcher.test.ts)：全文
- [lib/weather/providers/jma/pngPalette.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/pngPalette.test.ts)：全文
- [lib/weather/providers/jma/pngPalette.ts](https://github.com/miyazaki1016/emergencyalert/blob/891318d7026f1c90209341a48c38ec8df0d879e8/lib/weather/providers/jma/pngPalette.ts)：全文

## 検証実行の事実

| ワークフロー | 結果 | 対象SHA |
| --- | --- | --- |
| [CI](https://github.com/miyazaki1016/emergencyalert/actions/runs/35849772648) | success | 891318d7026f1c90209341a48c38ec8df0d879e8 |

## 当時の説明・結論（原文。作者の主張と実測を区別）

```text
## Problem and result
The previous three-color subset used circle assets without establishing their layer semantics. Current JMA XML identifies those circles as AMeDAS ten-minute rainfall symbols, not hrpns intensity.

Direct inspection of the live JMA browser DOM, loaded resources, linked XML/JS, dedicated hrpns SVGs and original PNG tiles corroborates seven intensity bands. Add five mappings and retain two independently reverified mappings. Withdraw #FAF500 → 20–30: all three hrpns SVGs specify #FFF500, while live PNG bytes contain #FAF500. Both yellows and AMeDAS-only #00AAFF/#FFAA00 remain UNKNOWN_PIXEL.

## Evidence
Update PNG_PALETTE_EVIDENCE.md and PROJECT_OVERVIEW.md with the source chain, SVG boundary geometry, exact RGB table and correction. Archive JMA originals with URLs, SHA-256, raw RGBA counts and sample coordinates, including native zoom 10. All 22 archived source/excerpt hashes were verified against the remote commit. Source bytes retain their original line endings; application files retain repository line endings.

## Validation
At head 891318d7026f1c90209341a48c38ec8df0d879e8, [CI run 83](https://github.com/miyazaki1016/emergencyalert/actions/runs/35849772648) passed: 13 test files / 79 tests and the production build (including type checks).

Tests cover all seven corroborated classes and the archived raw PNG, withdrawn yellow, SVG-only yellow, AMeDAS-only colors, partial alpha, provider UNKNOWN_PIXEL preservation and watcher change detection without promotion. The test PNG helper returns ArrayBuffer for current TypeScript BodyInit compatibility. Local type checking also passed; local Vitest was blocked by Windows child-process EPERM, so full execution was verified in GitHub CI.

20–30 remains unresolved; transparency/coverage semantics require separate verification. This is not a declaration of production readiness. No changes to miyazaki1016/emergencyalert.kishibojim.online.
```

## ソース・テスト・資料の抜粋（実行はしない）

### docs/PNG_PALETTE_EVIDENCE.md

```text
diff --git a/docs/PNG_PALETTE_EVIDENCE.md b/docs/PNG_PALETTE_EVIDENCE.md
index e5689e8..1988e88 100644
--- a/docs/PNG_PALETTE_EVIDENCE.md
+++ b/docs/PNG_PALETTE_EVIDENCE.md
@@ -1,5 +1,11 @@
 # JMA public PNG palette evidence
 
+> **Current conclusion (2026-09-23): seven PNG mappings verified; 20–30 mm/h
+> unresolved.** Earlier sections below are investigation history, not current
+> proof. The circle assets were AMeDAS ten-minute rainfall symbols, not the
+> hrpns precipitation-intensity legend. The former #FAF500 verification is
+> withdrawn. See the dated correction at the end and the archived originals.
+
 ## 2026-09 finding
 
 The current JMA "雨雲の動き" product visibly publishes a precipitation-intensity
@@ -180,3 +186,108 @@ The remaining proof requires inspecting the live nowcast application's resource
 relationships (legend label -> referenced asset) or an equivalent first-party
 machine-readable definition. Search-engine absence must never be replaced with
 visual inference, historical ordering, or guesswork.
+
+## 2026-09-23 live-browser verification and correction
+
+### Source chain (JMA only)
+
+Opened [the current application](https://www.jma.go.jp/bosai/nowc/) in a browser.
+The resulting URL selected `colordepth:normal/elements:hrpns&slmcs`.
+Read its live DOM, inline initialization scripts and loaded-resource inventory.
+The browser exposed the hrpns PNG requests and all three hrpns legend SVGs.
+Original image assets were exported without screenshot sampling or conversion.
+
+1. The page initializes `L.jmaTile` with `contentPropsUrl` pointing to
+   [nowc.properties__7d6f7d8dc6f16a416574.xml](https://www.jma.go.jp/bosai/nowc/table/nowc.properties__7d6f7d8dc6f16a416574.xml).
+2. That XML, lines 252–290, declares `element id="hrpns"`, the tooltip
+   高解像度降水ナウキャスト, `legendHTML`, and `imageType id="hrpns" type="tile"`.
+   Its `dataRootUrl` is `../jmatile/data/nowc` (line 15).
+3. The live DOM's visible `jmatile-showhide-colorDepth-normal` contains
+   [legend_jp_normal_hrpns.svg](https://www.jma.go.jp/bosai/nowc/images/legend_jp_normal_hrpns.svg).
+   The thin/deep containers were hidden. The same XML explicitly associates
+   all three variants with **this hrpns element**, not merely with the page.
+4. The SVG contains actual `降水強度` and `mm/h` text, numeric boundary labels,
+   rectangle paths, and exact `fill="rgb(...)"` values. The table below records
+   each path's coordinate interval and the numeric labels on its boundaries.
+   This uses the SVG's explicit legend geometry, not array/resource order,
+   perceived hue, PNG palette index, or the 2023 table. Text baselines are
+   16 SVG units below the corresponding boundary strokes (e.g. 20: y=352
+   beside the stroke y=336; 30: y=292 beside y=276).
+5. Browser requests included
+   `.../20260923101500/none/20260923101500/surf/hrpns/4/13/6.png`.
+   Decoded original bytes contain all seven corroborated RGBs plus #FAF500.
+   Also fetched its native-zoom child
+   [10/891/411.png](https://www.jma.go.jp/bosai/jmatile/data/nowc/20260923101500/none/20260923101500/surf/hrpns/10/891/411.png)
+   using the same time/layer and tile geometry. This is zoom 10 as used by the
+   provider; it independently contains multiple pixels of every listed RGB.
+
+### Exact correspondence and promotion decision
+
+All PNG counts below are decoded **opaque alpha=255** pixels from the archived
+zoom-10 tile, not pixels of a composited browser screenshot. Intervals use lower
+inclusive / upper exclusive boundaries.
+
+| mm/h | SVG path y interval | hrpns SVG fill RGB (hex) | Matching PNG count | Decision |
+| --- | --- | --- | ---: | --- |
+| <1 | 516–576, below boundary 1 | 242,242,255 (#F2F2FF) | 5550 | VERIFIED LT_1 |
+| 1–5 | 456–516, boundaries 5/1 | 160,210,255 (#A0D2FF) | 3594 | VERIFIED 1_TO_5 |
+| 5–10 | 396–456, boundaries 10/5 | 33,140,255 (#218CFF) | 1037 | VERIFIED 5_TO_10 |
+| 10–20 | 336–396, boundaries 20/10 | 0,65,255 (#0041FF) | 1245 | VERIFIED 10_TO_20 |
+| 20–30 | 276–336, boundaries 30/20 | 255,245,0 (#FFF500) | 0 | UNKNOWN PNG mapping |
+| 30–50 | 216–276, boundaries 50/30 | 255,153,0 (#FF9900) | 531 | VERIFIED 30_TO_50 |
+| 50–80 | 156–216, boundaries 80/50 | 255,40,0 (#FF2800) | 331 | VERIFIED 50_TO_80 |
+| >=80 | 96–156, above boundary 80 | 180,0,104 (#B40068) | 214 | VERIFIED GTE_80 |
+
+**Yellow conflict:** PNG #FAF500 (250,245,0) occurs 562 times in that tile,
+but the three current hrpns SVG variants all specify #FFF500 (255,245,0).
+The SVG establishes the legend's 20–30 color; it does not establish the meaning
+of the different PNG RGB. No explicit conversion or class-to-PNG-RGB definition
+was established in the examined XML/JS. Do not assign #FAF500 by elimination,
+palette order, apparent similarity, or historical values. Both yellow RGBs
+remain unsupported by the production PNG classifier. Remove the previously
+registered #FAF500 mapping rather than grandfathering unproven evidence.
+
+### Why circle assets do not answer this question
+
+The same nowc XML, lines 403–460, defines `amds_rain10m` (アメダス１０分間雨量).
+Its `symbolStyle.iconId` function explicitly returns `circle_000_170_255` for
+rain10m >=1 and <5, `circle_250_245_000` for >=5 and <10,
+`circle_255_170_000` for >=10 and <15, and `circle_255_040_000` for >=15.
+These are **ten-minute accumulated rainfall** symbols, not hrpns mm/h classes.
+Thus #00AAFF and #FFAA00 remain UNKNOWN_PIXEL for hrpns. Their presence did not
+prove that the precipitation-intensity palette changed. The earlier assertion
+that #FF9900 was obsolete is superseded: current hrpns SVG and PNG both confirm it.
+The earlier three-entry subset had no sufficient semantic proof from circle
+filenames alone; #F2F2FF and #FF2800 are now independently reverified via hrpns.
+
+### Opacity is presentation, not an alternative raw palette
+
+[jmatile.properties__8f09b62937127ac173c5.xml](https://www.jma.go.jp/bosai/jmatile/table/jmatile.properties__8f09b62937127ac173c5.xml),
+lines 49–51, gives thin/normal/deep opacity 50/75/100. The corresponding SVGs
+have identical RGB fills and opacity .5/.75/1. The loaded
+[jmatile JS bundle](https://www.jma.go.jp/bosai/jmatile/js/jmatile.bundle__6888179e2a40840a12d6.js)
+selects `this._props.colorDepth[this.status.colorDepth].opacity` for
+`changeColorDepth` layers. This does not turn red=250 into red=255 in PNG bytes.
+Do not register screenshot/composited RGBs or partially transparent aliases.
+
+### Reproducible evidence and remaining boundary
+
+Original HTML/XML/SVG/PNG files, an exact JS excerpt, source URLs, SHA-256
+hashes, raw RGBA counts, and up to three pixel coordinates per opaque color are
+archived in [the evidence manifest](evidence/jma-palette-2026-09-23/manifest.json).
+The JS manifest distinguishes the full-source hash from the saved excerpt hash.
+Coordinates are zero-based. The nine browser-observed PNG tiles and one native
+zoom tile are snapshots for 2026-09-23 10:15 UTC, not a promise that live URLs
+will remain available. No old repository data were used to infer assignments.
+
+Tests read the archived zoom-10 PNG and exercise all seven corroborated RGBs,
+the withdrawn yellow mapping, the SVG-only yellow, AMeDAS-only colors, and
+partial alpha; provider integration preserves UNKNOWN_PIXEL for unsupported
+colors. Palette watcher tests still detect changes without automatic promotion.
+
+This resolves seven of eight bands, **not production readiness**. The 20–30
+PNG mapping still needs an explicit current JMA encoding definition, conversion,
+or corrected first-party legend that resolves the contradiction. The separate
+transparent-pixel/coverage semantics remain outside this verification: observing
+transparent pixels does not itself prove NO_RAIN. Existing coverage policy was
+not changed here.

```

### docs/PROJECT_OVERVIEW.md

```text
diff --git a/docs/PROJECT_OVERVIEW.md b/docs/PROJECT_OVERVIEW.md
index f0bd213..eb83ba8 100644
--- a/docs/PROJECT_OVERVIEW.md
+++ b/docs/PROJECT_OVERVIEW.md
@@ -176,6 +176,17 @@ glanceable and everyday.
 
 ### Current blocker
 
+**2026-09-23 correction:** Direct browser DOM/resource inspection now links
+the hrpns layer to its own precipitation legend. Seven RGB mappings are verified
+against original current PNGs (including zoom 10). The remaining 20–30 mm/h
+legend uses #FFF500, while PNGs contain #FAF500; the former #FAF500 registration
+has been withdrawn and both yellows remain UNKNOWN_PIXEL. #00AAFF/#FFAA00
+circle assets belong to AMeDAS ten-minute rainfall, not hrpns intensity.
+#FF9900 is confirmed by current hrpns evidence. See
+[PNG_PALETTE_EVIDENCE.md](PNG_PALETTE_EVIDENCE.md) for the source chain, originals,
+hashes, exact band table and unresolved conflict. The older archaeology and
+checkpoint notes must not override this correction.
+
 The largest remaining production blocker is the current JMA PNG precipitation
 palette. The current 2026 page has verified mappings for only part of the
 legend. Unknown opaque RGB values remain `UNKNOWN_PIXEL`; old 2023 mappings

```

### docs/evidence/jma-palette-2026-09-23/manifest.json

```text
diff --git a/docs/evidence/jma-palette-2026-09-23/manifest.json b/docs/evidence/jma-palette-2026-09-23/manifest.json
new file mode 100644
index 0000000..34b7744
--- /dev/null
+++ b/docs/evidence/jma-palette-2026-09-23/manifest.json
@@ -0,0 +1,1286 @@
+{
+  "inspectedDate": "2026-09-23",
+  "method": "Live browser DOM and resource inventory; original SVG/PNG asset bundle; linked HTML/XML/JS fetched from JMA over HTTPS",
+  "assets": [
+    {
+      "file": "circle_000_170_255.svg",
+      "url": "https://www.jma.go.jp/bosai/nowc/images/circle_000_170_255.svg",
+      "sha256": "574481be0f44863709d7ce4df17c7ccfb0900b6f7e6f502fa983b7bcb84f7997"
+    },
+    {
+      "file": "circle_242_242_255.svg",
+      "url": "https://www.jma.go.jp/bosai/nowc/images/circle_242_242_255.svg",
+      "sha256": "1671a65806caafe121fb649c3ed829b0e22142467d6e4b6fd2ee1e3dd7383633"
+    },
+    {
+      "file": "circle_250_245_000.svg",
+      "url": "https://www.jma.go.jp/bosai/nowc/images/circle_250_245_000.svg",
+      "sha256": "8e4fc4cfdf942772e1391db70d1e43acd224b966195c14b381955a3edb1ec2b7"
+    },
+    {
+      "file": "circle_255_040_000.svg",
+      "url": "https://www.jma.go.jp/bosai/nowc/images/circle_255_040_000.svg",
+      "sha256": "8724b8af1bd26f336ca08db1d9f41c8924d4fbcefb9c103f5efb83e70b17c17c"
+    },
+    {
+      "file": "circle_255_170_000.svg",
+      "url": "https://www.jma.go.jp/bosai/nowc/images/circle_255_170_000.svg",
+      "sha256": "b9262bbdbb2ca39ac02844ea5acc8021d9909bc00d642eff4a88a3bed8fc5794"
+    },
+    {
+      "file": "hrpns-20260923101500-4-14-6.png",
+      "url": "https://www.jma.go.jp/bosai/jmatile/data/nowc/20260923101500/none/20260923101500/surf/hrpns/4/14/6.png",
+      "sha256": "bf062e4d570b3dddb3cf78273e75951c6315a54c930b46aa202d013c01714802",
+      "rgbaCounts": [
+        {
+          "rgba": [
+            0,
+            65,
+            255,
+            255
+          ],
+          "count": 84
+        },
+        {
+          "rgba": [
+            33,
+            140,
+            255,
+            255
+          ],
+          "count": 95
+        },
+        {
+          "rgba": [
+            160,
+            210,
+            255,
+            255
+          ],
+          "count": 647
+        },
+        {
+          "rgba": [
+            242,
+            242,
+            255,
+            255
+          ],
+          "count": 563
+        },
+        {
+          "rgba": [
+            250,
+            245,
+            0,
+            255
+          ],
+          "count": 15
+        },
+        {
+          "rgba": [
+            255,
+            40,
+            0,
+            255
+          ],
+          "count": 6
+        },
+        {
+          "rgba": [
+            255,
+            153,
+            0,
+            255
+          ],
+          "count": 13
+        },
+        {
+          "rgba": [
+            255,
+            255,
+            255,
+            0
+          ],
+          "count": 64113
+        }
+      ],
+      "samples": [
+        {
+          "rgba": [
+            0,
+            65,
+            255,
+            255
+          ],
+          "pixels": [
+            [
+              26,
+              55
+            ],
+            [
+              27,
+              55
+            ],
+            [
+              28,
+              55
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            33,
+            140,
+            255,
+            255
+          ],
+          "pixels": [
+            [
+              27,
+              44
+            ],
+            [
+              34,
+              50
+            ],
+            [
+              34,
+              51
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            160,
+            210,
+            255,
+            255
+          ],
+          "pixels": [
+            [
+              70,
+              12
+            ],
+            [
+              70,
+              13
+            ],
+            [
+              26,
+              42
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            242,
+            242,
+            255,
+            255
+          ],
+          "pixels": [
+            [
+              24,
+              42
+            ],
+            [
+              25,
+              42
+            ],
+            [
+              25,
+              43
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            250,
+            245,
+            0,
+            255
+          ],
+          "pixels": [
+            [
+              25,
+              81
+            ],
+            [
+              56,
+              88
+            ],
+            [
+              57,
+              90
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            255,
+            40,
+            0,
+            255
+          ],
+          "pixels": [
+            [
+              51,
+              90
+            ],
+            [
+              57,
+              92
+            ],
+            [
+              46,
+              101
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            255,
+            153,
+            0,
+            255
+          ],
+          "pixels": [
+            [
+              27,
+              56
+            ],
+            [
+              51,
+              89
+            ],
+            [
+              52,
+              89
+            ]
+          ]
+        }
+      ]
+    },
+    {
+      "file": "hrpns-20260923101500-4-14-5.png",
+      "url": "https://www.jma.go.jp/bosai/jmatile/data/nowc/20260923101500/none/20260923101500/surf/hrpns/4/14/5.png",
+      "sha256": "22a7b8c1edeecf046d8470dc79bcd4d5a404ee7ac9a301273f3f23e7811cfbbf",
+      "rgbaCounts": [
+        {
+          "rgba": [
+            0,
+            65,
+            255,
+            255
+          ],
+          "count": 12
+        },
+        {
+          "rgba": [
+            33,
+            140,
+            255,
+            255
+          ],
+          "count": 11
+        },
+        {
+          "rgba": [
+            160,
+            210,
+            255,
+            255
+          ],
+          "count": 90
+        },
+        {
+          "rgba": [
+            242,
+            242,
+            255,
+            255
+          ],
+          "count": 93
+        },
+        {
+          "rgba": [
+            250,
+            245,
+            0,
+            255
+          ],
+          "count": 1
+        },
+        {
+          "rgba": [
+            255,
+            255,
+            255,
+            0
+          ],
+          "count": 65329
+        }
+      ],
+      "samples": [
+        {
+          "rgba": [
+            0,
+            65,
+            255,
+            255
+          ],
+          "pixels": [
+            [
+              75,
+              181
+            ],
+            [
+              33,
+              190
+            ],
+            [
+              33,
+              191
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            33,
+            140,
+            255,
+            255
+          ],
+          "pixels": [
+            [
+              89,
+              173
+            ],
+            [
+              74,
+              181
+            ],
+            [
+              34,
+              191
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            160,
+            210,
+            255,
+            255
+          ],
+          "pixels": [
+            [
+              90,
+              171
+            ],
+            [
+              91,
+              171
+            ],
+            [
+              92,
+              171
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            242,
+            242,
+            255,
+            255
+          ],
+          "pixels": [
+            [
+              77,
+              171
+            ],
+            [
+              78,
+              171
+            ],
+            [
+              93,
+              171
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            250,
+            245,
+            0,
+            255
+          ],
+          "pixels": [
+            [
+              32,
+              191
+            ]
+          ]
+        }
+      ]
+    },
+    {
+      "file": "hrpns-20260923101500-4-15-6.png",
+      "url": "https://www.jma.go.jp/bosai/jmatile/data/nowc/20260923101500/none/20260923101500/surf/hrpns/4/15/6.png",
+      "sha256": "70a213096a8a3aa52d8b05ee5ff5f8d14305a01d51f9305d2555880a4a2b458c",
+      "rgbaCounts": [
+        {
+          "rgba": [
+            0,
+            0,
+            0,
+            0
+          ],
+          "count": 65536
+        }
+      ],
+      "samples": []
+    },
+    {
+      "file": "hrpns-20260923101500-4-13-6.png",
+      "url": "https://www.jma.go.jp/bosai/jmatile/data/nowc/20260923101500/none/20260923101500/surf/hrpns/4/13/6.png",
+      "sha256": "0c420b8c85dc6dc8bb21264a8ce72608727d1ca2726b2150a6d3de802fb1bc40",
+      "rgbaCounts": [
+        {
+          "rgba": [
+            0,
+            65,
+            255,
+            255
+          ],
+          "count": 74
+        },
+        {
+          "rgba": [
+            33,
+            140,
+            255,
+            255
+          ],
+          "count": 58
+        },
+        {
+          "rgba": [
+            160,
+            210,
+            255,
+            255
+          ],
+          "count": 158
+        },
+        {
+          "rgba": [
+            180,
+            0,
+            104,
+            255
+          ],
+          "count": 10
+        },
+        {
+          "rgba": [
+            242,
+            242,
+            255,
+            255
+          ],
+          "count": 155
+        },
+        {
+          "rgba": [
+            250,
+            245,
+            0,
+            255
+          ],
+          "count": 40
+        },
+        {
+          "rgba": [
+            255,
+            40,
+            0,
+            255
+          ],
+          "count": 17
+        },
+        {
+          "rgba": [
+            255,
+            153,
+            0,
+            255
+          ],
+          "count": 23
+        },
+        {
+          "rgba": [
+            255,
+            255,
+            255,
+            0
+          ],
+          "count": 65001
+        }
+      ],
+      "samples": [
+        {
+          "rgba": [
+            0,
+            65,
+            255,
+            255
+          ],
+          "pixels": [
+            [
+              210,
+              96
+            ],
+            [
+              233,
+              109
+            ],
+            [
+              237,
+              109
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            33,
+            140,
+            255,
+            255
+          ],
+          "pixels": [
+            [
+              240,
+              104
+            ],
+            [
+              175,
+              137
+            ],
+            [
+              217,
+              137
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            160,
+            210,
+            255,
+            255
+          ],
+          "pixels": [
+            [
+              241,
+              104
+            ],
+            [
+              240,
+              105
+            ],
+            [
+              241,
+              105
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            180,
+            0,
+            104,
+            255
+          ],
+          "pixels": [
+            [
+              237,
+              108
+            ],
+            [
+              236,
+              110
+            ],
+            [
+              237,
+              110
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            242,
+            242,
+            255,
+            255
+          ],
+          "pixels": [
+            [
+              233,
+              78
+            ],
+            [
+              234,
+              78
+            ],
+            [
+              233,
+              79
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            250,
+            245,
+            0,
+            255
+          ],
+          "pixels": [
+            [
+              237,
+              107
+            ],
+            [
+              238,
+              108
+            ],
+            [
+              218,
+              137
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            255,
+            40,
+            0,
+            255
+          ],
+          "pixels": [
+            [
+              236,
+              111
+            ],
+            [
+              215,
+              143
+            ],
+            [
+              232,
+              148
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            255,
+            153,
+            0,
+            255
+          ],
+          "pixels": [
+            [
+              238,
+              107
+            ],
+            [
+              217,
+              139
+            ],
+            [
+              158,
+              228
+            ]
+          ]
+        }
+      ]
+    },
+    {
+      "file": "hrpns-20260923101500-4-14-7.png",
+      "url": "https://www.jma.go.jp/bosai/jmatile/data/nowc/20260923101500/none/20260923101500/surf/hrpns/4/14/7.png",
+      "sha256": "70a213096a8a3aa52d8b05ee5ff5f8d14305a01d51f9305d2555880a4a2b458c",
+      "rgbaCounts": [
+        {
+          "rgba": [
+            0,
+            0,
+            0,
+            0
+          ],
+          "count": 65536
+        }
+      ],
+      "samples": []
+    },
+    {
+      "file": "hrpns-20260923101500-4-13-5.png",
+      "url": "https://www.jma.go.jp/bosai/jmatile/data/nowc/20260923101500/none/20260923101500/surf/hrpns/4/13/5.png",
+      "sha256": "70a213096a8a3aa52d8b05ee5ff5f8d14305a01d51f9305d2555880a4a2b458c",
+      "rgbaCounts": [
+        {
+          "rgba": [
+            0,
+            0,
+            0,
+            0
+          ],
+          "count": 65536
+        }
+      ],
+      "samples": []
+    },
+    {
+      "file": "hrpns-20260923101500-4-15-5.png",
+      "url": "https://www.jma.go.jp/bosai/jmatile/data/nowc/20260923101500/none/20260923101500/surf/hrpns/4/15/5.png",
+      "sha256": "70a213096a8a3aa52d8b05ee5ff5f8d14305a01d51f9305d2555880a4a2b458c",
+      "rgbaCounts": [
+        {
+          "rgba": [
+            0,
+            0,
+            0,
+            0
+          ],
+          "count": 65536
+        }
+      ],
+      "samples": []
+    },
+    {
+      "file": "hrpns-20260923101500-4-13-7.png",
+      "url": "https://www.jma.go.jp/bosai/jmatile/data/nowc/20260923101500/none/20260923101500/surf/hrpns/4/13/7.png",
+      "sha256": "e32fab15f4d09cad162068d7847e317e25d1fa6a75407799f5417dd7d1451d9b",
+      "rgbaCounts": [
+        {
+          "rgba": [
+            0,
+            65,
+            255,
+            255
+          ],
+          "count": 7
+        },
+        {
+          "rgba": [
+            33,
+            140,
+            255,
+            255
+          ],
+          "count": 7
+        },
+        {
+          "rgba": [
+            160,
+            210,
+            255,
+            255
+          ],
+          "count": 8
+        },
+        {
+          "rgba": [
+            242,
+            242,
+            255,
+            255
+          ],
+          "count": 8
+        },
+        {
+          "rgba": [
+            250,
+            245,
+            0,
+            255
+          ],
+          "count": 4
+        },
+        {
+          "rgba": [
+            255,
+            153,
+            0,
+            255
+          ],
+          "count": 2
+        },
+        {
+          "rgba": [
+            255,
+            255,
+            255,
+            0
+          ],
+          "count": 65500
+        }
+      ],
+      "samples": [
+        {
+          "rgba": [
+            0,
+            65,
+            255,
+            255
+          ],
+          "pixels": [
+            [
+              122,
+              0
+            ],
+            [
+              122,
+              1
+            ],
+            [
+              123,
+              1
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            33,
+            140,
+            255,
+            255
+          ],
+          "pixels": [
+            [
+              123,
+              0
+            ],
+            [
+              125,
+              0
+            ],
+            [
+              155,
+              2
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            160,
+            210,
+            255,
+            255
+          ],
+          "pixels": [
+            [
+              124,
+              0
+            ],
+            [
+              126,
+              1
+            ],
+            [
+              123,
+              2
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            242,
+            242,
+            255,
+            255
+          ],
+          "pixels": [
+            [
+              121,
+              0
+            ],
+            [
+              126,
+              0
+            ],
+            [
+              131,
+              1
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            250,
+            245,
+            0,
+            255
+          ],
+          "pixels": [
+            [
+              117,
+              2
+            ],
+            [
+              118,
+              2
+            ],
+            [
+              117,
+              3
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            255,
+            153,
+            0,
+            255
+          ],
+          "pixels": [
+            [
+              124,
+              1
+            ],
+            [
+              125,
+              1
+            ]
+          ]
+        }
+      ]
+    },
+    {
+      "file": "hrpns-20260923101500-4-15-7.png",
+      "url": "https://www.jma.go.jp/bosai/jmatile/data/nowc/20260923101500/none/20260923101500/surf/hrpns/4/15/7.png",
+      "sha256": "70a213096a8a3aa52d8b05ee5ff5f8d14305a01d51f9305d2555880a4a2b458c",
+      "rgbaCounts": [
+        {
+          "rgba": [
+            0,
+            0,
+            0,
+            0
+          ],
+          "count": 65536
+        }
+      ],
+      "samples": []
+    },
+    {
+      "file": "legend_jp_thin_hrpns.svg",
+      "url": "https://www.jma.go.jp/bosai/nowc/images/legend_jp_thin_hrpns.svg",
+      "sha256": "5cb17aa9f05b884f5e376a1bec410ac0f09793d85b4c93780339ab2915d7e063"
+    },
+    {
+      "file": "legend_jp_normal_hrpns.svg",
+      "url": "https://www.jma.go.jp/bosai/nowc/images/legend_jp_normal_hrpns.svg",
+      "sha256": "854beabf8f5e46f14baf869df3ff9e779af8d61f54aedeed874b6f7f80445478"
+    },
+    {
+      "file": "legend_jp_deep_hrpns.svg",
+      "url": "https://www.jma.go.jp/bosai/nowc/images/legend_jp_deep_hrpns.svg",
+      "sha256": "670c653727b73b460cfe96b4911d400f24b4a50410960950350a6b57c67cca9d"
+    },
+    {
+      "file": "index.html",
+      "url": "https://www.jma.go.jp/bosai/nowc/",
+      "sha256": "47543f6f446bec0d308af99a5221847ea9a6ec7a947bf72d76cd9b663b93e85f"
+    },
+    {
+      "file": "nowc.xml",
+      "url": "https://www.jma.go.jp/bosai/nowc/table/nowc.properties__7d6f7d8dc6f16a416574.xml",
+      "sha256": "bcf59d3cdd98e0ef31a0d691692068ba450b4f090a6fc82b1da1fa16777fab8c"
+    },
+    {
+      "file": "jmatile.xml",
+      "url": "https://www.jma.go.jp/bosai/jmatile/table/jmatile.properties__8f09b62937127ac173c5.xml",
+      "sha256": "bc715cc681f1f050de292ecc6e79574d46ea75d47fb178be020bf86ebb99f062"
+    },
+    {
+      "file": "jmatile-opacity-excerpt.txt",
+      "url": "https://www.jma.go.jp/bosai/jmatile/js/jmatile.bundle__6888179e2a40840a12d6.js",
+      "sourceSha256": "71c2524706f188fa04ab799265a8a131ff3a8c6859666fdc9c64f7d3d946c824",
+      "sha256": "e967c73194a78751df55574ee26b109a2e7bd49d3403ab8ec122172986f844e6",
+      "note": "Exact excerpt, not the complete bundle"
+    },
+    {
+      "file": "hrpns-20260923101500-10-891-411.png",
+      "url": "https://www.jma.go.jp/bosai/jmatile/data/nowc/20260923101500/none/20260923101500/surf/hrpns/10/891/411.png",
+      "sha256": "d0b63241b99ae030b478a4033a0febb961389cfc9d9a528d2c2cfebc5ee45479",
+      "note": "Native zoom 10 child of observed z4 tile 13/6; selected from its nontransparent pixel coordinates, not by color-band ordering.",
+      "rgbaCounts": [
+        {
+          "rgba": [
+            0,
+            65,
+            255,
+            255
+          ],
+          "count": 1245
+        },
+        {
+          "rgba": [
+            33,
+            140,
+            255,
+            255
+          ],
+          "count": 1037
+        },
+        {
+          "rgba": [
+            160,
+            210,
+            255,
+            255
+          ],
+          "count": 3594
+        },
+        {
+          "rgba": [
+            180,
+            0,
+            104,
+            255
+          ],
+          "count": 214
+        },
+        {
+          "rgba": [
+            242,
+            242,
+            255,
+            255
+          ],
+          "count": 5550
+        },
+        {
+          "rgba": [
+            250,
+            245,
+            0,
+            255
+          ],
+          "count": 562
+        },
+        {
+          "rgba": [
+            255,
+            40,
+            0,
+            255
+          ],
+          "count": 331
+        },
+        {
+          "rgba": [
+            255,
+            153,
+            0,
+            255
+          ],
+          "count": 531
+        },
+        {
+          "rgba": [
+            255,
+            255,
+            255,
+            0
+          ],
+          "count": 52472
+        }
+      ],
+      "samples": [
+        {
+          "rgba": [
+            0,
+            65,
+            255,
+            255
+          ],
+          "pixels": [
+            [
+              85,
+              0
+            ],
+            [
+              86,
+              0
+            ],
+            [
+              87,
+              0
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            33,
+            140,
+            255,
+            255
+          ],
+          "pixels": [
+            [
+              80,
+              0
+            ],
+            [
+              81,
+              0
+            ],
+            [
+              82,
+              0
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            160,
+            210,
+            255,
+            255
+          ],
+          "pixels": [
+            [
+              78,
+              0
+            ],
+            [
+              79,
+              0
+            ],
+            [
+              154,
+              0
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            180,
+            0,
+            104,
+            255
+          ],
+          "pixels": [
+            [
+              110,
+              1
+            ],
+            [
+              111,
+              1
+            ],
+            [
+              112,
+              1
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            242,
+            242,
+            255,
+            255
+          ],
+          "pixels": [
+            [
+              73,
+              0
+            ],
+            [
+              74,
+              0
+            ],
+            [
+              75,
+              0
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            250,
+            245,
+            0,
+            255
+          ],
+          "pixels": [
+            [
+              105,
+              0
+            ],
+            [
+              106,
+              0
+            ],
+            [
+              107,
+              0
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            255,
+            40,
+            0,
+            255
+          ],
+          "pixels": [
+            [
+              108,
+              1
+            ],
+            [
+              109,
+              1
+            ],
+            [
+              113,
+              1
+            ]
+          ]
+        },
+        {
+          "rgba": [
+            255,
+            153,
+            0,
+            255
+          ],
+          "pixels": [
+            [
+              108,
+              0
+            ],
+            [
+              109,
+              0
+            ],
+            [
+              110,
+              0
+            ]
+          ]
+        }
+      ]
+    }
+  ]
+}

```

### lib/weather/providers/jma/JmaPublicImageProvider.test.ts

```text
diff --git a/lib/weather/providers/jma/JmaPublicImageProvider.test.ts b/lib/weather/providers/jma/JmaPublicImageProvider.test.ts
index c4fee3d..f87d8eb 100644
--- a/lib/weather/providers/jma/JmaPublicImageProvider.test.ts
+++ b/lib/weather/providers/jma/JmaPublicImageProvider.test.ts
@@ -2,7 +2,7 @@ import { describe, expect, it, vi } from "vitest";
 import { PNG } from "pngjs";
 import { JmaPublicImageProvider } from "./JmaPublicImageProvider";
 
-function pngPixel(r: number, g: number, b: number, a: number): Uint8Array {
+function pngPixel(r: number, g: number, b: number, a: number): ArrayBuffer {
   const png = new PNG({ width: 256, height: 256 });
   for (let i = 0; i < png.data.length; i += 4) {
     png.data[i] = r;
@@ -10,7 +10,7 @@ function pngPixel(r: number, g: number, b: number, a: number): Uint8Array {
     png.data[i + 2] = b;
     png.data[i + 3] = a;
   }
-  return PNG.sync.write(png);
+  return Uint8Array.from(PNG.sync.write(png)).buffer;
 }
 
 function response(body: BodyInit, init?: ResponseInit) {
@@ -59,12 +59,12 @@ describe("JmaPublicImageProvider integration boundary", () => {
     expect(series.frames.map((f) => f.status)).toEqual(["NO_RAIN", "FETCH_ERROR"]);
   });
 
-  it("keeps an unverified opaque color UNKNOWN_PIXEL", async () => {
+  it.each([[1, 2, 3], [250, 245, 0], [255, 245, 0], [0, 170, 255], [255, 170, 0]])("keeps unsupported RGB (%i,%i,%i) UNKNOWN_PIXEL", async (r, g, b) => {
     const targets = [{ basetime: "20260920120000", validtime: "20260920120500", elements: ["hrpns"] }];
     const fetcher = vi.fn(async (input: RequestInfo | URL) => {
       const url = String(input);
       if (url.includes("targetTimes_N2.json")) return response(JSON.stringify(targets));
-      return response(pngPixel(1, 2, 3, 255));
+      return response(pngPixel(r, g, b, 255));
     }) as unknown as typeof fetch;
 
     const provider = new JmaPublicImageProvider(fetcher);

```

### lib/weather/providers/jma/classifyPixel.test.ts

```text
diff --git a/lib/weather/providers/jma/classifyPixel.test.ts b/lib/weather/providers/jma/classifyPixel.test.ts
index f5ed6e9..e61cee8 100644
--- a/lib/weather/providers/jma/classifyPixel.test.ts
+++ b/lib/weather/providers/jma/classifyPixel.test.ts
@@ -8,12 +8,12 @@ describe("classifyRainPixel", () => {
     });
   });
   it("recognises a directly confirmed current JMA legend color", () => {
-    expect(classifyRainPixel({ r: 250, g: 245, b: 0, a: 255 })).toEqual({
-      status: "RAIN", intensityClass: "20_TO_30",
+    expect(classifyRainPixel({ r: 255, g: 153, b: 0, a: 255 })).toEqual({
+      status: "RAIN", intensityClass: "30_TO_50",
     });
   });
-  it("does not resurrect an old unverified color", () => {
-    expect(classifyRainPixel({ r: 255, g: 153, b: 0, a: 255 }).status).toBe("UNKNOWN_PIXEL");
+  it("withdraws yellow when current SVG and PNG evidence disagree", () => {
+    expect(classifyRainPixel({ r: 250, g: 245, b: 0, a: 255 }).status).toBe("UNKNOWN_PIXEL");
   });
   it("never turns an unknown opaque pixel into dry", () => {
     expect(classifyRainPixel({ r: 1, g: 2, b: 3, a: 255 }).status).toBe("UNKNOWN_PIXEL");

```

### lib/weather/providers/jma/paletteWatcher.test.ts

```text
diff --git a/lib/weather/providers/jma/paletteWatcher.test.ts b/lib/weather/providers/jma/paletteWatcher.test.ts
index 638cb39..73fd781 100644
--- a/lib/weather/providers/jma/paletteWatcher.test.ts
+++ b/lib/weather/providers/jma/paletteWatcher.test.ts
@@ -13,29 +13,29 @@ describe("JMA palette watcher", () => {
 
   it("detects a changed RGB without promoting it", () => {
     const observed = VERIFIED_JMA_PNG_PALETTE.map(({ rgba, intensityClass }) => ({
-      rgba: intensityClass === "20_TO_30" ? { r: 1, g: 2, b: 3, a: 255 } : rgba,
+      rgba: intensityClass === "30_TO_50" ? { r: 1, g: 2, b: 3, a: 255 } : rgba,
       intensityClass,
     }));
     const result = compareObservedPalette(observed);
     expect(result.status).toBe("CHANGE_DETECTED");
     expect(result.changes).toContainEqual({
-      intensityClass: "20_TO_30",
-      expected: { r: 250, g: 245, b: 0, a: 255 },
+      intensityClass: "30_TO_50",
+      expected: { r: 255, g: 153, b: 0, a: 255 },
       observed: { r: 1, g: 2, b: 3, a: 255 },
     });
-    expect(VERIFIED_JMA_PNG_PALETTE.find((x) => x.intensityClass === "20_TO_30")?.rgba)
-      .toEqual({ r: 250, g: 245, b: 0, a: 255 });
+    expect(VERIFIED_JMA_PNG_PALETTE.find((x) => x.intensityClass === "30_TO_50")?.rgba)
+      .toEqual({ r: 255, g: 153, b: 0, a: 255 });
   });
 
   it("detects newly observed or missing mappings", () => {
     const observed = VERIFIED_JMA_PNG_PALETTE
       .filter((x) => x.intensityClass !== "LT_1")
       .map(({ rgba, intensityClass }) => ({ rgba, intensityClass }));
-    observed.push({ rgba: { r: 9, g: 9, b: 9, a: 255 }, intensityClass: "5_TO_10" });
+    observed.push({ rgba: { r: 9, g: 9, b: 9, a: 255 }, intensityClass: "20_TO_30" });
 
     const result = compareObservedPalette(observed);
     expect(result.status).toBe("CHANGE_DETECTED");
     expect(result.changes.some((x) => x.intensityClass === "LT_1" && x.observed === null)).toBe(true);
-    expect(result.changes.some((x) => x.intensityClass === "5_TO_10" && x.expected === null)).toBe(true);
+    expect(result.changes.some((x) => x.intensityClass === "20_TO_30" && x.expected === null)).toBe(true);
   });
 });

```

### lib/weather/providers/jma/pngPalette.test.ts

```text
diff --git a/lib/weather/providers/jma/pngPalette.test.ts b/lib/weather/providers/jma/pngPalette.test.ts
index 8617318..92dac8f 100644
--- a/lib/weather/providers/jma/pngPalette.test.ts
+++ b/lib/weather/providers/jma/pngPalette.test.ts
@@ -1,17 +1,54 @@
+import { readFileSync } from "node:fs";
+import { PNG } from "pngjs";
 import { describe, expect, it } from "vitest";
 import { VERIFIED_JMA_PNG_PALETTE, findVerifiedIntensity } from "./pngPalette";
+import { classifyRainPixel } from "./classifyPixel";
+
+// Independently recorded from JMA's hrpns SVG and raw PNG on 2026-09-23.
+const verified = [
+  [242, 242, 255, "LT_1"],
+  [160, 210, 255, "1_TO_5"],
+  [33, 140, 255, "5_TO_10"],
+  [0, 65, 255, "10_TO_20"],
+  [255, 153, 0, "30_TO_50"],
+  [255, 40, 0, "50_TO_80"],
+  [180, 0, 104, "GTE_80"],
+] as const;
 
 describe("verified JMA PNG palette", () => {
   it("contains only explicitly evidence-gated current JMA mappings", () => {
-    expect(VERIFIED_JMA_PNG_PALETTE.length).toBeGreaterThan(0);
+    expect(VERIFIED_JMA_PNG_PALETTE).toHaveLength(7);
     expect(VERIFIED_JMA_PNG_PALETTE.every((entry) => entry.evidence === "CURRENT_JMA_ASSET")).toBe(true);
   });
 
-  it("recognises a verified current JMA color", () => {
-    expect(findVerifiedIntensity({ r: 250, g: 245, b: 0, a: 255 })).toBe("20_TO_30");
+  it.each(verified)("classifies raw RGB (%i,%i,%i) as %s", (r, g, b, band) => {
+    expect(findVerifiedIntensity({ r, g, b, a: 255 })).toBe(band);
+    expect(findVerifiedIntensity({ r, g, b, a: 191 })).toBeNull();
+  });
+
+  it.each([
+    [250, 245, 0], // PNG yellow does not match the hrpns legend.
+    [255, 245, 0], // Legend yellow is not corroborated by raw PNG pixels.
+    [0, 170, 255], // AMeDAS rain10m circle, not hrpns.
+    [255, 170, 0], // AMeDAS rain10m circle, not hrpns.
+    [1, 2, 3],
+  ])("keeps unsupported RGB (%i,%i,%i) UNKNOWN_PIXEL", (r, g, b) => {
+    expect(classifyRainPixel({ r, g, b, a: 255 })).toEqual({ status: "UNKNOWN_PIXEL", intensityClass: null });
   });
 
-  it("does not classify an old unverified opaque color", () => {
-    expect(findVerifiedIntensity({ r: 255, g: 153, b: 0, a: 255 })).toBeNull();
+  it("decodes corroborated colors from the archived native-zoom JMA PNG", () => {
+    const png = PNG.sync.read(readFileSync("docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-10-891-411.png"));
+    const colors = new Set<string>();
+    let unresolvedYellow = 0;
+    for (let i = 0; i < png.data.length; i += 4) {
+      const [r, g, b, a] = png.data.subarray(i, i + 4);
+      colors.add(`${r},${g},${b},${a}`);
+      if (r === 250 && g === 245 && b === 0 && a === 255) {
+        expect(classifyRainPixel({ r, g, b, a }).status).toBe("UNKNOWN_PIXEL");
+        unresolvedYellow++;
+      }
+    }
+    for (const [r, g, b] of verified) expect(colors.has(`${r},${g},${b},255`)).toBe(true);
+    expect(unresolvedYellow).toBe(562);
   });
 });

```

### lib/weather/providers/jma/pngPalette.ts

```text
diff --git a/lib/weather/providers/jma/pngPalette.ts b/lib/weather/providers/jma/pngPalette.ts
index 5798b2d..4567bc2 100644
--- a/lib/weather/providers/jma/pngPalette.ts
+++ b/lib/weather/providers/jma/pngPalette.ts
@@ -6,10 +6,17 @@ export interface VerifiedPaletteEntry {
   evidence: "CURRENT_JMA_ASSET";
 }
 
+// Evidence: docs/PNG_PALETTE_EVIDENCE.md (2026-09-23), hrpns legend + raw PNGs.
+// 20_TO_30 is deliberately absent: SVG #FFF500 and PNG #FAF500 disagree.
+// AMeDAS rain10m circle assets are not evidence for hrpns intensity.
 export const VERIFIED_JMA_PNG_PALETTE: readonly VerifiedPaletteEntry[] = [
   { rgba: { r: 242, g: 242, b: 255, a: 255 }, intensityClass: "LT_1", evidence: "CURRENT_JMA_ASSET" },
-  { rgba: { r: 250, g: 245, b: 0, a: 255 }, intensityClass: "20_TO_30", evidence: "CURRENT_JMA_ASSET" },
+  { rgba: { r: 160, g: 210, b: 255, a: 255 }, intensityClass: "1_TO_5", evidence: "CURRENT_JMA_ASSET" },
+  { rgba: { r: 33, g: 140, b: 255, a: 255 }, intensityClass: "5_TO_10", evidence: "CURRENT_JMA_ASSET" },
+  { rgba: { r: 0, g: 65, b: 255, a: 255 }, intensityClass: "10_TO_20", evidence: "CURRENT_JMA_ASSET" },
+  { rgba: { r: 255, g: 153, b: 0, a: 255 }, intensityClass: "30_TO_50", evidence: "CURRENT_JMA_ASSET" },
   { rgba: { r: 255, g: 40, b: 0, a: 255 }, intensityClass: "50_TO_80", evidence: "CURRENT_JMA_ASSET" },
+  { rgba: { r: 180, g: 0, b: 104, a: 255 }, intensityClass: "GTE_80", evidence: "CURRENT_JMA_ASSET" },
 ];
 
 export function findVerifiedIntensity(rgba: Rgba): RainIntensityClass | null {

```

