# 機能単位の追加照合（2026-11-01）

## 旧履歴Deep Link修正
- `fix/archived-history-deeplink-20261023:app/components/NotificationFeedbackHistory.tsx` とmainの同一パスは**両方存在するがblobは異なる**（branch `3af4f32dffcf4b19e775ba69df94b8076a390b34`、main `3a923411ae288721e17121a3774a7e6f7cbd4a17`）。
- 重要な再確認：**旧ブランチだけでなくmain側にも** `parseFeedbackHash(window.location.hash)` と `historyQuerySince(showArchived || focusedFromUrl !== null, Date.now())` が存在することを確認した。
- **結論：機能欠落と断定できない**。先行調査で「mainは7日制限のまま、旧deep linkに未対応かもしれない」とした懸念は、最新mainで再確認した結果、**少なくとも旧リンク対応の主要ロジックは取り込まれている**ため修正する。差分が別の機能・テスト・表示にあるかは未評価。古い修正ブランチをmergeしない。

## 雨域密度・歯抜け研究
- `research/rain-field-morphology-20261023:docs/research/RAIN_FIELD_MORPHOLOGY_PLAN.md` はbranchに存在（blob `f68319eeddbd1145d7a1698572e3b71c0d8aa4e7`、4908文字）。mainの**同一パスは存在しない**。
- 旧研究資料は透明/未知色/取得失敗を区別し、複数タイル・緯度補正・独立観測との照合を提案。当時の資料は原本PNGによる空間解析や改善率の実測は未実施と明記。
- **結論：研究計画を保全、現行実装と比較**。mainに同一ファイルがないことは面判定機能が未実装である証明ではない。現行の250m/500m/1km占有率や予測/実況判定と照合し、研究計画の再実装を避ける。

## 次工程
- Deep Linkはmainのhelper・テストと旧ブランチの差分を機能単位で比較し、必要なら実機検証。
- 雨域研究は現行実装の面判定・予測フレーム・実況と照合。
- 本記録はGitHub静的読み取りのみ。アプリ・DB・Push・デプロイ変更なし。
