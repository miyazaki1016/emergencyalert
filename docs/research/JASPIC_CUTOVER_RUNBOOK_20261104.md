# JASPIC 独立処理：切替・ロールバック手順

本書は準備資料。現在のコードはDry-run専用で送信実装なし。PRマージ、本番DB、Edgeデプロイ、cron設定、旧PC停止、実送信は実施していない。送信開始はユーザーの別途明示承認が必要。

## 1. 承認前に完了させる検証

1. `dotnet run --project tests/jaspic/oracle -- tests/jaspic/fixtures.json tests/jaspic/expected.json` → `git diff --exit-code -- tests/jaspic/expected.json` → `npm test`。C# oracleは旧本文生成式の抽出でSMTPなし。3種は別々に扱う。
2. Node 24で `node --use-env-proxy scripts/jaspic-dry-run.ts hiroshima` と `shiga`。公開情報のGETだけ、DBなし、送信なし。件数・比較データ量・初回候補0・再実行候補0・合成更新候補1を確認。個別事案はログへ出さない。
3. 滋賀の旧URLは2026-11-04確認で404。現行サイトのJavaScriptにも同じ不審者JSONパスがあるが直接取得不可。原因、現行の市町名対応表、ChromeDriver不要の取得経路を確定するまで滋賀baselineを確定しない。非公開API・認証回避へ切り替えない。
4. 旧Windows環境で生成された3種・新規/更新の `.eml` 原本を安全に確保。認証情報・実事案を公開リポジトリへ置かない。SMTPサーバーへ接続しない取得手段を使う。同じ合成入力で新しい送信実装のMIMEをファイル出力し、`node scripts/compare-jaspic-eml.mjs old.eml new.eml` で比較。件名先頭スペース、From/To/Cc、MIME-Version、Content-Type/charset、CTE、ヘッダーfolding、本文バイトは厳格比較。Date/Message-ID等の列挙済み可変輸送ヘッダーのみ比較除外。未知の差を安易に除外しない。
5. **MIME生成は無送信の限定プロファイルを実装済み。SMTP送信は未実装**。旧プロジェクト参照はMimeKit 4.12.0 / MailKit 2.4.1（.NET Framework 4.7.2）。本文一致は輸送MIME一致の証明ではない。MIME比較が通る送信方式を実装・検証してから切替候補にする。
6. 旧広島 `hppmaps.LINKKEY` の除外一覧はSQL Server移行なしでは取得できない。公開baselineに含まれるIDは抑止できるが、baseline外の旧IDが後日再掲された場合まで旧挙動と同一とは証明できない。過去システム固有の除外をどう引き継ぐかを決定するまで完全な送信判定互換を認定しない。犯罪の日時一致＋新IDが旧IDを含む重複類似判定は実装済み。
7. ユーザー方針により既存Gmailパスワードは変更・失効させず継続する。過去の露出リスクは残る。値をコード、CI、資料、例外ログへ記録しない。新システムではSecrets/Vaultからのみ参照する設計とし、今回は登録・認証・接続も行わない。失効/再発行を実施条件として扱わない。

## 2. 承認後の無送信基盤準備（実送信承認とは別）

1. 本番容量・テーブル名衝突・既存雨通知ジョブを読み取りで照合。隔離Postgresで `tests/jaspic/database.sql` と `tests/jaspic/concurrency.py` を実行済みであることを確認する。
2. `docs/sql/jaspic-isolated-draft.sql` をレビューし、正式なCLI migrationへ生成してから、承認された対象に適用する。現ファイルは自動migrationフォルダ外であり、本番へは未適用。
3. 2つのEdgeだけを個別デプロイ。各県の専用job tokenを設定。独自token認証を使う場合、当該2関数に限定してgatewayのJWT検証を無効化する。既存関数の設定は変えない。`JASPIC_HIROSHIMA_DRY_RUN_PERSIST` / `JASPIC_SHIGA_DRY_RUN_PERSIST` は最初false。
4. 認証なし401、send mode400、persist未許可403、source失敗503、個別情報や秘密を含まないログを確認。
5. 公開データの全件性を公式画面と取得件数で照合。初回は全取得成功・全スキーマ・全参照データ・全メール本文検証を通った集合のみbaselineにする。valid JSONでも提供元が一部を省いた可能性を自動的に証明することはできない。
6. DB書込み承認の範囲で、県別persistフラグをtrueにし、`{"mode":"dry-run","persist":true}` を1回実行。初回候補0件。**2026-11-04は旧PC送信済み**なので、既存データを「今日以降の発生日」で新着抽出しない。
7. 再実行0件、旧PCとの複数日比較、差分内容、件数急減ゲート、容量ゲートを検証。Dry-runの差分はDRY_RUNで記録するだけ。実送信キューへ後日転用しない。
8. cronは `docs/sql/jaspic-schedule-draft.sql` のレビュー済み内容から個別作成。テンプレートには誤実行防止の停止文あり。UTC設定を確認して `0 9 * * *`（18:00 JST）。片県を止めても他県は動く。ジョブ成否は `cron.job_run_details` と `net._http_response` のHTTP結果の両方で確認する。

## 3. 保存・排他・容量

- 比較用は種別＋IDごとの最新必要フィールドのみ。座標単独変更では保存も更新せず、次回別項目の更新時の旧座標との差分マーカーを再現する。公開から消えたIDも残して再掲を新規扱いしない。
- 県ごとのrevision/CASでbaselineと更新を原子的に確定する。取得・生成失敗やrevision衝突では保存しない。県単位の行ロックなので互いに停止させない。
- 配信識別子は県＋種別/ID＋内容SHA-256。DRY_RUNはclaim不可。将来のPREPAREDのみ1回claim可能。SENDING期限切れはUNKNOWNへ。SENT/UNKNOWNを自動再送しない。lease tokenが違う完了処理は拒否する。これは重複抑止でありSMTPとDB間の厳密なexactly-once保証ではない。
- 送信待ち本文は未保存。将来の本番sender実装時は更新前レコード・本文・宛先を不変保存してからclaimする仕組みを追加し、観測状態と配信成功状態を分ける必要がある。
- 比較payloadの単回上限16MiB、専用records/deliveries実サイズ合計32MiB超で保存停止。雨テーブルは対象外。広島ライブ比較payloadは約2.63MB（テーブル・索引・TOAST overheadを含まない）。
- DRY_RUN版ハッシュの保持期間は運用時に定める。SENT/UNKNOWNの重複抑止キーと履歴IDの削除はしない。容量不足時にbaselineを削除して再送可能にする対処は禁止。
- 既知ID累積件数に対して公開件数が20%以上落ちた場合は人が調査する保守的ゲート。公開期間の自然な縮小でも止まり得る。自動baseline更新や雨側の領域削除で回避しない。

## 4. 実送信への切替（未実装・未承認）

メール完全互換、滋賀取得、旧除外一覧、秘密管理、送信キュー不変payload、容量、CIの全ゲートが揃った時点で、各県の直近成功時刻・最終旧PC送信・baseline境界・送信開始日時を一覧化してユーザーへ提示する。

ユーザーの実送信開始承認後、県ごとに旧PCの最終実行完了と新baselineを一致させ、旧PCの実行を止めてから新senderを有効にする。同時稼働はしない。Dry-run期間の候補は一括送信せず、切替時点の全取得を新基準として確定する。切替から送信までの間の更新の扱いも記録する。

## 5. ロールバック

1. 県別cronをunschedule、persistフラグをfalseにする。将来のsenderがあればその送信ゲートを先に無効化。雨のcron/関数/テーブルは触らない。
2. SENT/UNKNOWNと取得基準を保持。SENDINGは受理不明としてUNKNOWNへ。結果不明の自動再試行はしない。
3. 旧PCのDBをそのまま再実行すると切替期間の新システム送信分を重複送信し得る。配信ID/内容版と旧PCの最終状態を照合し、抑止できるまで旧PC送信を再開しない。必要な再送はセンターと受領確認した上でユーザー判断。
4. DBはDROPせず保持。Edgeは当該県だけ停止または無送信版に戻す。復旧後も最初はDry-runで差分・基準・未確定配信を照合する。
