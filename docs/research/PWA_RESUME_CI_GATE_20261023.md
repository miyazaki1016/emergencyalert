# 研究ブランチのビルド検証・CI起動条件（2026-10-23）

## 実際に確認した設定
- `.github/workflows/ci.yml`: `on.push.branches: [main]` と `on.pull_request`。
- `verify` は Node 22、`npm install`、`npm test`、`npm run build` を実行。
- RLS/HTTPテストはGitHub Actions内の使い捨てPostgres/PostgRESTを利用する設計。
- `package.json`: `build = next build`、`test = vitest run`。
- 研究ブランチのGitHub Actions実行一覧を確認したところ0件。**pushだけではこのCIが起動しない**。
- この調査環境からGitHubを直接cloneするネットワーク経路は利用できなかったため、ローカルnpm buildは未実施。

## 安全な選択肢
A. 研究ブランチからmain宛に**Draft PR**を作るとCIは起動するが、Vercel連携によりPreview Deploymentが起きる可能性がある。PR作成前にプレビュー影響の承認を得る。PRはマージしない。
B. 別の隔離ビルド環境にリポジトリを取得し、`npm install && npm test && npm run build`。本番に一切アクセスしないよう環境変数を分離。
C. 静的コードレビューを継続する（ビルド成功の代替にはならない）。

## 留意点
- PWA復帰の再現はiPhone実機と本番のWebKit状態に依存する。CI成功だけで原因特定とは言えない。
- 診断コードは研究用で、現行本番に組み込まれていない。
- 診断ログはwindowメモリにのみ保持し、reloadで消える。将来の検証ではreload判定の別証拠も必要。
- 現時点で本番デプロイ、mainマージ、DB/認証操作は一切しない。

## 次の一手
ユーザーの明示的な許可を得てDraft PRを作成し、CI結果を確認する。Previewを望まない場合は独立したビルド環境の利用を先に整える。
