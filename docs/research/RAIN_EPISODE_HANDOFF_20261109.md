# 雨通知研究の引継ぎとエピソード評価基盤（2026-11-09）

対象main: `99547ab`。研究専用。実天候の再測定、本番変更、DB照会・変更、認証変更、Push送信、Vercelデプロイは行っていない。

## 着手前照合と再利用

依頼全文で `scripts/development_preflight.py` を実行。履歴 `2b3054a89ff8aa8fad465e7d4dce04d39e3b8405`（更新2026-11-09 10:10 UTC）に対し REVIEW_REQUIRED → 原本確認 → 判断JSON付きで REVIEW_RECORDED。履歴収集エラーなし。

| 原本 | 確認・再利用する結論 | 今回繰り返さないこと |
| --- | --- | --- |
| [PR #179](https://github.com/miyazaki1016/emergencyalert/pull/179)、HEAD `e61aad6fd16f22111cf618dc5a6e0a4e20d9fed2` | onsetとactionableは既に別フィールド。20配信分析から28 ACCEPTED（7地点）・301 NO_SUBSCRIPTIONS（9地点）に研究範囲が広がった。28件だけに168枚の未来実況画像がある | 既存28件の再分類・一律前倒し実験 |
| [閾値訂正](https://github.com/miyazaki1016/emergencyalert/blob/e61aad6fd16f22111cf618dc5a6e0a4e20d9fed2/docs/research/ACTIONABLE_THRESHOLD_PARITY_CORRECTION_20261109.md) | 強雨1枚、5_TO_10連続2枚、1_TO_5連続3枚。一般的な「>=1が3枚」とは異なる | 汎用3枚スコアを本番同等と呼ばない |
| [28件の閾値別結果](https://github.com/miyazaki1016/emergencyalert/blob/e61aad6fd16f22111cf618dc5a6e0a4e20d9fed2/docs/research/PRODUCTION_PARITY_28_CASE_RESULTS_20261109.md) | 判定可能8件＝±10分内5・外3、左打切り7・右打切り13。独立した28エピソードではない | 打切り20件を誤報・見逃しとして数えない |
| [onset不一致6件](https://github.com/miyazaki1016/emergencyalert/blob/e61aad6fd16f22111cf618dc5a6e0a4e20d9fed2/docs/research/OFFLINE_ONSET_SIX_DISAGREEMENTS_20261109.md) | snapshotのfirstRainTime基準で13件中一致7・不一致6。Museの13/13とは時刻定義の照合が未完 | どちらかを確定的な改善効果として採用しない |
| [PR #175](https://github.com/miyazaki1016/emergencyalert/pull/175)、HEAD `4c8383f6154fc5136092ae75f49061ace74c35a6` | 当時の引継ぎ値：終了通知26件、±10分50%。実況連続確認と予測エピソード解消は別。終了候補はペア比較し見逃しも測る | 当時の集計を現在の本番精度として再掲しない |

両PRは未マージのDraft。#179のHEADは [CI成功](https://github.com/miyazaki1016/emergencyalert/actions/runs/42568206858)、#175のHEADは [CI失敗](https://github.com/miyazaki1016/emergencyalert/actions/runs/42549707851) をAPIで確認。過去資料の値は再測定していない。#175の失敗原因のログは今回未確認。mainの全テストは今回通過した。

## 現在のコードとの照合

| 確認項目 | mainの挙動・不足 |
| --- | --- |
| onset / actionable | `RainInterpretationEngine.ts` と `toRainSemanticEvent.ts` は firstRainTime→startsAt、firstActionableRainTime→actionableAt を区別。通知対象時刻をずらすだけでは送信タイミング改善を証明できない |
| 全チェックの診断保存 | `watch-rain/index.ts` は雨API成功後、非通知判定の前にも `rain_diagnostic_history` へinsertする。ただし戻り値のerrorは未検査。API失敗・BUSY・例外時のチェックは同じ診断履歴には残らない。全試行の完全保存とは言えない |
| 未通知の入力 | 診断にはforecastDetailsがあるが、`makeSnapshot` と評価行生成はshouldNotify時のみ。DRY/RAIN_AHEAD等の完全な過去状態・判定理由・未来実況が全チェックで揃うわけではない |
| NO_SUBSCRIPTIONS画像 | `20261029023607_replay_area_images.sql` の `claim_rain_image_jobs` は `accepted_count>0` に限定。NO_SUBSCRIPTIONSは対象外。archive-rainの呼出側だけ変えても解消しない。稼働DBの関数定義は今回は未照合 |
| 保存予算 | 同SQLは32MiB容量上限・最大2ジョブ、archive-rainは実行40秒・1行最大6フレーム、画像はexpires_atで削除。対象拡張前に到来ジョブ数、画像/マスク容量、保持期間、滞留を見積もる必要がある |
| delivered=0 | `nextLastNotifiedAt` は既存時刻を保持。一方、購読があり永続送信intent処理を終えた場合、全件失敗でもepisode.approachNotifiedとpeakSevereは更新され得る。購読0件ではそのラッチ更新はない。異なる状態を混同しない。永続重複防止を外す変更はしない |
| UNKNOWN | forecastEpisodeは発表時刻なし、または新しいUNKNOWNでclearForecastsを0にする。**同じ/古い発表時刻のUNKNOWNは早期returnで無視する**。観測側advanceObservationStreakは未知/同時刻で既存streakを保持。すべてのUNKNOWNが同じリセット挙動ではない |
| 終了通知 | 実況clearStreak>=3で終了フラグ解除、予測CLEARの異なる3発表で予測ラッチ解除。終了候補は確認済み降雨・直前event・終了送信済みフラグなどでも制約される。severeの通知キー優先も維持 |

## 今回追加した実装

`lib/research/rainEpisodeEvaluation.ts` は副作用のない研究用集計。既存の閾値判定器や画像パーサーを再実装せず、レビュー済みエピソード・時刻・正解ラベルを入力する。製品のimport経路には接続していない。

- ONSET / ACTIONABLE / ENDINGごと、地点の仮名キー＋エピソードキーごとに1件を分母とする。同じ地点に複数エピソードを持てる。同一エピソードの重複入力は拒否。
- 明示的な非通知チェック（predictedMinute=null）も入力し、予測のTP/FP/FN/TNと、配信のTP/FP/FN/TNを分離。NO_SUBSCRIPTIONSは天候の陰性ではない。UNKNOWN配信は配信分母から除外する。
- 完全な診断・独立した観測が揃わない例、左右打切り、UNKNOWNは除外理由と件数を残す。分母0のprecision/recallはnull。欠損を0%精度に変換しない。
- 最初の候補の予測時刻誤差、最初のACCEPTEDチェックのリード時間、追加ACCEPTEDチェック数を返す。ACCEPTEDはPushサービス受理であり、端末表示や利用者の閲覧確認ではない。
- これは**エピソード内に事象があったか**の集計。時間一致率とは別。入力窓外の予測は拒否するため、窓を切り詰めて予測を捨てず、予測を含む評価窓を事前定義する。左右打切りをABSENTに変換してはならない。

`tests/rainEpisodeStateBaseline.test.ts` は既存helperのUNKNOWN・終了・delivered=0挙動を固定する。全dispatchのDB障害・並行送信をこの追加テストだけで保証するものではない。

## 検証と次の差分

- 新規16テスト成功。既存forecastEpisodeの19テストも合わせ35テスト成功。
- `npm test`：52ファイル345テスト成功。既存rainLabGradeの検出も成功。
- `npx tsc --noEmit --incremental false` 成功、`git diff --check` 成功。Vercelビルド・デプロイは0回。

次は将来の未通知ケースの収集設計。全チェックの保存成功/欠落識別、エピソードID・ラッチ前後・抑制理由、NO_SUBSCRIPTIONS画像対象拡張について容量・保持期間・アクセス制御を含む限定案を作る。新しいDBスキーマや本番ロジックは今回提案コードへ混ぜない。古い画像の欠落は設定変更で復元できない。

自動エピソード推定、時系列holdout、クラスタ信頼区間、実データを使った完全な状態機械の再生、終了ゲート候補の比較は未実施。現データで見逃し率・改善率は確定できない。本番の稼働SHA・DB関数定義・10件保留の最新状態は今回未確認。
