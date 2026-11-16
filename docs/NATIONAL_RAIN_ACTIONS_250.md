# 全国大雨予報とMYアメふるの5分起動

[Issue #250](https://github.com/miyazaki1016/emergencyalert/issues/250) · [着手前照合](https://github.com/miyazaki1016/emergencyalert/actions/runs/43849922596)

## 実装

- 全国走査は毎時00分起点で5分間隔。PR #243の全画素z4探索、z10絞り込み、厳密LRPM、欠落・未知色の失敗扱いを使用。z4の1mm探索は絞り込み専用。z10の気象庁色から30・50・80mm/hを区別し、自治体ごとに最大階級を採用する。6予報フレームのいずれかが欠けた場合は保存しない。
- 新しい完走結果をSupabaseに1件保存する。基準時刻から10分の締切を走査とDBの両方で確認し、同じ枠や古い枠での上書きを防ぐ。欠落枠は取り戻さず、新しい完走枠を保存した上でActionsに失敗として残す。Vercelの既存予報APIは保存済みデータを読み、既存の表示時鮮度・有効時刻フィルターを適用する。隔離環境用のURL／ファイル設定は従来どおり優先される。
- MYアメふるは毎時02分起点で5分間隔。既存のSupabase `watch-rain` をトークン認証で1回呼ぶ。HTTP失敗、対象単位の失敗や競合をActionsに記録する。応答には対象情報が含まれるため、ログへは集計だけ出す。
- ジョブごとに同時実行1本。GitHub Actionsの通常のconcurrencyでは待機枠が最大1本で、新しい実行が待機枠を置き換える。全国は開始時に最新基準枠を選び、MYは作成から4分以上経過した実行と再実行を拒否する。GitHub側で実行記録自体が作られない遅延・欠落も起こり得る。
- MYの二重送信対策は現行の地点ごとのDBリースと、イベント／購読単位の永続的な配信取得を利用する。旧実行元の停止、現行Pushガードを備えたEdge Functionのデプロイ一致、タイムアウト時の照合を稼働前に確認する。

## 根拠

- [Issue #220の適時性判断](https://github.com/miyazaki1016/emergencyalert/issues/220#issuecomment-6891177704)を採用。 [連続4枠の証拠](https://github.com/miyazaki1016/emergencyalert/issues/220#issuecomment-6891450033)は9,969タイルで欠落なし。4枠中1枠は5分超で、全枠10分以内。今回の30mm/h保存経路について、本番相当の長時間走査が残る。
- [PR #243](https://github.com/miyazaki1016/emergencyalert/pull/243) の `4e3ef008` を移植。 [Muse独立QA](https://github.com/miyazaki1016/emergencyalert/issues/220#issuecomment-6887241852)の5,750タイル・2枠と、未収録海上タイルの厳密な除外条件を引き継ぐ。
- [PR #59](https://github.com/miyazaki1016/emergencyalert/pull/59) の47県N03資材と精密照合の研究を再利用。83照合ケース・符号化32MiB LRUの実測はPR #59の分割PoCの条件であり、このランナーのメモリ測定とは区別する。
- [PR #181](https://github.com/miyazaki1016/emergencyalert/pull/181) の全画素・欠損時失敗を維持。 [PR #62](https://github.com/miyazaki1016/emergencyalert/pull/62) のstride=2で88雨域中47雨域の完全見逃し結果を受け、間引きを使わない。

## 稼働前に残る作業

1. Draft PRの最新HEADの通常CIと自動照合を確認する。隔離環境でN03/LRPMの組み合わせ、30mm/h以上を含む複数枠、欠損・遅延と保存、Vercel相当の表示、watch-rainの模擬呼出しを確認する。
2. 承認後、既存の [LRPM成果物](https://github.com/miyazaki1016/emergencyalert/actions/runs/43653446881/artifacts/14136872031) と同一SHA256のアーカイブを非公開の `national-rain-n03/20260101/lrpm-20260101-v1.tar.gz` に上書きなしで配置し、[保存SQL](sql/national-rain-forecast-snapshot.sql)を適用する。11月16日の読み取りでは47県のN03既存、指定LRPMパス未配置、Push取得関数あり。N03は47件合計約462MB。5分ごとの再転送を避けるため、既に公開検証成果物に含まれたN03とLRPMだけを版固定のActionsキャッシュに保存する。公開リポジトリのキャッシュからこれらの資材が見える前提で運用し、認証情報・署名URL・利用者データはキャッシュに入れない。Vercelの既存URL／ファイル上書き設定が残っていれば切替時に確認する。
3. Actions Secretsに `RAIN_ACTIONS_SUPABASE_URL`、`RAIN_ACTIONS_SUPABASE_SERVICE_ROLE_KEY`、`RAIN_ACTIONS_WATCH_CRON_TOKEN` を設定する。各ジョブの本番有効化は変数 `NATIONAL_HEAVY_RAIN_ACTIONS_ENABLED=true` と `MY_RAIN_WATCH_ACTIONS_ENABLED=true` で行う。設定時に旧スケジューラの稼働状態を確認する。両変数は承認まで設定しない。
4. 稼働後の確認は下記のActions履歴と実際の新着枠・保存時刻・監視結果を使う。15分以上成功がない場合はActionsの遅延、失敗、無効化と直近基準時刻を点検する。公開リポジトリの無活動60日による停止も確認項目に含める。停止時は対象の有効化変数を解除する。

```sh
gh run list --repo miyazaki1016/emergencyalert --workflow national-heavy-rain-schedule.yml --event schedule --limit 12
gh run list --repo miyazaki1016/emergencyalert --workflow my-rain-watch-schedule.yml --event schedule --limit 12
```
