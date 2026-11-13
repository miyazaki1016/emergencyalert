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
