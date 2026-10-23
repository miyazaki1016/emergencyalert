# PWA復帰診断 Draft PR #76 CI結果（2026-10-23）

対象: `research/pwa-feedback-resume-auth-20261023` / commit `1137bb2eef5318c6d2ff60d04757a6858a846ecb`

PR: https://github.com/miyazaki1016/emergencyalert/pull/76

GitHub Actions: https://github.com/miyazaki1016/emergencyalert/actions/runs/39962311138

**実行結果: completed / success**

- `verify`: success。Node 22、npm install、npm test、npm run buildがすべて成功。
- `phase1-feedback-rls`: success。隔離PostgresでのRLS検証。
- `phase1-feedback-http`: success。隔離Postgres/PostgRESTでのHTTP検証。

**確認できた範囲:** 研究ブランチの既存テストとビルドが通る。これだけではiPhoneホーム画面PWAでの黒フラッシュ／通知履歴枠消失の原因は特定できない。実機復帰の再現・診断ログ採取は未実施。

**安全性:** PRはDraftのまま、mainへのマージなし。本番DB/認証セッション/登録地点の変更なし。Preview Deploymentの有無はこのCI結果からは判断しない。

次の検証候補: Previewの状態確認、匿名認証や通知設定を変えない観察手順、実機でのライフサイクルログ採取手段の設計。
