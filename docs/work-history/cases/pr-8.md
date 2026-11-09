# feat: add web push subscription flow

[PR原本](https://github.com/miyazaki1016/emergencyalert/pull/8)

**目的：** 通知・メール配信とその運用に関する変更／画面表示や操作に関する変更

**実装状態：** 変更差分を取得。実装の受入完了は未認定

**検証の扱い：** Actionsの成否は実行単位の事実。製品の受入検証とは別

**PR状態：** merged

**main統合：** mainに祖先コミットとして存在（機能受入・本番は別）

**本番反映：** 未確認（main統合／Vercelプレビューから推定しない）

**残課題：** 受入条件・未解決事項をPR本文、レビュー、台帳と照合

**次の作業：** 類似コード・既存結論を確認し、未解決条件だけを次の作業にする

根拠取得日時 (UTC)：2026-11-09T09:02:35.033623+00:00

## 日本語で確認した成果

Web Pushの購読登録を追加

日本語見出しは変更目的の案内。受入完了・本番反映の認定ではない。差分・検証・残課題を原本で確認。

- [根拠](https://github.com/miyazaki1016/emergencyalert/pull/8)

## 実際の変更処理（コードから抽出）

CACHE_NAME、Home、base64、check、client、current、deleteTarget、enablePush、ensureAnonymousSession、existing、json、label、loadSavedTargets、options、padding、payload、permission、previewCurrentPlace、q、raw、registration、res、savePlace、searchPlace、serverCheckedAt、session、signedIn、sourceTimeLabel、sourceValidAt、stateLabel、subscription、supabase、targetUrl、title、toggleTarget、urlBase64ToUint8Array、vapidPublicKey、windows

- 関数・クラス定義：`function urlBase64ToUint8Array(value: string): Uint8Array&lt;ArrayBuffer&gt; {`（[app/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/8b845d1d4cd51dec313abf5d27c21ac501a66a9c/app/page.tsx)）
- DB・ストレージ操作の呼出し：`return Uint8Array.from(raw, (char) =&gt; char.charCodeAt(0));`（[app/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/8b845d1d4cd51dec313abf5d27c21ac501a66a9c/app/page.tsx)）
- 条件分岐・閾値：`if (!(&quot;serviceWorker&quot; in navigator) &#124;&#124; !(&quot;PushManager&quot; in window) &#124;&#124; !(&quot;Notification&quot; in window)) {`（[app/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/8b845d1d4cd51dec313abf5d27c21ac501a66a9c/app/page.tsx)）
- 条件分岐・閾値：`if (!vapidPublicKey) {`（[app/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/8b845d1d4cd51dec313abf5d27c21ac501a66a9c/app/page.tsx)）
- 条件分岐・閾値：`if (permission !== &quot;granted&quot;) {`（[app/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/8b845d1d4cd51dec313abf5d27c21ac501a66a9c/app/page.tsx)）
- 条件分岐・閾値：`if (!json.endpoint &#124;&#124; !json.keys?.p256dh &#124;&#124; !json.keys?.auth) throw new Error(&quot;Incomplete push subscription&quot;);`（[app/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/8b845d1d4cd51dec313abf5d27c21ac501a66a9c/app/page.tsx)）
- DB・ストレージ操作の呼出し：`const { error } = await supabase.from(&quot;push_subscriptions&quot;).upsert({`（[app/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/8b845d1d4cd51dec313abf5d27c21ac501a66a9c/app/page.tsx)）
- 条件分岐・閾値：`if (error) throw error;`（[app/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/8b845d1d4cd51dec313abf5d27c21ac501a66a9c/app/page.tsx)）
- 条件分岐・閾値：`if (&quot;focus&quot; in client) {`（[public/sw.js](https://github.com/miyazaki1016/emergencyalert/blob/8b845d1d4cd51dec313abf5d27c21ac501a66a9c/public/sw.js)）
- 条件分岐・閾値：`if (&quot;navigate&quot; in client) await client.navigate(targetUrl);`（[public/sw.js](https://github.com/miyazaki1016/emergencyalert/blob/8b845d1d4cd51dec313abf5d27c21ac501a66a9c/public/sw.js)）
- [app/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/8b845d1d4cd51dec313abf5d27c21ac501a66a9c/app/page.tsx)：先頭18000文字・原本リンク参照
- [public/sw.js](https://github.com/miyazaki1016/emergencyalert/blob/8b845d1d4cd51dec313abf5d27c21ac501a66a9c/public/sw.js)：全文

## 検証実行の事実

| ワークフロー | 結果 | 対象SHA |
| --- | --- | --- |
| [CI](https://github.com/miyazaki1016/emergencyalert/actions/runs/35956054816) | success | 8b845d1d4cd51dec313abf5d27c21ac501a66a9c |

## 当時の説明・結論（原文。作者の主張と実測を区別）

```text
Add user-triggered Web Push permission/subscription UI, persist subscriptions under the authenticated anonymous owner, and display incoming pushes from the PWA service worker. Requires NEXT_PUBLIC_VAPID_PUBLIC_KEY before subscription can be activated.
```

## ソース・テスト・資料の抜粋（実行はしない）

### app/page.tsx

```text
diff --git a/app/page.tsx b/app/page.tsx
index 39258f3..2b19411 100644
--- a/app/page.tsx
+++ b/app/page.tsx
@@ -44,6 +44,13 @@ type RainResponse = {
   note: string;
 };
 
+function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
+  const padding = "=".repeat((4 - value.length % 4) % 4);
+  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
+  const raw = window.atob(base64);
+  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
+}
+
 function stateLabel(state: RainInterpretation["state"]): string {
   switch (state) {
     case "DRY": return "☀️ この先、雨の予報なし";
@@ -70,6 +77,52 @@ export default function Home() {
   const [savingPlaceId, setSavingPlaceId] = useState<string | null>(null);
   const [savedTargets, setSavedTargets] = useState<SavedWatchTarget[]>([]);
   const [targetsBusy, setTargetsBusy] = useState(false);
+  const [pushStatus, setPushStatus] = useState("");
+  const [pushBusy, setPushBusy] = useState(false);
+
+  const enablePush = async () => {
+    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
+      setPushStatus("この端末では通知を使えないよ。");
+      return;
+    }
+    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
+    if (!vapidPublicKey) {
+      setPushStatus("通知の準備中だよ。");
+      return;
+    }
+    setPushBusy(true);
+    try {
+      const permission = await Notification.requestPermission();
+      if (permission !== "granted") {
+        setPushStatus("通知が許可されていないよ。端末の通知設定を確認してね。");
+        return;
+      }
+      const registration = await navigator.serviceWorker.ready;
+      const existing = await registration.pushManager.getSubscription();
+      const subscription = existing ?? await registration.pushManager.subscribe({
+        userVisibleOnly: true,
+        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
+      });
+      const json = subscription.toJSON();
+      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("Incomplete push subscription");
+      const session = await ensureAnonymousSession();
+      const supabase = getSupabaseBrowserClient();
+      const { error } = await supabase.from("push_subscriptions").upsert({
+        owner_id: session.user.id,
+        endpoint: json.endpoint,
+        p256dh: json.keys.p256dh,
+        auth: json.keys.auth,
+        user_agent: navigator.userAgent,
+        updated_at: new Date().toISOString(),
+      }, { onConflict: "owner_id,endpoint" });
+      if (error) throw error;
+      setPushStatus("通知を受け取れるようになったよ。");
+    } catch {
+      setPushStatus("通知の登録ができなかったよ。少しあとでもう一度試してね。");
+    } finally {
+      setPushBusy(false);
+    }
+  };
 
   const loadSavedTargets = async () => {
     try {
@@ -294,6 +347,15 @@ export default function Home() {
         {busy ? "確認中…" : data ? "最新情報に更新" : "この場所の雨を確認"}
       </button>
 
+      <section style={{ marginTop: 40, paddingTop: 28, borderTop: "1px solid #ddd" }}>
+        <h2 style={{ marginBottom: 6 }}>通知</h2>
+        <p style={{ marginTop: 0, color: "#666" }}>見張っている場所で、今ならひと言かける意味がある変化があったときだけ知らせるよ。</p>
+        <button onClick={() => void enablePush()} disabled={pushBusy} style={{ padding: "12px 16px", fontSize: 16 }}>
+          {pushBusy ? "設定中…" : "通知を受け取る"}
+        </button>
+        {pushStatus && <p style={{ color: "#666" }}>{pushStatus}</p>}
+      </section>
+
       <section style={{ marginTop: 40, paddingTop: 28, borderTop: "1px solid #ddd" }}>
         <h2 style={{ marginBottom: 6 }}>見張る場所を登録</h2>
         <p style={{ marginTop: 0, color: "#666" }}>自宅や実家など、雨を見張ってほしい場所を選んでね。</p>

```

### public/sw.js

```text
diff --git a/public/sw.js b/public/sw.js
index 3fbd609..b7b9cdc 100644
--- a/public/sw.js
+++ b/public/sw.js
@@ -26,3 +26,31 @@ self.addEventListener("fetch", (event) => {
     fetch(event.request).catch(() => caches.match(event.request)),
   );
 });
+
+self.addEventListener("push", (event) => {
+  let payload = {};
+  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text() }; }
+  const title = payload.title || "EmergencyAlert";
+  const options = {
+    body: payload.body || "見張っている場所に、知らせたい変化があるよ。",
+    icon: payload.icon || "/icon",
+    badge: payload.badge || "/icon",
+    data: { url: payload.url || "/", ...(payload.data || {}) },
+  };
+  event.waitUntil(self.registration.showNotification(title, options));
+});
+
+self.addEventListener("notificationclick", (event) => {
+  event.notification.close();
+  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;
+  event.waitUntil((async () => {
+    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
+    for (const client of windows) {
+      if ("focus" in client) {
+        if ("navigate" in client) await client.navigate(targetUrl);
+        return client.focus();
+      }
+    }
+    return self.clients.openWindow ? self.clients.openWindow(targetUrl) : undefined;
+  })());
+});

```

