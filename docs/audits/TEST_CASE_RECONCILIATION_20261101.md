# 旧通知回帰テストのケース単位照合（2026-11-01）

`test/watch-rain-notification-regression-20261018` とmainの `lib/weather/rain/watchNotificationDecision.test.ts` を読み比べた。

## mainにすでに存在する観点
- 通知済みイベントの重複防止、再送、通知OFF、INFO/UNKNOWN遷移。
- 雨終了通知のヒステリシス。
- 観測時刻の重複やUNKNOWNを連続観測として数えないテスト。
- 10月29日の重複通知原因の再現テスト：3回目の雨なし観測で送信済み状態が解除され、未来の雨予測がactionableでも再通知可能になる挙動を記録している。**再現テストの存在は修正済みの証明ではない。**

## 旧ブランチで確認した追加観点
- 弱い接近通知が抑制された後に雨終了通知のみが発生するケース。
- JMA 14桁時刻の30分・35分境界と不正時刻。
- `isWithinRainNotificationHorizon` の30分以内・超過・期限切れ判定。

これらが現在の別テストに存在するか、現行workerの通知条件に接続されているかは未検証。旧workerの一括取り込みは行わない。コード・DB・Push・デプロイは無変更。
