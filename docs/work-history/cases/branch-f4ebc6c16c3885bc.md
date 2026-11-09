# research/jaspic-oauth-isolation-20261106

**目的：** 未確認

**実装状態：** mainとの差分を収録。差分ゼロも記録

**検証の扱い：** 未確認

**PR状態：** ブランチ差分（PR関連あり）

**main統合：** 未確認

**本番反映：** 未確認

**残課題：** 未確認

**次の作業：** 関連PR・mainとの同等実装を照合。ブランチの存在だけで未完成扱いしない

関連PR：[#168](https://github.com/miyazaki1016/emergencyalert/pull/168)

根拠取得日時 (UTC)：2026-11-09T10:10:15.580056+00:00


## 実際の変更処理（コードから抽出）

差分・ソースを参照

- [app/jaspic/oauth/callback/route.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/app/jaspic/oauth/callback/route.ts)：同一HEADのPR案件に原文収録
- [app/jaspic/oauth/login-client.tsx](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/app/jaspic/oauth/login-client.tsx)：同一HEADのPR案件に原文収録
- [app/jaspic/oauth/result/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/app/jaspic/oauth/result/page.tsx)：同一HEADのPR案件に原文収録
- [app/jaspic/oauth/start/route.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/app/jaspic/oauth/start/route.ts)：同一HEADのPR案件に原文収録
- [docs/research/JASPIC_OAUTH_IDENTITY_ACTIVATION_CHECKLIST_20261106.md](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/docs/research/JASPIC_OAUTH_IDENTITY_ACTIVATION_CHECKLIST_20261106.md)：同一HEADのPR案件に原文収録
- [docs/research/JASPIC_OAUTH_ISOLATION_AUDIT_20261106.md](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/docs/research/JASPIC_OAUTH_ISOLATION_AUDIT_20261106.md)：同一HEADのPR案件に原文収録
- [lib/jaspic/oauth-callback-validation.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/lib/jaspic/oauth-callback-validation.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/oauth-consent-preparation.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/lib/jaspic/oauth-consent-preparation.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/oauth-identity-callback.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/lib/jaspic/oauth-identity-callback.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/oauth-identity-exchange.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/lib/jaspic/oauth-identity-exchange.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/oauth-identity-start.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/lib/jaspic/oauth-identity-start.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/oauth-identity-token-validation.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/lib/jaspic/oauth-identity-token-validation.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/oauth-once-offline.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/lib/jaspic/oauth-once-offline.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/oauth-session-offline.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/lib/jaspic/oauth-session-offline.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/oauth-start-authorization.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/lib/jaspic/oauth-start-authorization.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/oauth-supabase-store.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/lib/jaspic/oauth-supabase-store.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/oauth-callback-validation.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/tests/jaspic/oauth-callback-validation.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/oauth-consent-preparation.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/tests/jaspic/oauth-consent-preparation.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/oauth-identity-callback.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/tests/jaspic/oauth-identity-callback.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/oauth-identity-exchange.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/tests/jaspic/oauth-identity-exchange.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/oauth-identity-start.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/tests/jaspic/oauth-identity-start.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/oauth-identity-token-validation.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/tests/jaspic/oauth-identity-token-validation.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/oauth-isolated-session.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/tests/jaspic/oauth-isolated-session.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/oauth-start-authorization.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/tests/jaspic/oauth-start-authorization.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/oauth-supabase-store.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/17ef79e93311c4c1c557e523566a18f625f62f4a/tests/jaspic/oauth-supabase-store.test.ts)：同一HEADのPR案件に原文収録

## 検証実行の事実

| ワークフロー | 結果 | 対象SHA |
| --- | --- | --- |
| 実行証拠未取得 | 未確認 | — |

## 当時の説明・結論（原文。作者の主張と実測を区別）

```text

```

## ソース・テスト・資料の抜粋（実行はしない）

