# 旧通知回帰テストとmainの照合（2026-11-01）

対象: `test/watch-rain-notification-regression-20261018`。main比較時点で ahead 8 / behind 44、変更ファイル3件。

- `lib/weather/rain/watchNotificationDecision.test.ts` は旧branchとmainの双方に存在し、blobが異なる（旧 `d1380eeca1022a3f6b76b3e5f375ecb01b5c7097` / main `4c9b6b40f9f062e4c8d5abf656c9df9350d17898`）。
- `supabase/functions/watch-rain/notificationDecision.ts` も双方に存在し、blobが異なる（旧 `048922ee10ffa623f50a4a5e6fc57a9f8841972b` / main `4509289bb419ef5a7c00a454e014638b696baaf2`）。
- `supabase/functions/watch-rain/index.ts` も比較結果に差分あり。

**判断:** 旧workerをmainに上書きせず、雨終了通知・時刻処理などの旧回帰テスト観点を現在のエピソード管理・重複通知修正と比較する。ファイル差分の存在だけで機能の未実装や修正済みを断定しない。

本記録は読み取り調査のみ。アプリ・DB・Push・デプロイ変更なし。
