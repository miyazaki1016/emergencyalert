# test/jaspic-238-isolated-bulk

**目的：** 未確認

**実装状態：** mainとの差分を収録。差分ゼロも記録

**検証の扱い：** 未確認

**PR状態：** ブランチ差分（PR関連あり）

**main統合：** 未確認

**本番反映：** 未確認

**残課題：** 未確認

**次の作業：** 関連PR・mainとの同等実装を照合。ブランチの存在だけで未完成扱いしない

関連PR：[#239](https://github.com/miyazaki1016/emergencyalert/pull/239)

根拠取得日時 (UTC)：2026-11-13T23:25:18.837219+00:00


## 実際の変更処理（コードから抽出）

差分・ソースを参照

- [app/api/jaspic-isolated-238/health/route.ts](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/app/api/jaspic-isolated-238/health/route.ts)：同一HEADのPR案件に原文収録
- [app/api/jaspic-isolated-238/readiness/route.ts](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/app/api/jaspic-isolated-238/readiness/route.ts)：同一HEADのPR案件に原文収録
- [app/api/jaspic-isolated-238/send/route.ts](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/app/api/jaspic-isolated-238/send/route.ts)：同一HEADのPR案件に原文収録
- [docs/JASPIC_ISOLATED_BULK_TEST_238.md](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/docs/JASPIC_ISOLATED_BULK_TEST_238.md)：同一HEADのPR案件に原文収録
- [docs/JASPIC_ISOLATED_SEND_CONNECTION_238.md](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/docs/JASPIC_ISOLATED_SEND_CONNECTION_238.md)：同一HEADのPR案件に原文収録
- [lib/jaspic/isolated-batch-238.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/lib/jaspic/isolated-batch-238.test.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/isolated-batch-238.ts](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/lib/jaspic/isolated-batch-238.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/isolated-content-238.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/lib/jaspic/isolated-content-238.test.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/isolated-content-238.ts](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/lib/jaspic/isolated-content-238.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/isolated-db-adapter-238.ts](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/lib/jaspic/isolated-db-adapter-238.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/isolated-first-mail-238.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/lib/jaspic/isolated-first-mail-238.test.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/isolated-first-mail-238.ts](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/lib/jaspic/isolated-first-mail-238.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/isolated-gmail-238.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/lib/jaspic/isolated-gmail-238.test.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/isolated-gmail-238.ts](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/lib/jaspic/isolated-gmail-238.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/isolated-mail-resolver-238.ts](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/lib/jaspic/isolated-mail-resolver-238.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/isolated-oauth-refresh-238.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/lib/jaspic/isolated-oauth-refresh-238.test.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/isolated-oauth-refresh-238.ts](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/lib/jaspic/isolated-oauth-refresh-238.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/isolated-preview-238.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/lib/jaspic/isolated-preview-238.test.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/isolated-preview-238.ts](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/lib/jaspic/isolated-preview-238.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/isolated-send-gate-238.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/lib/jaspic/isolated-send-gate-238.test.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/isolated-send-gate-238.ts](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/lib/jaspic/isolated-send-gate-238.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/isolated-vault-access-238.ts](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/lib/jaspic/isolated-vault-access-238.ts)：同一HEADのPR案件に原文収録
- [package.json](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/package.json)：同一HEADのPR案件に原文収録
- [tests/sql/jaspic_isolated_test_238.sql](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/tests/sql/jaspic_isolated_test_238.sql)：同一HEADのPR案件に原文収録
- [tests/sql/jaspic_isolated_test_238_finish.sql](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/tests/sql/jaspic_isolated_test_238_finish.sql)：同一HEADのPR案件に原文収録
- [tests/sql/jaspic_isolated_test_238_import.sql](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/tests/sql/jaspic_isolated_test_238_import.sql)：同一HEADのPR案件に原文収録
- [tests/sql/jaspic_isolated_test_238_sent.sql](https://github.com/miyazaki1016/emergencyalert/blob/18ddee678b6bf1579960bf4fdb17b078bce29387/tests/sql/jaspic_isolated_test_238_sent.sql)：同一HEADのPR案件に原文収録

## 検証実行の事実

| ワークフロー | 結果 | 対象SHA |
| --- | --- | --- |
| 実行証拠未取得 | 未確認 | — |

## 当時の説明・結論（原文。作者の主張と実測を区別）

```text

```

## ソース・テスト・資料の抜粋（実行はしない）

