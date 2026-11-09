# fix: improve Japanese address search normalization

[PR原本](https://github.com/miyazaki1016/emergencyalert/pull/4)

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

日本語住所検索の正規化を改善

日本語見出しは変更目的の案内。受入完了・本番反映の認定ではない。差分・検証・残課題を原本で確認。

- [根拠](https://github.com/miyazaki1016/emergencyalert/pull/4)

## 実際の変更処理（コードから抽出）

attempt、attempts、fetchNominatim、items、latitude、longitude、normalizeJapaneseAddress、normalized、response、searchPlaces、trimmed、url

- 関数・クラス定義：`function normalizeJapaneseAddress(query: string): string {`（[lib/places/searchPlaces.ts](https://github.com/miyazaki1016/emergencyalert/blob/9f6b368065bd575bb4c9de753b40bad8cd1ae2d3/lib/places/searchPlaces.ts)）
- 関数・クラス定義：`async function fetchNominatim(query: string): Promise&lt;NominatimItem[]&gt; {`（[lib/places/searchPlaces.ts](https://github.com/miyazaki1016/emergencyalert/blob/9f6b368065bd575bb4c9de753b40bad8cd1ae2d3/lib/places/searchPlaces.ts)）
- 関数・クラス定義：`export async function searchPlaces(query: string): Promise&lt;PlaceSearchResult[]&gt; {`（[lib/places/searchPlaces.ts](https://github.com/miyazaki1016/emergencyalert/blob/9f6b368065bd575bb4c9de753b40bad8cd1ae2d3/lib/places/searchPlaces.ts)）
- 条件分岐・閾値：`if (trimmed.length &lt; 2) return [];`（[lib/places/searchPlaces.ts](https://github.com/miyazaki1016/emergencyalert/blob/9f6b368065bd575bb4c9de753b40bad8cd1ae2d3/lib/places/searchPlaces.ts)）
- DB・ストレージ操作の呼出し：`const attempts = Array.from(new Set([`（[lib/places/searchPlaces.ts](https://github.com/miyazaki1016/emergencyalert/blob/9f6b368065bd575bb4c9de753b40bad8cd1ae2d3/lib/places/searchPlaces.ts)）
- 条件分岐・閾値：`if (items.length) break;`（[lib/places/searchPlaces.ts](https://github.com/miyazaki1016/emergencyalert/blob/9f6b368065bd575bb4c9de753b40bad8cd1ae2d3/lib/places/searchPlaces.ts)）
- [lib/places/searchPlaces.ts](https://github.com/miyazaki1016/emergencyalert/blob/9f6b368065bd575bb4c9de753b40bad8cd1ae2d3/lib/places/searchPlaces.ts)：全文

## 検証実行の事実

| ワークフロー | 結果 | 対象SHA |
| --- | --- | --- |
| [CI](https://github.com/miyazaki1016/emergencyalert/actions/runs/35932117740) | success | 9f6b368065bd575bb4c9de753b40bad8cd1ae2d3 |

## 当時の説明・結論（原文。作者の主張と実測を区別）

```text
iPhone実機で `江東区塩浜2-9-8` が見つからないケースを受け、住所検索前に日本語住所表記を正規化します。

- NFKC正規化
- 丁目/番地/号をハイフン形式へ正規化
- ダッシュ類を統一
- 都道府県付き入力のフォールバック

Nominatimを予測入力には使わず、従来どおり明示的な検索時のみ呼び出します。
```

## ソース・テスト・資料の抜粋（実行はしない）

### lib/places/searchPlaces.ts

```text
diff --git a/lib/places/searchPlaces.ts b/lib/places/searchPlaces.ts
index fcea5de..0c9888e 100644
--- a/lib/places/searchPlaces.ts
+++ b/lib/places/searchPlaces.ts
@@ -14,12 +14,22 @@ interface NominatimItem {
   lon: string;
 }
 
-export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
-  const trimmed = query.trim();
-  if (trimmed.length < 2) return [];
+function normalizeJapaneseAddress(query: string): string {
+  return query
+    .normalize("NFKC")
+    .replace(/[‐‑‒–—―ー−]/g, "-")
+    .replace(/(\d+)丁目(?:[- ]?(\d+))?(?:[- ]?(\d+))?/g, (_match, chome, ban, go) => {
+      return [chome, ban, go].filter(Boolean).join("-");
+    })
+    .replace(/(\d+)番地?(\d+)?号?/g, (_match, ban, go) => [ban, go].filter(Boolean).join("-"))
+    .replace(/(\d+)号/g, "$1")
+    .replace(/\s+/g, " ")
+    .trim();
+}
 
+async function fetchNominatim(query: string): Promise<NominatimItem[]> {
   const url = new URL("https://nominatim.openstreetmap.org/search");
-  url.searchParams.set("q", trimmed);
+  url.searchParams.set("q", query);
   url.searchParams.set("format", "jsonv2");
   url.searchParams.set("addressdetails", "1");
   url.searchParams.set("limit", "5");
@@ -34,8 +44,25 @@ export async function searchPlaces(query: string): Promise<PlaceSearchResult[]>
     cache: "no-store",
   });
   if (!response.ok) throw new Error("PLACE_SEARCH_UNAVAILABLE");
+  return (await response.json()) as NominatimItem[];
+}
+
+export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
+  const trimmed = query.trim();
+  if (trimmed.length < 2) return [];
+
+  const normalized = normalizeJapaneseAddress(trimmed);
+  const attempts = Array.from(new Set([
+    normalized,
+    normalized.replace(/^(東京都|北海道|(?:京都|大阪)府|.{2,3}県)/, ""),
+  ].filter((value) => value.length >= 2)));
+
+  let items: NominatimItem[] = [];
+  for (const attempt of attempts) {
+    items = await fetchNominatim(attempt);
+    if (items.length) break;
+  }
 
-  const items = (await response.json()) as NominatimItem[];
   return items.flatMap((item) => {
     const latitude = Number(item.lat);
     const longitude = Number(item.lon);

```

