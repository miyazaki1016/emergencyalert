# アメふる 新チャット用引き継ぎ

**次のソラは、この文書を最初に全文読む。返事だけで止まらず、GitHubの現在の実体を照合して作業を再開する。**

更新: 2026-10-21。Repository: `miyazaki1016/emergencyalert`。
**この文書および横断監査資料の保存先ブランチ: `docs/amafuru-source-audit-20261016`。mainには未反映。**

## 最初に読む順番（正確なパス）

すべて上記監査ブランチ上。

1. `docs/AMAFURU_CHAT_HANDOFF_20261021.md` — この入口、現在地、禁止事項。
2. `docs/AMAFURU_CONCEPT.md` — 独立した基本構想・判断理由・決定/検討/実装の区別。
3. `docs/AMAFURU_DEVELOPMENT_OVERVIEW.md` — 横断の実装状況と開発の入口。
4. `docs/AMAFURU_BRANCH_AUDIT_20261021.md` — 全66branch/63PR、証拠、再開キュー。
5. `docs/audit/20261021/branches.json`、`assets.json`、`documents.json`、`prs.json` — 同一ディレクトリ内の固定snapshot。全ファイル所在と未読版を含む。
6. `docs/AMAFURU_SOURCE_AUDIT_20261016.md`、`docs/AMAFURU_HANDOFF_20261018.md` — 過去の調査と設計理由。新しい証拠で訂正された節を優先し、過去の時点を現行と混同しない。
7. `docs/DECISIONS.md`、`docs/PROJECT_OVERVIEW.md`、ルート `PROJECT_OVERVIEW.md` — 既存設計。branchごとの版の違いを保持する。

## 現在地と監査の限界

66branch、63PR（56 merged/1 closed-unmerged/6 open）。基準main `024bb57ac04a7830eeea61183baee4f249a65e4c`。
全HEAD・日時・git diff・merge-base・PR状態・HEAD CI/status・375 path+blob資産・47 Markdown版を棚卸しした。**全版全文読了・全機能意味的精査・本番監査完了ではない。** JSONのinventory-onlyを読了扱いしない。

既存監査branchは旧監査とhandoffのdocs-only差分で再利用可能だった。新たなmain分岐は作成せず、既存記録を残して文書を追加した。成功commitはこのbranchのgit logで確認し、作業中の未pushをGitHub保存済みと扱わない。

## 次に実行すること

1. このbranchとmain、全branch/PRの最新HEADを再取得し、snapshot以降の差分を最初に記録。
2. **#63を最優先でレビュー**。branch `feat/my-rain-notification-history-20261019`、基準HEAD `25f78d40858a51d800df014139545ca92813f4ed`。通知ID先行作成、直リンク、snapshot、回答、shadow実装はある。CI run `39435320536`のverifyとfeedback-rlsはsuccess。実Supabase HTTP RLS/実機/実天候は未検証。
3. 同branchの `docs/MY_RAIN_STAGED_ROLLOUT_GATE_20261020.md`、`docs/MY_RAIN_IPHONE_PREVIEW_CHECK_20261020.md`、`docs/MY_RAIN_ASYMMETRIC_NOTIFICATION_VALIDATION_20261019.md`、`docs/MY_RAIN_ENDING_RADAR_OFFLINE_AUDIT.md` を読む。NO-GOを維持し、既存成果の不足だけを列挙する。画像保存と判定半径選択を実装済みにしない。
4. 通知回帰branch `test/watch-rain-notification-regression-20261018` のHEAD Actions runは今回0件。オフライン検証の開始点として読み、JMA日時/弱雨/同一観測/降雨エピソード/配信と記録失敗を検証。修正は今回監査の次の開発作業として範囲を明示。
5. #59/#62の失敗workflow原因と、全国proof→実route統合の未達を調査。#59の `docs/AMAFURU_HANDOFF_2026-10-13.md`、`docs/NATIONAL_RAIN_READINESS_PROOF.md`、`docs/NATIONAL_FINAL_GATE_PROOF.md` を読む。#62のbaseは#59。全国完成としない。
6. `documents.json` の未読版とSQL/workflow/実装をblobごとに精査し、成果/理由/後継/残作業を追記。旧branchで現行mainと違うだけでは未反映としない。
7. Vercel deploy一覧は403、CLIなし。GitHub status/bot証拠はあるが本番/全Preview対応は未確認。接続の権限が得られた場合にだけ読み取りで補完する。新規deploy・設定変更で解決しない。

## 交代しても守ること

- **必要なときに、そっと教える。降りそうは早く、やみそうは確実に。** 自前気象予測を作らず、UNKNOWNを雨なしへ変えない。
- 思想は継承する。実装は検証する。決定事項と「なぜ」を両方保存する。main merged、CI、Preview、本番稼働、地上天気を別証拠として扱う。
- mainへの反映・マージ、branch削除はユーザーの承認が必要。既存成果を消さない。既存PRへ勝手な書き換えをしない。
- 本番環境、DB、cron、Storage、Edge Function、通知配信を無断で変更しない。テストPushも送らない。美咲は別プロジェクトで今回の操作対象外。
- 「りょ」は合意済みの安全な作業を進める意味。上記本番操作の承認へ拡張しない。
- ブロックされた書込みが後から自動反映するとは扱わない。成功commitとremoteで内容を再読して確認する。失敗の原文が残っていなければ復元不能と明記する。

## 作業の終わり方・中断方法

台帳と総覧を更新し、専用branchにcommit/push、remoteのSHAと対象ファイルを照合する。少なくとも「開始SHA、実施内容と理由、変更path、検証証拠、未確認、阻害点、次の操作」をGitHubへ残す。長い作業は途中でもcheckpointを保存する。チャット内だけに残した約束を完了扱いしない。

次のチャットへ渡す文:

> ソラ、アメふるの開発を引き継いで。miyazaki1016/emergencyalert の docs/amafuru-source-audit-20261016 ブランチにある docs/AMAFURU_CHAT_HANDOFF_20261021.md を最初に全文読んで、最新GitHubと照合し、記載順に進めて。本番・main・DB・通知は無断変更しないでね。
