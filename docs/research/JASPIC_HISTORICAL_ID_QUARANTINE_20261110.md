# JASPIC 2026-11-09 18:00 JST 障害調査と未照合IDの隔離案

## 実行結果（本番DB読取）
- 18:00 JSTのSupabase cronは起動（cron job 5、`0 9 * * *` UTC）。
- `jaspic_runs` の当該実行は `FAILED / HISTORICAL_ID_REQUIRES_RECONCILIATION`。広島・滋賀とも送信0件。
- `jaspic_deliveries` は空。誤送信・二重送信の記録はない。
- 手動0件成功と、翌日の本番自動実行成功は別の検証である。

## 再現可能な原因
- 旧 `productionPlan` は未登録のmap IDで事件発生日が `2026-11-06` 以前の場合、無条件で実行全体を失敗させる。
- 事件発生日と公開・更新日時は異なるため、古い発生日だけでは再掲載・未送信・新規公開を区別できない。
- 2026-11-09夜の広島公式JSON読取では、DB未登録のmap IDが23件（不審者4件、犯罪19件）。22件は発生日が11月6日以前。犯罪19件中13件は自転車盗で通知対象外。
- 不審者4件の公開JSONの `updated_at` は11月9日。ただし現在のcollectorはこの項目を保持せず、送信履歴の証明にもならない。
- 未登録IDは当時のDB同系統の最大IDより大きいが、**番号の大小だけで旧送信済みと未送信を証明できない**。
- 旧portalのLINKKEYとmap IDは非可逆。既存の `jaspic_legacy_hiroshima_linkkeys` を直接照合して送信可否を決めてはならない。
- Gmail送信済みメールのID文字列検索では、今回の通知対象候補10件に一致するメールは見つからなかった。ただし、送信経路・検索対象・過去データが完全とは限らず、**未送信の証明には使えない**。

## 滋賀県警の取得先
- Supabase `pg_net` からの直接HTTP取得では `suspicious_person_full.json` と `/data/geo/cities.json` が404。一方、2026-11-10のVercel Sandbox（本番関数と同じ `iad1` リージョン、Node.js `fetch`、読み取り専用）では**両URLともHTTP 200**で、滋賀716件・市区町村19件を取得した。Sandboxと本番Functionの通信経路が完全同一である証明ではないため、本番の取得成功は手動実行で別途確認する。
- これは既存の [JASPIC移植PR #155](https://github.com/miyazaki1016/emergencyalert/pull/155) にも記録された未解決課題。URL推測・認証回避・別ソースへの無検証切替を行わない。
- dispatcherは両県の完全な事前取得が成功するまでDB更新・メール送信をしない設計。**滋賀404はSupabaseの取得元に依存している可能性が高い**が、本番Vercel Functionでの再検証が必要。

## この変更の範囲
- 未照合で発生日が基準日以前の新規map IDは、メール候補にもbaselineにも登録せず `quarantined` に保持する。
- 既存IDの安全な更新と新しい発生日の候補は従来どおり計画可能。
- ソース件数ガードは隔離前の完全な原本件数に対して評価する。
- 実行結果に県別隔離件数を記録する。隔離されたIDは次回以降も再評価するため、永久に既送信扱いにはならない。
- 既存のGmail送信、SENT/UNKNOWN、DBのclaim/finish、cron設定、OAuth、雨通知には変更を加えない。

## 未解決の受入ゲート
1. 滋賀県警の**正規の公開データソース**を確認し、同一ID・同一フィールド・完全性を比較する。復旧するまで本番の全県事前検査は失敗する。
2. 旧Windowsの送信成功台帳と新map IDの照合根拠を確立し、隔離IDの再送/未送判定をレビューする。古い事件の新規公開を見逃さない運用ルールを定義する。
3. Vitest・TypeScript・既存JASPIC互換CIを確認し、DBを変更しない再現テストを追加する。
4. 本番切替前に新規・更新・対象外・再掲・通信失敗・UNKNOWNの受入テストを完了し、手動実行を確認する。

## 既存成果の再利用判断
- [PR #155](https://github.com/miyazaki1016/emergencyalert/pull/155) の旧C#照合・Shiga 404・LINKKEY非可逆の調査を再利用。MIME互換実験を繰り返さず、今回の障害に固有の安全な隔離処理だけを追加。
- 本番DB・OAuth・メール送信・Vercel本番デプロイは**このブランチでは一切変更しない**。

## 2026-11-10 着手前照合の追検証
- Vercel Sandbox内で最新mainの `scripts/development_preflight.py` を依頼文全体・対象3パスで実行。PR #155を原本照合し、再利用判断 `extend` を記録した再実行で `REVIEW_RECORDED`（終了0）。履歴版 `2b3054a89ff8aa8fad465e7d4dce04d39e3b8405`、183 PR・201ブランチ、収集エラー0。
- 同Sandboxの独立試験ではVitest 330件成功、TypeScript `npx tsc --noEmit` 成功（main起点の隔離案。PR #190 headはGitHub Actions CIで別途確認）。
