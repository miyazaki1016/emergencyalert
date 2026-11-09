# research/jaspic-mail-compat-20261104

**目的：** 未確認

**実装状態：** mainとの差分を収録。差分ゼロも記録

**検証の扱い：** 未確認

**PR状態：** ブランチ差分（PR関連あり）

**main統合：** 未確認

**本番反映：** 未確認

**残課題：** 未確認

**次の作業：** 関連PR・mainとの同等実装を照合。ブランチの存在だけで未完成扱いしない

関連PR：[#155](https://github.com/miyazaki1016/emergencyalert/pull/155)

根拠取得日時 (UTC)：2026-11-09T09:21:44.946311+00:00


## 実際の変更処理（コードから抽出）

差分・ソースを参照

- [.gitattributes](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/.gitattributes)：同一HEADのPR案件に原文収録
- [.github/workflows/jaspic-compat.yml](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/.github/workflows/jaspic-compat.yml)：同一HEADのPR案件に原文収録
- [app/jaspic/oauth/callback/route.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/app/jaspic/oauth/callback/route.ts)：同一HEADのPR案件に原文収録
- [app/jaspic/oauth/login-client.tsx](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/app/jaspic/oauth/login-client.tsx)：同一HEADのPR案件に原文収録
- [app/jaspic/oauth/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/app/jaspic/oauth/page.tsx)：同一HEADのPR案件に原文収録
- [app/jaspic/oauth/result/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/app/jaspic/oauth/result/page.tsx)：同一HEADのPR案件に原文収録
- [app/jaspic/oauth/start/route.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/app/jaspic/oauth/start/route.ts)：同一HEADのPR案件に原文収録
- [docs/DEVELOPMENT_LEDGER.md](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/docs/DEVELOPMENT_LEDGER.md)：同一HEADのPR案件に原文収録
- [docs/PROJECT_OVERVIEW.md](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/docs/PROJECT_OVERVIEW.md)：同一HEADのPR案件に原文収録
- [docs/research/JASPIC_CUTOVER_RUNBOOK_20261104.md](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/docs/research/JASPIC_CUTOVER_RUNBOOK_20261104.md)：同一HEADのPR案件に原文収録
- [docs/research/JASPIC_GMAIL_DELIVERY_DESIGN_20261104.md](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/docs/research/JASPIC_GMAIL_DELIVERY_DESIGN_20261104.md)：同一HEADのPR案件に原文収録
- [docs/research/JASPIC_GMAIL_IPHONE_SETUP_20261105.md](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/docs/research/JASPIC_GMAIL_IPHONE_SETUP_20261105.md)：同一HEADのPR案件に原文収録
- [docs/research/JASPIC_MAIL_COMPATIBILITY_AUDIT_20261104.md](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/docs/research/JASPIC_MAIL_COMPATIBILITY_AUDIT_20261104.md)：同一HEADのPR案件に原文収録
- [docs/research/JASPIC_MIME_VERIFICATION_20261104.md](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/docs/research/JASPIC_MIME_VERIFICATION_20261104.md)：同一HEADのPR案件に原文収録
- [docs/research/JASPIC_OAUTH_DB_APPLIED_20261106.md](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/docs/research/JASPIC_OAUTH_DB_APPLIED_20261106.md)：同一HEADのPR案件に原文収録
- [docs/research/JASPIC_OAUTH_NO_BUILD_STATUS_20261106.md](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/docs/research/JASPIC_OAUTH_NO_BUILD_STATUS_20261106.md)：同一HEADのPR案件に原文収録
- [docs/research/JASPIC_OAUTH_PREDEPLOY_REVIEW_20261105.md](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/docs/research/JASPIC_OAUTH_PREDEPLOY_REVIEW_20261105.md)：同一HEADのPR案件に原文収録
- [docs/research/JASPIC_REAL_DATA_VERIFICATION_20261104.md](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/docs/research/JASPIC_REAL_DATA_VERIFICATION_20261104.md)：同一HEADのPR案件に原文収録
- [docs/research/JASPIC_UPDATE_MAIL_VERIFICATION_20261104.md](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/docs/research/JASPIC_UPDATE_MAIL_VERIFICATION_20261104.md)：同一HEADのPR案件に原文収録
- [docs/sql/jaspic-isolated-draft.sql](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/docs/sql/jaspic-isolated-draft.sql)：同一HEADのPR案件に原文収録
- [docs/sql/jaspic-schedule-draft.sql](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/docs/sql/jaspic-schedule-draft.sql)：同一HEADのPR案件に原文収録
- [lib/jaspic/shigaMail.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/lib/jaspic/shigaMail.ts)：同一HEADのPR案件に原文収録
- [package-lock.json](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/package-lock.json)：同一HEADのPR案件に原文収録
- [scripts/compare-jaspic-eml.mjs](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/scripts/compare-jaspic-eml.mjs)：同一HEADのPR案件に原文収録
- [scripts/jaspic-dry-run.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/scripts/jaspic-dry-run.ts)：同一HEADのPR案件に原文収録
- [scripts/jaspic-generate-eml.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/scripts/jaspic-generate-eml.ts)：同一HEADのPR案件に原文収録
- [scripts/jaspic-source-probe.mjs](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/scripts/jaspic-source-probe.mjs)：同一HEADのPR案件に原文収録
- [scripts/jaspic-source-probe.nodecheck.mjs](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/scripts/jaspic-source-probe.nodecheck.mjs)：同一HEADのPR案件に原文収録
- [scripts/jaspic-update-observation.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/scripts/jaspic-update-observation.ts)：同一HEADのPR案件に原文収録
- [scripts/jaspic-verify-real-mail.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/scripts/jaspic-verify-real-mail.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/collect.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/collect.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/gmail-api-request-offline.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/gmail-api-request-offline.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/gmail-auth-offline.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/gmail-auth-offline.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/gmail-dry-run.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/gmail-dry-run.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/gmail-google-sender-identity-offline.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/gmail-google-sender-identity-offline.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/gmail-oauth-admin-offline.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/gmail-oauth-admin-offline.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/gmail-oauth-once-offline.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/gmail-oauth-once-offline.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/gmail-oauth-supabase-auth.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/gmail-oauth-supabase-auth.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/gmail-oauth-supabase-store.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/gmail-oauth-supabase-store.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/gmail-oauth-token-vault-offline.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/gmail-oauth-token-vault-offline.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/gmail-oauth-vault-store.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/gmail-oauth-vault-store.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/gmail-transport-simulator.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/gmail-transport-simulator.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/gmail-web-callback-offline.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/gmail-web-callback-offline.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/gmail-web-exchange-offline.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/gmail-web-exchange-offline.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/gmail-web-oauth-offline.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/gmail-web-oauth-offline.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/gmail-web-session-offline.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/gmail-web-session-offline.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/gmail-web-start-offline.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/gmail-web-start-offline.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/handler.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/handler.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/mail.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/mail.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/mime.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/mime.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/jaspic/state.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/_shared/jaspic/state.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/jaspic-hiroshima/index.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/jaspic-hiroshima/index.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/jaspic-shiga/index.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/functions/jaspic-shiga/index.ts)：同一HEADのPR案件に原文収録
- [supabase/migrations/20261105074100_jaspic_oauth_once.sql](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/migrations/20261105074100_jaspic_oauth_once.sql)：同一HEADのPR案件に原文収録
- [supabase/migrations/20261105074500_jaspic_gmail_token_vault.sql](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/supabase/migrations/20261105074500_jaspic_gmail_token_vault.sql)：同一HEADのPR案件に原文収録
- [tests/jaspic/.gitignore](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/.gitignore)：同一HEADのPR案件に原文収録
- [tests/jaspic/concurrency.py](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/concurrency.py)：同一HEADのPR案件に原文収録
- [tests/jaspic/database.sql](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/database.sql)：同一HEADのPR案件に原文収録
- [tests/jaspic/eml.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/eml.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/expected.json](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/expected.json)：同一HEADのPR案件に原文収録
- [tests/jaspic/fixtures.json](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/fixtures.json)：同一HEADのPR案件に原文収録
- [tests/jaspic/gmail-api-request-offline.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/gmail-api-request-offline.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/gmail-auth-offline.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/gmail-auth-offline.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/gmail-dry-run.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/gmail-dry-run.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/gmail-google-sender-identity-offline.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/gmail-google-sender-identity-offline.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/gmail-oauth-admin-offline.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/gmail-oauth-admin-offline.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/gmail-oauth-migration.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/gmail-oauth-migration.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/gmail-oauth-once-offline.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/gmail-oauth-once-offline.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/gmail-oauth-supabase-auth.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/gmail-oauth-supabase-auth.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/gmail-oauth-supabase-store.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/gmail-oauth-supabase-store.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/gmail-oauth-token-vault-offline.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/gmail-oauth-token-vault-offline.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/gmail-oauth-vault-store.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/gmail-oauth-vault-store.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/gmail-offline-pipeline.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/gmail-offline-pipeline.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/gmail-transport-simulator.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/gmail-transport-simulator.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/gmail-web-callback-offline.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/gmail-web-callback-offline.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/gmail-web-exchange-offline.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/gmail-web-exchange-offline.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/gmail-web-http-locked.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/gmail-web-http-locked.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/gmail-web-oauth-offline.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/gmail-web-oauth-offline.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/gmail-web-session-offline.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/gmail-web-session-offline.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/gmail-web-start-offline.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/gmail-web-start-offline.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/handler.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/handler.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/legacy-framework/LegacyFramework.csproj](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/legacy-framework/LegacyFramework.csproj)：同一HEADのPR案件に原文収録
- [tests/jaspic/legacy-framework/packages.lock.json](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/legacy-framework/packages.lock.json)：同一HEADのPR案件に原文収録
- [tests/jaspic/legacy/criminal_mail.cs.txt](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/legacy/criminal_mail.cs.txt)：同一HEADのPR案件に原文収録
- [tests/jaspic/legacy/suspicious_person_mail.cs.txt](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/legacy/suspicious_person_mail.cs.txt)：同一HEADのPR案件に原文収録
- [tests/jaspic/legacy/suspicious_person_shiga_mail.cs.txt](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/legacy/suspicious_person_shiga_mail.cs.txt)：同一HEADのPR案件に原文収録
- [tests/jaspic/mail.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mail.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/mime-fixtures.json](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mime-fixtures.json)：同一HEADのPR案件に原文収録
- [tests/jaspic/mime-golden/hiroshima-crime-new-eight-bit.eml](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mime-golden/hiroshima-crime-new-eight-bit.eml)：同一HEADのPR案件に原文収録
- [tests/jaspic/mime-golden/hiroshima-crime-new-seven-bit.eml](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mime-golden/hiroshima-crime-new-seven-bit.eml)：同一HEADのPR案件に原文収録
- [tests/jaspic/mime-golden/hiroshima-crime-new-unprepared.eml](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mime-golden/hiroshima-crime-new-unprepared.eml)：同一HEADのPR案件に原文収録
- [tests/jaspic/mime-golden/hiroshima-crime-update-eight-bit.eml](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mime-golden/hiroshima-crime-update-eight-bit.eml)：同一HEADのPR案件に原文収録
- [tests/jaspic/mime-golden/hiroshima-crime-update-seven-bit.eml](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mime-golden/hiroshima-crime-update-seven-bit.eml)：同一HEADのPR案件に原文収録
- [tests/jaspic/mime-golden/hiroshima-crime-update-unprepared.eml](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mime-golden/hiroshima-crime-update-unprepared.eml)：同一HEADのPR案件に原文収録
- [tests/jaspic/mime-golden/hiroshima-person-new-eight-bit.eml](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mime-golden/hiroshima-person-new-eight-bit.eml)：同一HEADのPR案件に原文収録
- [tests/jaspic/mime-golden/hiroshima-person-new-seven-bit.eml](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mime-golden/hiroshima-person-new-seven-bit.eml)：同一HEADのPR案件に原文収録
- [tests/jaspic/mime-golden/hiroshima-person-new-unprepared.eml](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mime-golden/hiroshima-person-new-unprepared.eml)：同一HEADのPR案件に原文収録
- [tests/jaspic/mime-golden/hiroshima-person-update-eight-bit.eml](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mime-golden/hiroshima-person-update-eight-bit.eml)：同一HEADのPR案件に原文収録
- [tests/jaspic/mime-golden/hiroshima-person-update-seven-bit.eml](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mime-golden/hiroshima-person-update-seven-bit.eml)：同一HEADのPR案件に原文収録
- [tests/jaspic/mime-golden/hiroshima-person-update-unprepared.eml](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mime-golden/hiroshima-person-update-unprepared.eml)：同一HEADのPR案件に原文収録
- [tests/jaspic/mime-golden/shiga-person-new-eight-bit.eml](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mime-golden/shiga-person-new-eight-bit.eml)：同一HEADのPR案件に原文収録
- [tests/jaspic/mime-golden/shiga-person-new-seven-bit.eml](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mime-golden/shiga-person-new-seven-bit.eml)：同一HEADのPR案件に原文収録
- [tests/jaspic/mime-golden/shiga-person-new-unprepared.eml](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mime-golden/shiga-person-new-unprepared.eml)：同一HEADのPR案件に原文収録
- [tests/jaspic/mime-golden/shiga-person-update-eight-bit.eml](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mime-golden/shiga-person-update-eight-bit.eml)：同一HEADのPR案件に原文収録
- [tests/jaspic/mime-golden/shiga-person-update-seven-bit.eml](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mime-golden/shiga-person-update-seven-bit.eml)：同一HEADのPR案件に原文収録
- [tests/jaspic/mime-golden/shiga-person-update-unprepared.eml](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mime-golden/shiga-person-update-unprepared.eml)：同一HEADのPR案件に原文収録
- [tests/jaspic/mime.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/mime.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/oracle/FrameworkJson.cs](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/oracle/FrameworkJson.cs)：同一HEADのPR案件に原文収録
- [tests/jaspic/oracle/LegacyMime.cs](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/oracle/LegacyMime.cs)：同一HEADのPR案件に原文収録
- [tests/jaspic/oracle/Oracle.csproj](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/oracle/Oracle.csproj)：同一HEADのPR案件に原文収録
- [tests/jaspic/oracle/Program.cs](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/oracle/Program.cs)：同一HEADのPR案件に原文収録
- [tests/jaspic/oracle/packages.lock.json](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/oracle/packages.lock.json)：同一HEADのPR案件に原文収録
- [tests/jaspic/real-mail.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/real-mail.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/state.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/state.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/update-observation.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspic/update-observation.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspicShigaMail.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/a83e3f018e60daba771bf832fdfb05d480c58549/tests/jaspicShigaMail.test.ts)：同一HEADのPR案件に原文収録

## 検証実行の事実

| ワークフロー | 結果 | 対象SHA |
| --- | --- | --- |
| 実行証拠未取得 | 未確認 | — |

## 当時の説明・結論（原文。作者の主張と実測を区別）

```text

```

## ソース・テスト・資料の抜粋（実行はしない）

