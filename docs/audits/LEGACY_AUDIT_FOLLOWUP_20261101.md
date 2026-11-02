# 旧ソース監査ブランチ追加照合（2026-11-01）

## 証拠
- 対象 `docs/amafuru-source-audit-20261016`。mainとの比較: diverged、ahead 70 / behind 41（確認時点）。`docs/AMAFURU_SOURCE_AUDIT_20261016.md`、`docs/AMAFURU_AUDIT_CHECKPOINT_20261021.md` 等の資料、旧監査用JSONが独自に存在。
- `docs/AMAFURU_SOURCE_AUDIT_20261016.md` は当時62ブランチ・61PRの存在と一次差分を確認した記録。全ソース読了ではないと明記。旧ブランチのaheadは「未実装」を意味せず、mainと本番の状態は別。
- `docs/AMAFURU_AUDIT_CHECKPOINT_20261021.md` は旧資料の保存・固定snapshotの検証、CIの一部確認を記録。**全47 Markdown版の意味精査、375 path+blobの全ソースレビュー、本番/Preview対応は未完了**と明記。
- これらの件数は2026-10月時点の過去snapshot。2026-11-01の週次棚卸し（112ブランチ等）と混同しない。

## 判断
1. 旧監査ブランチの資料は歴史的証拠として保全し、全体merge・削除はしない。
2. 旧監査で未確認だった機能は、最新main・現在のPR・本番稼働状況に照らして再分類する。古い「未確認」を現在の「未実装」と読まない。
3. 現行の `docs/audits/INVENTORY_RECONCILIATION_20261101.md` の追加証拠として参照する。
4. 本調査はGitHub静的読み取りのみ。アプリ/DB/Push/本番変更なし。
