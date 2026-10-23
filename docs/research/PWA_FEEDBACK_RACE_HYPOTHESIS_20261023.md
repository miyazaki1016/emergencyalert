# 通知履歴復帰時の競合仮説と最小修正案（2026-10-23）

## 静的コード再確認
`app/components/NotificationFeedbackHistory.tsx` の `refresh` は複数回同時に実行されうる。

- マウント時の初回読み込み。
- `visibilitychange` がvisibleになった時。
- `amefuru:auth-ready`。
- Supabase `SIGNED_IN` / `SIGNED_OUT`。
- `ownerId` 更新で `useCallback` が再生成され、effectが再実行。
- 5分間隔のタイマー。

現行処理に、先行リクエストのキャンセルや最新リクエスト判定はない。例えば古い `getSession()` の結果が後から返れば、後発の読み込み結果を古いstateで上書きしうる。ただし**競合の発生自体は実測されていない**。

## 決定的な区別
`<section data-amefuru-feedback-history>` は条件なしで描画される。セッションなし・0件・取得失敗でもセクションを返す設計。したがって、競合があったとしても**セクション全体のDOM消失をこのコードだけで説明できない**。

優先順位:
1. 復帰時に `history-unmount` が出るか。
2. DOMが消えているのに `history-unmount` が出ないか。
3. `error` / `unhandledrejection` の有無。
4. refreshの開始・終了の重なり。
5. `pageshow` / `visibilitychange` と診断記録初期化の関係。

## 最小修正案（未実装・未承認）
- 取得要求ごとに単調増加する世代番号を持ち、最新の結果だけがstateを更新できるようにする。全state更新経路をカバーし、アンマウント時に無効化する。
- `getSupabaseBrowserClient` の多重生成を整理する場合は既存匿名認証の永続化・storage key互換性を事前確認する。
- section自体を条件付き描画に変更しない。セッションなし時にも案内表示を残す。
- 再描画・セッション復元失敗を混同しない。
- ユーザーの匿名ID/登録地点/通知設定は変更しない。

## 実機からの証拠
Safari Previewは手動更新なしで記録9件→5件に戻り、新たな`install`/`history-mount`が記録された。**Safariではセクションは残った**。本番ホーム画面PWAでのセクション消失はまだ計測できていない。

## 本番反映ゲート
原因の裏付け、研究ブランチでの修正、CI、実機確認を終えるまで本番反映しない。PR #76はDraftのまま維持。
