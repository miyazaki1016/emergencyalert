# 通知のレーダー実況答え合わせ：本番追加 2026-10-29

## 承認と範囲
本会話のユーザー指示「本番実装まで一気にやっていいよ」に基づく段階導入。PR #98全体やPR #63をそのままmergeしない。既存通知条件・配信履歴のdelivered_count>0制約・状態更新規則は維持する。Issue #64のクラッシュ／同時実行時のPush重複問題を解決したとは扱わない。

## 記録と失敗時の動き
- 実際の送信種別がRAIN_APPROACHING / ACTIONABLE_RAIN_APPROACHING / RAIN_ENDINGの新規通知候補だけを対象とする。強雨警告は対象外。
- shouldNotify確定後に不変の位置、通知文、入力観測・予測フレーム、semantic event、直前状態、エンジン版を独立テーブルに記録。保存待ちは1秒で打ち切り、保存失敗時にも既存Pushを続ける。記録失敗は秘密値を含めない警告ログにする。
- expectedFramesは本番APIの正常応答では返らないためnull。実際に受け取った全予測を保存するが、期待フレーム数を推測しない。
- notification_deliveriesのINSERTから返却IDを受け、既存の状態更新後に評価レコードへ関連付ける。履歴INSERT失敗時はWRITE_FAILEDを記録。Push受理件数と履歴保存成功は別項目。
- 記録INSERT失敗やプロセス中断による欠測は残る。UNKNOWNを受理成功・未送信と決めつけず、自動再送を行わない。受理件数が1以上のレコードだけを「実通知」の予測評価集計に含める。
- 購読のendpoint、鍵、認証トークンは評価データに保存しない。

## 実況回収・評価
独立Edge Function evaluate-rainを5分ごとに実行。WATCH_CRON_TOKENによる認証。Push送信機能を持たず、watch-rainを呼ばない。N1一覧に掲載されたbasetime=validtimeの実況だけを取得し、20分以上古い一覧は使用しない。対象時刻未到達、未知色、取得不能は「雨なし」に変換しない。

- 単位：通知イベント × 当時の地点のz10中心画素 × 予測対象時刻。
- 降るよ：直前5分の実況がNO_RAIN、対象時刻がRAINという遷移を評価。単なる「雨が存在」より厳しい開始判定である。
- 止むよ：通知前15分以内の入力実況がRAINであることに加え、候補時刻直前がRAIN、その時刻・5分後・10分後の実況がすべてNO_RAINであること。
- 対象時刻ぴったり、±5分、±10分の3指標を独立保存。欠けた窓はINDETERMINATEで、許容幅の中に一致する完全な遷移があればその許容指標はMATCH。
- 当時の予測対象フレームとbaseTimeも必須。後から得た入力を当時の入力として補填しない。
- 対象-15分〜対象+10分（開始）、+20分（終了）の5分刻み実況を回収。完全に揃うか対象+50分まで再試行（最大24回）。未確定のまま期限を過ぎたものはINDETERMINATE。
- 1回2件、45秒の回収予算、5秒の取得タイムアウト。SQLのSKIP LOCKEDと2分leaseで評価workerの競合を回避。結果更新にはlease_idを照合する。これはPush重複防止とは別の仕組み。

## 保存と権限
rain_notification_evaluationsは90日、rain_evaluation_runsは30日保存。private用途のpublicテーブルでRLS有効、anon/authenticatedには権限を付与せず、service_roleだけが操作する。owner削除で評価データを削除し、地点削除では当時の位置を保持する。snapshot等の当時情報はトリガーで更新を拒否する。

今回保存するのは実入力と実況の中心画素。半径1kmの画像、地上雨量、実端末の表示／閲覧確認、無通知時の見逃し評価、ユーザー向け結果画面は未実装。画像保存は別の工程で入力取得経路と容量を検証して追加する。

出典：気象庁ホームページ https://www.jma.go.jp/bosai/nowc/ 、公開hrpnsタイルを画素分類して作成。利用条件 https://www.jma.go.jp/jma/kishou/info/coment.html を2026-10-29確認。レーダー解析と地点地上雨量は同一視しない。

## 検証と切り戻し
- Vitest：純粋照合器、実worker接続のモック、保存失敗、履歴保存失敗、送信結果不明、PNGデコード、既存パレット・地点画素との一致。
- 使い捨てPostgres互換環境：テーブル、権限、snapshot不変性、排他的claim。CIでもPostgres16で同じSQLを実行。
- 本番反映順：DB追加 → evaluate-rain配備 → cron登録・認証／無通知の疎通 → watch-rain記録追加 → 定時実行とDB照会で確認。
- 切り戻し：評価cronを停止し、watch-rainを保存前のversion31ソースに戻す。評価テーブルは残して解析可能。既存Push制約を変更していないのでDBの破壊的切り戻しは不要。
- 本番反映結果と実際の件数は作業完了時に追記する。自然に発生した通知の成否と、疎通用フィクスチャの結果を混同しない。

## 本番反映・確認結果（2026-10-29 11:27 JST）
- DB：notification_radar_replay と notification_radar_replay_schedule を適用済み。既存delivered_count>0制約の維持を照会で確認。
- Edge：watch-rain version32 / evaluate-rain version1 をACTIVEとして配備。
- cron：watch-rainは従来どおり5分ごと。evaluate-rainは毎時02,07,...57分に実行。11:27の定時評価はOK、failures=0。
- 通知worker：11:25の自然な定時処理がHTTP200、12地点を処理しCHECK_FAILED=0。テスト目的のPush送信や通知条件の緩和はしていない。
- 実況：本番EdgeからN1の37フレームを確認し、20261029022000の実況PNGの中心画素を読み取った。プローブは実通知の評価レコードを作らない。
- 認証／権限：トークンなし呼出しはHTTP401。anon/authenticatedの評価テーブルSELECT権限、anonのclaim実行権限はいずれもfalse。
- CI：PR #99 初期head c537c301 のverify / phase1-feedback-rls / phase1-feedback-httpはすべて成功。ローカル181件も成功。
- セキュリティ診断：追加テーブルには意図的な「RLS有効・クライアント用policyなし」のINFOだけが増加。既存WARNは今回の追加で変更していない。関連説明：https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- 現時点では新規の実通知評価サンプルは0件。実通知→保存→後日の実況→確定評価という自然データの全行程、およびiPhone表示は未確認。これを的中率や精度改善の実証として扱わない。
- コネクタ配備時だけ、function直下index.tsへエントリポイントを平坦化し、../_shared/を./_shared/に置換して同じ共有ソースを同梱する。元ソースはPR #99で追跡。

## main統合と引き継ぎ
- [PR #99](https://github.com/miyazaki1016/emergencyalert/pull/99) はmain統合済み。統合コミット：`b6c216be96ecadcb9f86f2042ee6e786800b30c8`。
- 最終head `626c66338dbb81f8ea1b4ccc1bb7487b89a31cf8` のverify / phase1-feedback-rls / phase1-feedback-httpもすべて成功。初期headの確認だけで完了扱いにはしていない。
- 入口：[main総覧](PROJECT_OVERVIEW.md)、経緯・次工程：[開発台帳](DEVELOPMENT_LEDGER.md)。
- 上記の時刻・サンプル件数は2026-10-29 11:27 JSTの確認記録。再開時には現状を読み取りで再確認し、過去時点の0件を現在件数として扱わない。
