# アメふる 総覧

登録地点で雨が降り始めるタイミングを、少ない通知で正確に伝える。

> [!IMPORTANT]
> **担当ソラはここから [開発台帳](DEVELOPMENT_LEDGER.md) へ。** 案件の状態・担当・次の一手は台帳を更新する。再開前に、該当PR・ブランチ・詳細資料を実際に確認する。

| 知りたいこと | 開く場所 |
| --- | --- |
| 案件の現在地・証拠・次の一手 | [開発台帳](DEVELOPMENT_LEDGER.md) |
| 自分の判断待ち・担当への引き継ぎ | [美咲 × アメふる承認ボード](https://miyazaki1016.github.io/misaki/) |
| PR・ブランチの自動棚卸し | [GitHub Actions](https://github.com/miyazaki1016/emergencyalert/actions) → 最新成功の `development-inventory` |
| 開発・確認・リリースの規約 | [共通運用規約](DEVELOPMENT_MANAGEMENT_STANDARD.md) · [Vercelビルド運用](VERCEL_BUILD_POLICY.md) |
| 過去の判断・未統合研究・詳細な開発史 | [整理前の総覧・全文保存版](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md) · [旧開発台帳・全文保存版](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/DEVELOPMENT_LEDGER.md) |

## 主な領域

雨の判定ラボ、予測通知の重複抑制、独立案件の防犯情報メール。 案件の進捗は[開発台帳](DEVELOPMENT_LEDGER.md)を参照。

[雨の判定ラボ](RAIN_RESEARCH_DASHBOARD_20261029.md) · [予測と実況の照合](NOTIFICATION_REPLAY_PRODUCTION_20261029.md) · [共通の開発管理総覧](https://github.com/miyazaki1016/misaki/blob/main/docs/DEVELOPMENT_MANAGEMENT_OVERVIEW.md)

## 守る運用ルール

- 予測と実況の自動照合を基本にし、現地報告は任意の参考。欠測・判定不能を「降らなかった」にしない。
- 通常通知と30mm/h以上の重要通知は別扱い。通常通知を送信済みでも、大雨の初回通知は別に扱う。
- 雨通知と防犯情報メールは別案件。配信・DB・スケジュールの変更はそれぞれの条件と証拠を確認する。
- 検討・研究がmainにない場合は、ブランチとファイルの所在を台帳に登録する。詳細が別ブランチにある場合は、そのブランチを取得して確認する。
- 自動棚卸しは差分と確認候補を出す。完了・本番反映・実機確認を自動認定しない。
- **Vercelの自動プレビューは停止中。** 画面修正は必要に応じて手動で確認する。mainのアプリ変更は本番ビルド、判定できる資料だけの更新はビルド処理を省略する。省略でも回数枠に数えられる場合がある。詳しくは[運用ルール](VERCEL_BUILD_POLICY.md)。
- 修正は **テスト → 必要なプレビュー → main → 本番READY → 実機確認** を区別して記録する。未確認は未確認のまま残す。

整理日：2026-11-05。全文保存版には旧見出し・相対リンク・履歴をその時点のまま残している。
