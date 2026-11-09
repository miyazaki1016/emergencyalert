# feat: make watch ON/OFF state visually clear

[PR原本](https://github.com/miyazaki1016/emergencyalert/pull/9)

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

監視のON・OFFを見分けやすくする

日本語見出しは変更目的の案内。受入完了・本番反映の認定ではない。差分・検証・残課題を原本で確認。

- [根拠](https://github.com/miyazaki1016/emergencyalert/pull/9)

## 実際の変更処理（コードから抽出）

Home、check、current、deleteTarget、ensureAnonymousSession、json、label、loadSavedTargets、previewCurrentPlace、q、res、savePlace、searchPlace、serverCheckedAt、session、signedIn、sourceTimeLabel、sourceValidAt、stateLabel、supabase、toggleTarget

- [app/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/1b5649b6d7a57d501b2d4f57f600f6ab45d69c27/app/page.tsx)：全文

## 検証実行の事実

| ワークフロー | 結果 | 対象SHA |
| --- | --- | --- |
| [CI](https://github.com/miyazaki1016/emergencyalert/actions/runs/35954460716) | success | 1b5649b6d7a57d501b2d4f57f600f6ab45d69c27 |

## 当時の説明・結論（原文。作者の主張と実測を区別）

```text
Use a yellow-green pill for enabled watch targets and a neutral gray pill for disabled targets, while keeping the existing ON/OFF text.
```

## ソース・テスト・資料の抜粋（実行はしない）

### app/page.tsx

```text
diff --git a/app/page.tsx b/app/page.tsx
index 39258f3..74ac288 100644
--- a/app/page.tsx
+++ b/app/page.tsx
@@ -340,7 +340,7 @@ export default function Home() {
                 onClick={() => void toggleTarget(target)}
                 disabled={targetsBusy}
                 aria-pressed={target.enabled}
-                style={{ marginTop: 10, padding: "9px 12px" }}
+                style={{ marginTop: 10, padding: "9px 12px", background: target.enabled ? "#b7f34a" : "#e5e7eb", color: "#111", border: "1px solid #d1d5db", borderRadius: 999, fontWeight: 700 }}
               >
                 {target.enabled ? "見張る：ON" : "見張る：OFF"}
               </button>

```

