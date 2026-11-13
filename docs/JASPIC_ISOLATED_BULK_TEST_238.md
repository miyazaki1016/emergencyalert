# JASPIC 34件隔離送信試験 — Issue #238

## 進捗（2026-11-13）

- 着手前照合: REVIEW_RECORDED / success、[run 43430407462](https://github.com/miyazaki1016/emergencyalert/actions/runs/43430407462)。
- 無料プロジェクト枠2/2で別プロジェクト作成不可。ユーザー承認によりEmergencyAlertの既存DB内の非公開スキーマに切替。
- Supabaseプロジェクト `yqyevipvkdwmhcaxywes` に `jaspic_isolated_test` スキーマと `deliveries` テーブルを専用migrationで作成。
- RLS enabled + FORCE、`anon`/`authenticated`/`service_role` のスキーマUSAGEなし、`service_role` のSELECTなしを実SQLで確認。テスト行0件。
- 本番の `public.jaspic_*` 関数、配送台帳、snapshot、送信先は未変更。Gmail実送信0件。
- **同一DB内のスキーマ隔離であり、独立プロジェクト相当の障害分離ではない。** テストデータ以外の更新は禁止。

## 次の手順・停止条件

1. 既存PR #236の差分計算・300秒ガード、mainのOAuth・Gmail送信テストを再利用する。PR #237で統合済みのread-only previewを退行させない。
2. 34件（広島31・滋賀3）の固定候補と出典を検証し、隔離スキーマにのみ保存する。本番関数 `jaspic_prepare_production` はテストに呼び出さない。
3. 34件を小さなチャンクに分割。各送信前に原子的にclaimし、応答不明や中断はUNKNOWNで停止して自動再送しない。宛先は `kishibojim@gmail.com` だけ。
4. 無送信SQL統合テスト（34件・重複排除・並行claim・中断/再開）と最新HEADのCIが成功してから実送信する。
5. テスト実送信ではmessage ID、件数、経過時間、失敗・不明状態を照合。Gmail API受付は実受信の証明ではない。
6. テスト用の権限を安易に `service_role` や Data APIへ付与しない。資格情報・接続経路が安全に確保できなければ実送信禁止。
7. mainマージ、Vercelデプロイ、本番DBテーブルの更新、本番送信は別途許可が必要。

関連: [Issue #235](https://github.com/miyazaki1016/emergencyalert/issues/235) / [Draft PR #236](https://github.com/miyazaki1016/emergencyalert/pull/236) / [Draft PR #239](https://github.com/miyazaki1016/emergencyalert/pull/239)

## 無送信SQL検証（2026-11-13）

- `jaspic_isolated_test.deliveries` へ **synthetic** 34件を1トランザクション内で登録（広島31件相当・滋賀3件相当）。実際の防犯情報IDは使用していない。
- `unique(prefecture, source_id)` に対する `ON CONFLICT DO NOTHING` の重複登録試行を実施。
- `FOR UPDATE SKIP LOCKED` で先頭10件を `SENDING` に変更し、10件を `UNKNOWN` として保留、残り24件を `PREPARED` として維持する状態遷移を確認。
- トランザクションを `ROLLBACK` し、別SQLで永続行数 **0件** を確認。
- **未検証**: 独立接続間の真の同時claim競合、34件の実候補スナップショット、Gmail message ID、最新HEAD CI、実送信。現時点で本番・テストともメール送信0件。

## 追加実装・SQL確認

- Supabase migration `jaspic_isolated_test_238_claim_batch` 適用成功。
- 非公開スキーマの `claim_batch(integer)` を `SECURITY INVOKER`、`FOR UPDATE SKIP LOCKED`、最大10件制限で実装。`PUBLIC`、`anon`、`authenticated`、`service_role` へのEXECUTE権限なし。
- ロールバック専用トランザクション内で仮34件を登録し、`claim_batch(10)` の後に SENDING=10、PREPARED=24 を確認。
- **独立した2接続を使う同時競合テストは未実施**。実候補34件の取得・保存も未実施。実送信0件。

## 再実行可能なSQLテスト

- `tests/sql/jaspic_isolated_test_238.sql` を追加（HEAD `978ea03557865a4fe5e778806b809e8517a40687`）。
- 34件synthetic、重複登録、最初のclaim10件、UNKNOWN10件を自動再claimせず次の10件へ進む検証をトランザクション内で実施。SQL実行はエラーなし、終了後0件を別照会で確認。
- **注意**: これは単一トランザクションでの検証であり、並行した2セッションの競合検証ではない。実候補の取り込み・メール送信・最新CIは未完了。

## 終了状態の隔離テスト（2026-11-13）

- 非公開スキーマに `finish_claim(id,outcome,gmail_message_id)` をmigration `jaspic_isolated_test_238_finish_claim` で追加。`SECURITY INVOKER`、一般/API権限への実行許可なし。
- `SENDING` から `SENT`/`UNKNOWN`/`FAILED` のみ遷移可能。`SENT` のみGmail message IDを必須とし、それ以外はmessage ID禁止。
- 仮レコードをclaim後 `UNKNOWN` にし、続けて `SENT` へ書き換える試行を実施。最終状態は `UNKNOWN` / message ID nullであり、上書きされないことを確認。トランザクションはROLLBACK。
- **未実施**: 別DB接続による並列競合、Gmailの実送信、34件の実候補取得とCI確認。上記関数はまだアプリから呼び出せない非公開DB管理用の試験関数。

## 2セッション同時claim実測（2026-11-14）

- 非公開スキーマが空であることを確認後、仮データ2件（`synthetic-concurrent-238-A/B`）のみ登録。
- 2つの独立したSupabase SQLツール呼び出しを並列起動し、各々 `BEGIN; SELECT * FROM jaspic_isolated_test.claim_batch(1); SELECT pg_sleep(2); COMMIT;` を実行。両呼び出し成功。
- コミット後、A/B各1件が `SENDING`、同一行の二重claimは観測されなかった。2件とも削除し、隔離テーブル0件を別照会で確認。
- **範囲**: 2件・2呼び出しの同時試験のみ。実際の34件の並行Gmail送信、DB接続IDの検証、負荷時の多重起動は未実施。Gmail実送信0件。

## 固定候補34件の取込ガード（2026-11-14）

- DB migration `jaspic_isolated_test_238_import_snapshot` で非公開 `import_snapshot(jsonb)` を追加。正確に広島31・滋賀3、34キー一意、source ID形式、空の隔離配送台帳のみを許可する。アプリ/APIロールへEXECUTEを許可しない。
- 仮の非実在ID34件を使い、同一トランザクション内で取込34件（31/3）を検証。ROLLBACK後、隔離配送台帳0件を別SQLで確認。
- **未完了**: 実際の34件の候補キーを読取専用previewから取得し、出典・同一性を確かめてから登録する作業。取込関数はメールを送らず、本番の `public` 配送台帳を変更しない。Gmail送信・最新HEAD CIも未完了。

## 実候補の取得経路・権限確認（2026-11-14）

- `app/jaspic/dispatch/preview/route.ts` を確認。既存の読み取り専用POSTは `Authorization: Bearer <JASPIC_DISPATCH_TOKEN>` を要求し、`provinces[].keys` を返す。配信台帳・snapshotへの書込みとGmail送信は行わない。
- Vercel環境変数を **復号せず名前と適用先のみ** 確認。`JASPIC_DISPATCH_TOKEN` はProduction向け機密変数として存在する。トークン値は取得・記録していない。
- **停止理由**: 現在のGitHub/Supabase/Vercel接続から、トークンを秘密のまま読み取り専用POSTへ渡す安全な実行経路をまだ確保できていない。Production tokenを取得してPR・Actionsログ・会話へ転記する方法は採用しない。実候補34キーは未取得で、古い31+3という件数だけを根拠に実送信しない。
- 解消案: 既存認証・権限を保持したサーバー側の一時的な読み取り専用実行環境でpreviewを呼び、取得した結果の件数・県別キー・時点を検証して隔離DBへ渡す。実行経路の権限とログ秘匿をレビューしてから実施する。Productionの送信先、dispatch関数、20件制限は変更しない。
- コミット `35f36279fdb73855c749ab7b8de462c74b0bf7ae` のCI、既存成果照合、PR分類はすべてsuccess（CI run 43450184882）。
