# fix: add PWA install icons

[PR原本](https://github.com/miyazaki1016/emergencyalert/pull/3)

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

PWAのインストール用アイコンを修正

日本語見出しは変更目的の案内。受入完了・本番反映の認定ではない。差分・検証・残課題を原本で確認。

- [根拠](https://github.com/miyazaki1016/emergencyalert/pull/3)

## 実際の変更処理（コードから抽出）

Icon、contentType、manifest、size

- 関数・クラス定義：`export default function Icon() {`（[app/icon.tsx](https://github.com/miyazaki1016/emergencyalert/blob/bb6c7ae27a4bf1cbb6e1e0d60f9c1630f9f6080f/app/icon.tsx)）
- [app/icon.tsx](https://github.com/miyazaki1016/emergencyalert/blob/bb6c7ae27a4bf1cbb6e1e0d60f9c1630f9f6080f/app/icon.tsx)：全文
- [app/manifest.ts](https://github.com/miyazaki1016/emergencyalert/blob/bb6c7ae27a4bf1cbb6e1e0d60f9c1630f9f6080f/app/manifest.ts)：全文

## 検証実行の事実

| ワークフロー | 結果 | 対象SHA |
| --- | --- | --- |
| [CI](https://github.com/miyazaki1016/emergencyalert/actions/runs/35929474094) | success | bb6c7ae27a4bf1cbb6e1e0d60f9c1630f9f6080f |

## 当時の説明・結論（原文。作者の主張と実測を区別）

```text
Android/iPhoneのホーム画面追加で必要なPWAアイコンを追加します。

- Next.js generated app icon `/icon`
- manifest icons (any + maskable)

インストール実機テスト前のPWA基盤補完です。
```

## ソース・テスト・資料の抜粋（実行はしない）

### app/icon.tsx

```text
diff --git a/app/icon.tsx b/app/icon.tsx
new file mode 100644
index 0000000..fbcb2d4
--- /dev/null
+++ b/app/icon.tsx
@@ -0,0 +1,40 @@
+import { ImageResponse } from "next/og";
+
+export const size = { width: 512, height: 512 };
+export const contentType = "image/png";
+
+export default function Icon() {
+  return new ImageResponse(
+    (
+      <div
+        style={{
+          width: "100%",
+          height: "100%",
+          display: "flex",
+          alignItems: "center",
+          justifyContent: "center",
+          background: "#ffffff",
+          borderRadius: 112,
+        }}
+      >
+        <div
+          style={{
+            width: 330,
+            height: 330,
+            display: "flex",
+            alignItems: "center",
+            justifyContent: "center",
+            borderRadius: "50%",
+            background: "#0b6cff",
+            color: "#ffffff",
+            fontSize: 210,
+            fontWeight: 800,
+          }}
+        >
+          !
+        </div>
+      </div>
+    ),
+    size,
+  );
+}

```

### app/manifest.ts

```text
diff --git a/app/manifest.ts b/app/manifest.ts
index aad389c..ad14f4f 100644
--- a/app/manifest.ts
+++ b/app/manifest.ts
@@ -12,5 +12,19 @@ export default function manifest(): MetadataRoute.Manifest {
     theme_color: "#ffffff",
     lang: "ja",
     orientation: "portrait",
+    icons: [
+      {
+        src: "/icon",
+        sizes: "512x512",
+        type: "image/png",
+        purpose: "any",
+      },
+      {
+        src: "/icon",
+        sizes: "512x512",
+        type: "image/png",
+        purpose: "maskable",
+      },
+    ],
   };
 }

```

