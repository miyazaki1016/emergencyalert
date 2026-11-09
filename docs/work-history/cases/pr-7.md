# fix: route Japanese numeric addresses to address normalizer

[PR原本](https://github.com/miyazaki1016/emergencyalert/pull/7)

**目的：** 変更対象ファイルに関する開発。具体的な目的は原文・差分を確認

**実装状態：** 変更差分を取得。実装の受入完了は未認定

**検証の扱い：** Actionsの成否は実行単位の事実。製品の受入検証とは別

**PR状態：** merged

**main統合：** mainに祖先コミットとして存在（機能受入・本番は別）

**本番反映：** 未確認（main統合／Vercelプレビューから推定しない）

**残課題：** 受入条件・未解決事項をPR本文、レビュー、台帳と照合

**次の作業：** 類似コード・既存結論を確認し、未解決条件だけを次の作業にする

根拠取得日時 (UTC)：2026-11-09T09:02:35.033623+00:00

## 日本語で確認した成果

数字を含む日本語住所を住所正規化へ渡す

日本語見出しは変更目的の案内。受入完了・本番反映の認定ではない。差分・検証・残課題を原本で確認。

- [根拠](https://github.com/miyazaki1016/emergencyalert/pull/7)

## 実際の変更処理（コードから抽出）

address、displayAddress、fetchNominatim、items、latitude、longitude、normalizeJapaneseAddress、normalized、response、searchPlaces、trimmed、url

- テストの期待値・条件：`if (/\d/.test(normalized) &amp;&amp; /[都道府県市区町村丁目番]/.test(normalized)) {`（[lib/places/searchPlaces.ts](https://github.com/miyazaki1016/emergencyalert/blob/1896f541792a3bffa860d66cc02413e27b50346d/lib/places/searchPlaces.ts)）
- [lib/places/searchPlaces.ts](https://github.com/miyazaki1016/emergencyalert/blob/1896f541792a3bffa860d66cc02413e27b50346d/lib/places/searchPlaces.ts)：全文

## 検証実行の事実

| ワークフロー | 結果 | 対象SHA |
| --- | --- | --- |
| [CI](https://github.com/miyazaki1016/emergencyalert/actions/runs/35934725326) | success | 1896f541792a3bffa860d66cc02413e27b50346d |

## 当時の説明・結論（原文。作者の主張と実測を区別）

```text
Fix the address-like query detector. The regex was accidentally written as /\\d/, which looks for a literal backslash plus d, so queries such as 江東区塩浜2-9-8 skipped the Japanese address normalizer and fell through to Nominatim.
```

## ソース・テスト・資料の抜粋（実行はしない）

### lib/places/searchPlaces.ts

```text
diff --git a/lib/places/searchPlaces.ts b/lib/places/searchPlaces.ts
index 8e337ad..4ab7f89 100644
--- a/lib/places/searchPlaces.ts
+++ b/lib/places/searchPlaces.ts
@@ -55,7 +55,7 @@ export async function searchPlaces(query: string): Promise<PlaceSearchResult[]>
 
   const normalized = normalizeJapaneseAddress(trimmed);
 
-  if (/\\d/.test(normalized) && /[都道府県市区町村丁目番]/.test(normalized)) {
+  if (/\d/.test(normalized) && /[都道府県市区町村丁目番]/.test(normalized)) {
     try {
       const address = await normalize(normalized);
       if (address.point && address.level >= 3) {

```

