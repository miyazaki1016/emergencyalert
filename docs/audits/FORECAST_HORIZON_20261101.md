# 予測30分境界と「40分後」表示の静的監査（2026-11-01）

## 実コードで確認した経路
- main `supabase/functions/watch-rain/index.ts` は `severeForecast(rain.forecast ?? [], Date.now())` で強雨予測を選択する。
- `supabase/functions/watch-rain/forecastEpisode.ts` の `severeForecast` は、雨判定・強雨区分・発表時刻/予測有効時刻の有効性・未来時刻を条件に選ぶ。**選択条件に30分以内という上限がない**。
- main workerは選んだ強雨フレームの `validTime` との差を分単位に丸めて `約N分後` と通知本文へ組み込む。
- 一方、旧 `test/watch-rain-notification-regression-20261018` には `isWithinRainNotificationHorizon` の30分以内・35分超過のテストがある。ただし**旧テストが現行の強雨経路に適用されている証拠はない**。

## 判断
**40分後表示を生み得るコード経路がmainにあることを確認**。ただし、個別通知がこの経路から発生したかは通知ID・snapshot・時刻を照合していないため未確定。30分超をすべて不正と断定しない（強雨と通常の接近通知で仕様が異なる可能性）。

## 次の確認
1. 対象通知のイベント種別・強雨区分・発表/有効時刻・保存snapshotをread-onlyで確認。
2. 通常の接近通知と強雨警戒通知の予測地平線を仕様として区別。
3. 採用する上限と、30/35/40分境界テストを仕様確定後に追加。既存の重複通知修正作業と競合させない。

実施範囲: GitHub上のmainと旧テストの読み取り、文書化のみ。本番Push・DB・worker変更なし。
