# feat: add PWA foundation for iPhone and Android

[PR原本](https://github.com/miyazaki1016/emergencyalert/pull/2)

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

iPhone・Android向けPWAの基盤を追加

日本語見出しは変更目的の案内。受入完了・本番反映の認定ではない。差分・検証・残課題を原本で確認。

- [根拠](https://github.com/miyazaki1016/emergencyalert/pull/2)

## 実際の変更処理（コードから抽出）

CACHE_NAME、PwaRegister、RootLayout、manifest、metadata、register、viewport

- 関数・クラス定義：`export default function manifest(): MetadataRoute.Manifest {`（[app/manifest.ts](https://github.com/miyazaki1016/emergencyalert/blob/3618081f7307ad4690021a345e72411bb41c9cbc/app/manifest.ts)）
- 関数・クラス定義：`export function PwaRegister() {`（[app/pwa-register.tsx](https://github.com/miyazaki1016/emergencyalert/blob/3618081f7307ad4690021a345e72411bb41c9cbc/app/pwa-register.tsx)）
- 条件分岐・閾値：`if (!(&quot;serviceWorker&quot; in navigator)) return;`（[app/pwa-register.tsx](https://github.com/miyazaki1016/emergencyalert/blob/3618081f7307ad4690021a345e72411bb41c9cbc/app/pwa-register.tsx)）
- 条件分岐・閾値：`if (document.readyState === &quot;complete&quot;) {`（[app/pwa-register.tsx](https://github.com/miyazaki1016/emergencyalert/blob/3618081f7307ad4690021a345e72411bb41c9cbc/app/pwa-register.tsx)）
- 条件分岐・閾値：`const CACHE_NAME = &quot;emergencyalert-shell-v1&quot;;`（[public/sw.js](https://github.com/miyazaki1016/emergencyalert/blob/3618081f7307ad4690021a345e72411bb41c9cbc/public/sw.js)）
- DB・ストレージ操作の呼出し：`.map((key) =&gt; caches.delete(key)),`（[public/sw.js](https://github.com/miyazaki1016/emergencyalert/blob/3618081f7307ad4690021a345e72411bb41c9cbc/public/sw.js)）
- 条件分岐・閾値：`if (event.request.method !== &quot;GET&quot;) return;`（[public/sw.js](https://github.com/miyazaki1016/emergencyalert/blob/3618081f7307ad4690021a345e72411bb41c9cbc/public/sw.js)）
- HTTP要求：`fetch(event.request).catch(() =&gt; caches.match(event.request)),`（[public/sw.js](https://github.com/miyazaki1016/emergencyalert/blob/3618081f7307ad4690021a345e72411bb41c9cbc/public/sw.js)）
- [app/layout.tsx](https://github.com/miyazaki1016/emergencyalert/blob/3618081f7307ad4690021a345e72411bb41c9cbc/app/layout.tsx)：全文
- [app/manifest.ts](https://github.com/miyazaki1016/emergencyalert/blob/3618081f7307ad4690021a345e72411bb41c9cbc/app/manifest.ts)：全文
- [app/pwa-register.tsx](https://github.com/miyazaki1016/emergencyalert/blob/3618081f7307ad4690021a345e72411bb41c9cbc/app/pwa-register.tsx)：全文
- [public/sw.js](https://github.com/miyazaki1016/emergencyalert/blob/3618081f7307ad4690021a345e72411bb41c9cbc/public/sw.js)：全文

## 検証実行の事実

| ワークフロー | 結果 | 対象SHA |
| --- | --- | --- |
| [CI](https://github.com/miyazaki1016/emergencyalert/actions/runs/35893019027) | success | 3618081f7307ad4690021a345e72411bb41c9cbc |

## 当時の説明・結論（原文。作者の主張と実測を区別）

```text
WebアプリをiPhone/Androidのホーム画面からstandalone起動できるPWA基盤を追加します。

- Web App Manifest
- minimal Service Worker
- Service Worker registration
- iOS appleWebApp metadata

Push通知そのものは次段階で実装します。
```

## ソース・テスト・資料の抜粋（実行はしない）

### app/layout.tsx

```text
diff --git a/app/layout.tsx b/app/layout.tsx
index 6645c6a..dd832d3 100644
--- a/app/layout.tsx
+++ b/app/layout.tsx
@@ -1,14 +1,29 @@
+import type { Metadata, Viewport } from "next";
 import type { ReactNode } from "react";
+import { PwaRegister } from "./pwa-register";
 
-export const metadata = {
+export const metadata: Metadata = {
   title: "アメくる？ | EmergencyAlert",
   description: "少し先の変化を、今どう動けばいいか分かる形で。",
+  applicationName: "EmergencyAlert",
+  appleWebApp: {
+    capable: true,
+    title: "EmergencyAlert",
+    statusBarStyle: "default",
+  },
+};
+
+export const viewport: Viewport = {
+  themeColor: "#ffffff",
 };
 
 export default function RootLayout({ children }: { children: ReactNode }) {
   return (
     <html lang="ja">
-      <body style={{ margin: 0 }}>{children}</body>
+      <body style={{ margin: 0 }}>
+        <PwaRegister />
+        {children}
+      </body>
     </html>
   );
 }

```

### app/manifest.ts

```text
diff --git a/app/manifest.ts b/app/manifest.ts
new file mode 100644
index 0000000..aad389c
--- /dev/null
+++ b/app/manifest.ts
@@ -0,0 +1,16 @@
+import type { MetadataRoute } from "next";
+
+export default function manifest(): MetadataRoute.Manifest {
+  return {
+    name: "EmergencyAlert",
+    short_name: "EmergencyAlert",
+    description: "暮らしを、少し先回りする。",
+    start_url: "/",
+    scope: "/",
+    display: "standalone",
+    background_color: "#ffffff",
+    theme_color: "#ffffff",
+    lang: "ja",
+    orientation: "portrait",
+  };
+}

```

### app/pwa-register.tsx

```text
diff --git a/app/pwa-register.tsx b/app/pwa-register.tsx
new file mode 100644
index 0000000..ff1a473
--- /dev/null
+++ b/app/pwa-register.tsx
@@ -0,0 +1,25 @@
+"use client";
+
+import { useEffect } from "react";
+
+export function PwaRegister() {
+  useEffect(() => {
+    if (!("serviceWorker" in navigator)) return;
+
+    const register = () => {
+      navigator.serviceWorker.register("/sw.js").catch((error) => {
+        console.error("Service worker registration failed", error);
+      });
+    };
+
+    if (document.readyState === "complete") {
+      register();
+      return;
+    }
+
+    window.addEventListener("load", register, { once: true });
+    return () => window.removeEventListener("load", register);
+  }, []);
+
+  return null;
+}

```

### public/sw.js

```text
diff --git a/public/sw.js b/public/sw.js
new file mode 100644
index 0000000..3fbd609
--- /dev/null
+++ b/public/sw.js
@@ -0,0 +1,28 @@
+const CACHE_NAME = "emergencyalert-shell-v1";
+
+self.addEventListener("install", () => {
+  self.skipWaiting();
+});
+
+self.addEventListener("activate", (event) => {
+  event.waitUntil(
+    caches
+      .keys()
+      .then((keys) =>
+        Promise.all(
+          keys
+            .filter((key) => key !== CACHE_NAME)
+            .map((key) => caches.delete(key)),
+        ),
+      )
+      .then(() => self.clients.claim()),
+  );
+});
+
+self.addEventListener("fetch", (event) => {
+  if (event.request.method !== "GET") return;
+
+  event.respondWith(
+    fetch(event.request).catch(() => caches.match(event.request)),
+  );
+});

```

