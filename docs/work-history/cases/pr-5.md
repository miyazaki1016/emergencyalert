# feat: support Japanese street address search

[PR原本](https://github.com/miyazaki1016/emergencyalert/pull/5)

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

日本の番地住所を検索可能にする

日本語見出しは変更目的の案内。受入完了・本番反映の認定ではない。差分・検証・残課題を原本で確認。

- [根拠](https://github.com/miyazaki1016/emergencyalert/pull/5)

## 実際の変更処理（コードから抽出）

address、attempt、attempts、displayAddress、fetchNominatim、items、latitude、longitude、normalizeJapaneseAddress、normalized、response、searchPlaces、trimmed、url

- テストの期待値・条件：`if (/\\d/.test(normalized) &amp;&amp; /[都道府県市区町村丁目番]/.test(normalized)) {`（[lib/places/searchPlaces.ts](https://github.com/miyazaki1016/emergencyalert/blob/48f712e77622b5a4969fb8eb6ad8629e4e7b9a13/lib/places/searchPlaces.ts)）
- 条件分岐・閾値：`if (address.point &amp;&amp; address.level &gt;= 3) {`（[lib/places/searchPlaces.ts](https://github.com/miyazaki1016/emergencyalert/blob/48f712e77622b5a4969fb8eb6ad8629e4e7b9a13/lib/places/searchPlaces.ts)）
- [lib/places/searchPlaces.ts](https://github.com/miyazaki1016/emergencyalert/blob/48f712e77622b5a4969fb8eb6ad8629e4e7b9a13/lib/places/searchPlaces.ts)：全文
- [package.json](https://github.com/miyazaki1016/emergencyalert/blob/48f712e77622b5a4969fb8eb6ad8629e4e7b9a13/package.json)：全文

## 検証実行の事実

| ワークフロー | 結果 | 対象SHA |
| --- | --- | --- |
| [CI](https://github.com/miyazaki1016/emergencyalert/actions/runs/35934285218) | success | 48f712e77622b5a4969fb8eb6ad8629e4e7b9a13 |

## 当時の説明・結論（原文。作者の主張と実測を区別）

```text
Use Geolonia's Japanese address normalizer for address-like queries while retaining Nominatim for stations and facilities. This avoids treating missing OSM house-number coverage as a user input error.
```

## ソース・テスト・資料の抜粋（実行はしない）

### lib/places/searchPlaces.ts

```text
diff --git a/lib/places/searchPlaces.ts b/lib/places/searchPlaces.ts
index 0c9888e..8e337ad 100644
--- a/lib/places/searchPlaces.ts
+++ b/lib/places/searchPlaces.ts
@@ -1,3 +1,5 @@
+import { normalize } from "@geolonia/normalize-japanese-addresses";
+
 export interface PlaceSearchResult {
   id: string;
   displayName: string;
@@ -52,17 +54,29 @@ export async function searchPlaces(query: string): Promise<PlaceSearchResult[]>
   if (trimmed.length < 2) return [];
 
   const normalized = normalizeJapaneseAddress(trimmed);
-  const attempts = Array.from(new Set([
-    normalized,
-    normalized.replace(/^(東京都|北海道|(?:京都|大阪)府|.{2,3}県)/, ""),
-  ].filter((value) => value.length >= 2)));
 
-  let items: NominatimItem[] = [];
-  for (const attempt of attempts) {
-    items = await fetchNominatim(attempt);
-    if (items.length) break;
+  if (/\\d/.test(normalized) && /[都道府県市区町村丁目番]/.test(normalized)) {
+    try {
+      const address = await normalize(normalized);
+      if (address.point && address.level >= 3) {
+        const displayAddress = [address.pref, address.city, address.town, address.addr].filter(Boolean).join("");
+        return [{
+          id: `address:${displayAddress}`,
+          displayName: address.town || displayAddress || trimmed,
+          displayAddress: displayAddress || trimmed,
+          latitude: address.point.lat,
+          longitude: address.point.lng,
+        }];
+      }
+    } catch {
+      // Keep facility/station search available through Nominatim.
+    }
   }
 
+  // Use one explicit Nominatim request for stations/facilities. Avoid rapid
+  // retry loops so we stay within the public service usage policy.
+  const items = await fetchNominatim(normalized);
+
   return items.flatMap((item) => {
     const latitude = Number(item.lat);
     const longitude = Number(item.lon);

```

### package.json

```text
diff --git a/package.json b/package.json
index 54bcfa4..5569eb4 100644
--- a/package.json
+++ b/package.json
@@ -15,7 +15,8 @@
     "react": "^19.1.0",
     "react-dom": "^19.1.0",
     "pngjs": "^7.0.0",
-    "@supabase/supabase-js": "^2.57.4"
+    "@supabase/supabase-js": "^2.57.4",
+    "@geolonia/normalize-japanese-addresses": "^3.1.0"
   },
   "devDependencies": {
     "@types/node": "^22.0.0",

```

