# feat: allow deleting watch targets

[PR原本](https://github.com/miyazaki1016/emergencyalert/pull/6)

**目的：** 画面表示や操作に関する変更

**実装状態：** 変更差分を取得。実装の受入完了は未認定

**検証の扱い：** Actionsの成否は実行単位の事実。製品の受入検証とは別

**PR状態：** merged

**main統合：** mainに祖先コミットとして存在（機能受入・本番は別）

**本番反映：** 未確認（main統合／Vercelプレビューから推定しない）

**残課題：** 受入条件・未解決事項をPR本文、レビュー、台帳と照合

**次の作業：** 類似コード・既存結論を確認し、未解決条件だけを次の作業にする

根拠取得日時 (UTC)：2026-11-09T09:02:35.033623+00:00

## 日本語で確認した成果

監視地点を削除できるようにする

日本語見出しは変更目的の案内。受入完了・本番反映の認定ではない。差分・検証・残課題を原本で確認。

- [根拠](https://github.com/miyazaki1016/emergencyalert/pull/6)

## 実際の変更処理（コードから抽出）

Home、check、current、deleteTarget、ensureAnonymousSession、json、label、loadSavedTargets、previewCurrentPlace、q、res、savePlace、searchPlace、serverCheckedAt、session、signedIn、sourceTimeLabel、sourceValidAt、stateLabel、supabase、toggleTarget

- 条件分岐・閾値：`if (!window.confirm(&#96;「${target.label}」を削除する？\nこの場所の見張り登録も消えるよ。&#96;)) return;`（[app/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/a2c4c5970436745d8fef1ce2cefe64b2984e2d3a/app/page.tsx)）
- DB・ストレージ操作の呼出し：`.from(&quot;watch_targets&quot;)`（[app/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/a2c4c5970436745d8fef1ce2cefe64b2984e2d3a/app/page.tsx)）
- DB・ストレージ操作の呼出し：`.delete()`（[app/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/a2c4c5970436745d8fef1ce2cefe64b2984e2d3a/app/page.tsx)）
- 条件分岐・閾値：`if (error) throw error;`（[app/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/a2c4c5970436745d8fef1ce2cefe64b2984e2d3a/app/page.tsx)）
- [app/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/a2c4c5970436745d8fef1ce2cefe64b2984e2d3a/app/page.tsx)：全文

## 検証実行の事実

| ワークフロー | 結果 | 対象SHA |
| --- | --- | --- |
| [CI](https://github.com/miyazaki1016/emergencyalert/actions/runs/35933397307) | success | a2c4c5970436745d8fef1ce2cefe64b2984e2d3a |

## 当時の説明・結論（原文。作者の主張と実測を区別）

```text
Add a per-target delete action with confirmation. Deleting removes the watch_targets row; related watch state is removed by the existing ON DELETE CASCADE foreign key.
```

## ソース・テスト・資料の抜粋（実行はしない）

### app/page.tsx

```text
diff --git a/app/page.tsx b/app/page.tsx
index 4536f3d..39258f3 100644
--- a/app/page.tsx
+++ b/app/page.tsx
@@ -91,6 +91,25 @@ export default function Home() {
     void loadSavedTargets();
   }, []);
 
+  const deleteTarget = async (target: SavedWatchTarget) => {
+    if (!window.confirm(`「${target.label}」を削除する？\nこの場所の見張り登録も消えるよ。`)) return;
+    setTargetsBusy(true);
+    try {
+      const supabase = getSupabaseBrowserClient();
+      const { error } = await supabase
+        .from("watch_targets")
+        .delete()
+        .eq("id", target.id);
+      if (error) throw error;
+      setSavedTargets((targets) => targets.filter((item) => item.id !== target.id));
+      setPlaceStatus(`「${target.label}」を見張る場所から削除したよ。`);
+    } catch {
+      setPlaceStatus("削除できなかったよ。少しあとでもう一度試してね。");
+    } finally {
+      setTargetsBusy(false);
+    }
+  };
+
   const toggleTarget = async (target: SavedWatchTarget) => {
     setTargetsBusy(true);
     try {
@@ -325,6 +344,13 @@ export default function Home() {
               >
                 {target.enabled ? "見張る：ON" : "見張る：OFF"}
               </button>
+              <button
+                onClick={() => void deleteTarget(target)}
+                disabled={targetsBusy}
+                style={{ marginTop: 10, marginLeft: 8, padding: "9px 12px" }}
+              >
+                削除
+              </button>
             </div>
           ))}
         </section>

```

