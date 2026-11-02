# 実データ棚卸しの安全な検証手順（2026-11-01）

## 方針
管理用Draft PRをmainにマージせず、管理ブランチのスクリプトをローカルで読み取り専用実行する。PR上のCIは実データ収集をskipするため、CI成功をE2E成功と取り違えない。

## 実行手順（未実施）
GitHub CLI (gh)、Python 3、対象リポジトリへの読み取り権限が必要。認証情報を文書やPRに貼り付けない。以下の REPOSITORY_NAME は emergencyalert または misaki に置き換える。

```bash
gh auth status
gh repo clone miyazaki1016/REPOSITORY_NAME
cd REPOSITORY_NAME
git switch chore/development-inventory-automation-20261031
git status --short
python3 -m unittest discover -s tests -p 'test_development_inventory.py' -v
GITHUB_REPOSITORY=miyazaki1016/REPOSITORY_NAME \
GITHUB_TOKEN="$(gh auth token)" \
STALE_DAYS=14 \
python3 scripts/development_inventory.py
```

この手順はGitHub APIのGETのみを利用する設計。実行前にスクリプトの内容とアクセス権限を再確認する。出力はローカルの inventory-output/report.json と summary.md。生成物は無断コミット・公開しない。

## 受入基準
1. レポート2ファイルが生成され、エラーなく終了する。
2. branch_countを全ページ取得結果と突合する。2026-11-01時点の参考値はアメふる112、美咲109（main含む）。増減は取得日時を記録して判断。
3. open_pr_count、historical_pr_count、open_issue_countをGitHubのPR/Issue画面と既存台帳で照合。
4. review_candidatesは未完成の証拠ではない。merged/closed PR、main実装、歴史的台帳を優先して判定。
5. 誤検出と機密情報の有無を確認し、必要な集計だけ監査資料へ保存。
6. mainマージと週次schedule開始は別途承認。アプリ・DB・Push・本番は変更しない。

## 現状
両PRのオフラインテスト成功。実データE2Eは未実施。本書は実行結果ではなく安全な実行経路の確定記録。
