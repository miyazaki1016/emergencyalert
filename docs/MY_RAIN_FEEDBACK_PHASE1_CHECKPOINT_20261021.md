# MYアメふる通知フィードバック 第1段階 チェックポイント（2026-10-21）

## ユーザー方針
機能を先に完成。既存本番の通知配信を変えずに、すでに届いた通知に対して「実際はどうだった？」と回答し、保存・変更・再表示できるようにする。通知送信・DB異常対応やクラッシュ/競合対策は **Issue #64** に保存して後日回収。PR #63は第二段階と詳細判定根拠の開発用として維持。

## 第一段階の実装（本番には未反映）
- Draft PR #65 (`feat/rain-feedback-phase1-history-20261021`): 現行`main`から独立。
- `app/components/NotificationFeedbackHistory.tsx`: 最近7日・200件の配信成功履歴、降り始め/止み始め別4択、保存済み、変更、未回答絞り込み。
- `app/page.tsx`: 現行の「今日の最新アラート」からその通知の回答カードへ移動するリンク。**Push payloadは変更しない。**
- `lib/weather/rain/feedbackPhase1.ts` と `tests/feedbackPhase1.test.ts`: URLハッシュの数字ID、否定回答のタイミングのテスト。
- `docs/sql/my-rain-feedback-phase1.sql`: 回答テーブルとユーザー本人だけに読み書きさせるRLS。追加対象は回答テーブルのみで、既存の配信テーブルCHECKやPush workerは変更しない。
- `tests/sql/feedback-phase1-integration.sql` を使い捨てPostgreSQLでCI実行。A/B本人権限、回答作成・変更、他人の通知、サポート外通知への回答拒否を検証。

## 使う側の注意と設計
- 本番に既存の「予測対象時刻」の履歴保存はないため、「降らなかった」「止まなかった」は送信1時間後から回答可能とする**暫定運用**。これを予測的中率の確定測定と混同しない。
- 別地点を現地確認していない場合は「わからない」。現在地と登録地点を混同しない。
- URLハッシュは一覧のスクロールのためだけ。DB読み書き権限は Supabase Auth とRLSで検証する。
- 古い通知をPushタップから直接開く機能は**第二段階**。第一段階は画面内の「今日の最新アラート」から回答へジャンプ。

## 残る本番導入ゲート（現在 NO-GO）
1. GitHub Actionsで最新コミットの `verify` + `phase1-feedback-rls` が成功。
2. 隔離したSupabase Auth + RESTでログイン済みA/Bユーザーに対するRLSと保存・変更・再表示を確認。
3. iPhone Safari/PWAでカード表示、アンカー、保存状態、読み込みエラー、ログインなしを実機確認。
4. 検証後に初めて、対象本番DBのスキーマ再確認、バックアップと復旧手順、**本番DB変更の別途明示承認**、画面公開の別途承認を確認。

## 環境照合
2026-10-21現在、利用可能なSupabaseプロジェクト一覧では、`EmergencyAlert` 本番と**別製品** `misaki` の2つのみ。隔離されたアメふる検証用プロジェクトは確認できていない。美咲にSQL適用しない。本番に試験データを流し込まない。検証環境がなければ実API試験未完と明記する。

## 追補 2026-10-21：本番画面に近い操作動線の改善

- 「今日の最新アラート」の該当行から `#rain-feedback-<id>` で回答カードを開き、強調・スクロール表示。**本番Push payloadは未変更**。
- 同じ画面で見張る場所を登録した際、匿名Authセッション新規発行直後にフィードバック履歴を再読み込みするカスタム通知 `amefuru:auth-ready` を追加。
- Supabaseの認証イベントからも同期コールバック内で直接async APIを実行せず、次のイベントループに処理を回して再取得。Supabase設定がない検証用プレビューではAuth listenerを設置せず、画面自体のクラッシュを防止。
- 回答済みの再確認や通信復帰のため、利用者が押せる「通知履歴を更新」ボタンを追加。
- GitHub CIで `7ba0770d` が一度失敗（ブラウザtimer IDをNodeJS.Timeout扱いした型エラー）。`2a27b3d5` で型を修正して CI success。今回のAuth変更後のHEADでも継続検証。
- 隔離Supabase Auth/API、iPhone PWA実機は引き続き未検証。本番SQL・main・Edge・cron・Pushは未変更。Issue #64は保留のまま。

## 追補：見張り地点と回答対象を混同しないUI（2026-10-21）

- 通知の `target_id` に対応する `watch_targets.id,label` を本人のSupabaseセッションで取得し、通知カードに **「📍 見張っていた場所」** を明示する。取得できなければ地名を推測せず **「登録地点（名称を確認できないよ）」** と表示する。現在地を通知対象として流用しない。
- 複数の見張り地点があるとき、**場所別フィルター**を表示。回答できる件数・未回答件数も選択中の見張り地点について計算する。「今日の最新アラート」からのリンクを開くとフィルターを全件へ戻し、正しい通知が隠れないようにした。
- `lib/weather/rain/feedbackPhase1.ts` の純粋関数と `tests/feedbackPhase1.test.ts` で、地点IDに基づく表示と絞り込み、削除済み地点、別地点へ紛れ込まないことを自動テスト。
- 現時点はPR #65内のステージング向けコード。Push/Edge/main/本番DB未変更。API接続とiPhone実機の確認は未完了、公開NO-GOを維持。

## 追補：回答の保存→再読込→変更の実装と模擬テスト（2026-10-21）

- `lib/weather/rain/feedbackPhase1Repository.ts` に通知回答の保存 `savePhase1Feedback` と再読込 `loadPhase1Feedback` を切り出した。UI `app/components/NotificationFeedbackHistory.tsx` は両方を利用する。
- 保存時はSupabase Authの現在セッションからowner_idを取得し、通知IDを正の安全整数に限定。RLSが本人以外の読書きを拒否する前提を保つ。実際の所有者や送達確認はサーバーRLSの責務。
- 再読込では表示中の配信通知IDだけを指定し、想定外のID/回答値は表示に採用しない。
- `tests/feedbackPhase1Repository.test.ts` に**インメモリの模擬Supabase**による回答作成→再読込→回答変更→再読込、未ログイン時の保存拒否、ID不正、別ユーザーの模擬的な分離を追加した。**模擬テストの成功は実際のSupabase Auth/REST HTTPやiPhone実機の成功証明ではない**。
- 実装・検証が進んでも、本番DBのフィードバックテーブル新設/PRのマージ/本番公開は別の明示承認まで行わない。Issue #64の障害復旧深掘りは再開しない。

## 追補：使い捨てPostgreSQL＋PostgREST の実HTTP試験成功（2026-10-21）

- `tests/sql/feedback-phase1-http-setup.sql`: 本番と無関係なPostgres 16に、配信通知（A/B所有者）・本人限定閲覧RLS・第1段階の回答スキーマを準備する。
- `tests/feedback-phase1-http.mjs`: テスト内で署名した**使い捨てJWT**をHTTPのBearerトークンにして、PostgRESTからA/Bの通知履歴を取得し、回答の新規POST→GET再取得→同じ通知のupsert変更→GET再取得、他人の通知・未対応イベント・不正回答・未認証での保存拒否および他人の回答が見えないことを検証する。
- `.github/workflows/ci.yml` の `phase1-feedback-http` jobで実行。PostgREST `v12.2.3`＋PostgreSQL `16`を**CIの一時コンテナのみ**で起動し、終了時に廃棄。Supabase本番にも美咲にも接続しない。
- 最初のHTTP検証時に、模擬 `auth.uid()` がレガシーな `request.jwt.claim.sub` からの取得になっており、実PostgREST v12のJWT claims JSONと不整合を検出。使い捨てDB fixtureで `request.jwt.claims::jsonb ->> 'sub'` を読むよう修正。**製品本番のSQLは変更しない**。
- コミット **`cdbec051`** の GitHub Actions run **`39570989341`** は **`verify`、`phase1-feedback-rls`、`phase1-feedback-http` 全て success**。今回の成果は模擬Supabaseだけでなく、**本物のPostgREST HTTP要求と実Postgres/RLSでの保存・更新・再読込を検証**できた点。
- **注意：これはSupabaseマネージドのAuth/REST接続ではない**。本番とは別のSupabaseプロジェクト/開発ブランチの準備と iPhone実機 PWA 操作検証は引き続き未実施。CI緑 ≠ 本番公開可能。本番DB変更、Edge/Push変更、mainのマージは許可されていない。

## 追補：回答済み通知の見直し（2026-10-21）

- 第1段階のフィードバック履歴に「**すべて／未回答だけ／回答済みだけ**」を追加。対象地点ごとの **回答できる件数・回答済み件数・未回答件数** も表示。
- `lib/weather/rain/feedbackPhase1.ts` に表示件数とフィルター選択を純粋関数化し、`tests/feedbackPhase1.test.ts` で未対応の通知種別の除外、絞り込み、通知リンクで指定した回答済み通知を隠さないことを検証。
- Freeプランで3つ目のSupabaseプロジェクトは作成しない。既存の使い捨てPostgres/PostgREST HTTP試験を維持する。**SupabaseマネージドAuth/RESTおよびiPhone実機の検証は未実施のまま**。
- PR #65はDraft/NO-GO、main/本番DB/Edge/既存Push配信には一切変更なし。運用保留はIssue #64。
