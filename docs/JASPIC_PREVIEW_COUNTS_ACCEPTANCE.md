# JASPIC 県別候補件数プレビューの受入条件

PR #237 は読み取り専用のプレビューに限定する。既存の認証・データ取得・差分判定を再利用し、メール送信・DB更新・cron・本番送信の上限は変更しない。

## 既存成果との照合

- PR #234: **extend**。候補ID、NEW_ID/UPDATED、発生日の表示を再利用し、県別件数・送信ブロッカーの表示を追加する。https://github.com/miyazaki1016/emergencyalert/pull/234
- PR #226: **extend**。認証済みread-onlyプレビューとsnapshot/collectの経路を再利用し、送信本体の件数制限に依存しない診断計算を追加する。https://github.com/miyazaki1016/emergencyalert/pull/226

## 受入条件

1. 広島が21件以上でも、差分計算が成功すれば件数とDATABASE_PROVINCE_LIMITを返す。滋賀の件数も別に返す。
2. 片方の県が取得失敗した場合、成功した県の件数を残し、countsComplete=false、safeToSend=falseとする。合計値は成功した県だけの部分合計であり、全県合計ではない。
3. 認証失敗時は401。レスポンスはprivate/no-store。送信、DB書込は行わない。
4. 本番公開前に最新コミットのCIと既存成果照合 REVIEW_RECORDED を確認する。PR #236 の大量送信対応は別途検証する。
