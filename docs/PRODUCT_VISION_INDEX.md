# サービス構想台帳（復元案）
Issue #327 / Draft PR #328。2026-11-28。製品方針の正本は [製品憲章](SAKIKURU_PRODUCT_CHARTER.md)。本台帳は構想の所在と状態を索引化し、開発状態は [開発台帳](DEVELOPMENT_LEDGER.md) を参照する。現行実装の最新確認は未実施。

| ID | 構想 | 方針状態 | 根拠・実装参照 |
|---|---|---|---|
| VISION-001 | LIVE JAPANを親サイトの最終トップにする | 確定 | 製品憲章 §1、[PR #61](https://github.com/miyazaki1016/emergencyalert/pull/61) |
| VISION-002 | MYアメふる：登録地点の雨を見守る | 確定 | 製品憲章 §2-A |
| VISION-003 | 全国30分以内30mm/h以上の予報と公式雨雲動画 | 確定 | 製品憲章 §2-B、[PR #59](https://github.com/miyazaki1016/emergencyalert/pull/59) |
| VISION-004 | 日照・昼夜・季節、これまで・いま・このあと | 構想・試作 | 製品憲章 §1、PR #61。実時系列接続は別途確認 |
| VISION-005 | 地震・津波・気象警報の地域別表示、危険優先 | 長期構想・個別方針あり | [実データ接続計画](https://github.com/miyazaki1016/emergencyalert/blob/19fc21c247b934490dbc6f7c104dfc2cea233eb4/docs/LIVE_JAPAN_REAL_DATA_INTEGRATION_PLAN.md)。観測震度3以上表示、独自EEW配信対象外 |
| VISION-006 | 美咲等への構造化イベント連携 | 設計案 | 製品憲章 §6、[PR #60](https://github.com/miyazaki1016/emergencyalert/pull/60)（原本詳細再確認待ち） |
| VISION-007 | 暑さ指数による生活の見守り | 原点・将来候補 | 旧総覧 M-027、製品憲章 §2-B。現行要求の確定は未確認 |
| VISION-008 | ブラウザAI | 将来候補 | 旧総覧 M-006。詳細未確認 |
| VISION-009 | 土砂災害・洪水・ダム放流・防犯等 | 旧運用実績・将来範囲未確定 | 製品憲章 §2-B。全項目を現行機能としない |
| VISION-010 | 親サービス名称 | 未確定 | 製品憲章のサキくる仮称、今回の依頼のさきどり表記。正式名称はユーザー確認待ち |

| VISION-011 | 地点判定半径を選択 | 再発見・構想 | 旧総覧 M-012、M-009。研究の半径比較と利用者設定は別 |
| VISION-012 | 利用者の移動方向推定 | 再発見・構想 | M-012。M-053の登録地点監視とは別機能、追跡の許可・目的未確定 |
| VISION-013 | 強雨の前後画像・根拠履歴 | 確定要求・詳細要照合 | M-003、M-012、M-023、M-062。全国動画・MY履歴・研究画像を区別 |
| VISION-014 | 浸水リスクの外部情報利用 | 再発見・構想 | M-012。情報源・表示範囲未確定 |
| VISION-015 | 固定気象データ費ゼロ、資金確保後の有料GRIB2検討 | 歴史的方針・現行再確認 | M-033、M-039 |
| VISION-016 | 気象庁パレット変更検出・意味の自動昇格禁止 | 歴史的設計・現行要照合 | M-034、M-037 |
| VISION-017 | 広島・滋賀の不審者メール配信 | ユーザー実装済み申告 | M-001〜002、[#154](https://github.com/miyazaki1016/emergencyalert/issues/154)、[#155](https://github.com/miyazaki1016/emergencyalert/pull/155)。現行証拠未照合 |
| VISION-018 | 自動答え合わせ優先・現地回答任意 | 確定要求 | M-003、M-005、M-063。対象有効時刻と時間ずれを区別 |
| VISION-019 | MY大雨30mm/h初回独立通知 | 確定要求 | M-003、M-062。通常通知済みでも独立、強度上昇で追加しない。全国投稿とは別 |
| VISION-020 | 正式公開前の通知配信安全性検証 | 歴史的必須方針・現行要照合 | M-022、M-024、Issue #64。現行対策の証拠確認待ち |

## 継承ルール案
- IDは永続。未実装・保留・撤回でも削除せず理由、日付、決定者、根拠を追記する。
- 方針状態と実装状態は別。自動棚卸しは実装証拠の候補のみ提供し、構想の確定・撤回を行わない。
- 着手前照合で該当ID、製品憲章との整合、仕様原本を確認する。矛盾・未確定は人の判断を求める。既存preflightへの自動組込みは未実装。
- 原本の移行確認は [移行照合台帳](VISION_MIGRATION_LEDGER.md) に記録。構想IDだけで個別仕様の移行完了としない。

## 最終目的：構想と実装の整合性照合（2026-11-28 ユーザー確認）

構想・思想の継承システムと実装を見比べ、現状を明確にし、方向性が異なる場合に見直せるようにする。既存の開発照合（重複防止）を再利用し、構想照合（方向性の確認）を補完する。

### 整合性照合の設計案
各VISION IDについて、確定要求・根拠・適用時点と、現行mainのコミット・コード・テスト・本番・実機証拠を別々に記録する。判定は「整合」「未実装」「部分実装」「方向性の差異」「根拠不足・判断保留」。未確定構想を必須仕様として扱わない。未実装と逸脱を混同しない。

差異には理由、過去の決定、研究結果、影響、見直し案を付す。実装を修正するか、構想を進化させるかはユーザー判断とし、自動棚卸しやAIが方針を無断変更しない。判定時のSHA・証拠URL・日時を保存し、変更後は再照合する。将来のロードマップと引き継ぎに利用する。

現段階は文書設計のみ。全件照合、自動判定、既存preflightへの組込み、ダッシュボード連携は未実施。コード変更は別途対象範囲と着手前照合を確定する。

### 防犯情報の再発見と現況申告（2026-11-28）
旧総覧の広島・滋賀の防犯情報センター向けメール移行研究（Issue #154、PR #155）について、ユーザーは2026-11-28に「広島、滋賀はもう不審者メール配信で実装済み」と確認した。旧研究段階を現在の未着手と扱わない。VISION-009の関連実装候補として記録し、現行main・関連PR・配信運用の証拠を別途照合する。ユーザー申告と独立した実装・本番検証は区別する。

## 開発台帳との一次照合（2026-11-28）
参照：mainの DEVELOPMENT_LEDGER.md と WORK_HISTORY_INDEX.md。以下は索引上の証拠候補であり、最新コード・CI・本番・実機を独立検証した判定ではない。

| ID | 開発証拠候補・次の確認 |
|---|---|
| 001 / 004 / 005 | #61 open、地図・昼夜・地域・災害優先試作。公式データ接続の現況を確認 |
| 002 | #91、#108 等のMY通知。登録地点監視の現行コードを確認 |
| 003 | #59、#62、#181 の研究・実装履歴。索引の旧未完記述を最新本番状態としない |
| 006 | #60 open、連携契約案。現行APIを確認 |
| 007 / 008 / 010 / 011 / 012 / 014 / 015 / 016 | 今回の索引抽出で直接の現行証拠未確定。未実装と断定しない |
| 009 / 017 | #154/#155、11/26 JASPIC DB保存復旧記録。ユーザー実装済み申告あり。送信候補件数は実送信証拠ではない。独立運用 |
| 013 | #100 merged、半径1km画像独立保存。前後画像・ユーザー表示は別確認 |
| 018 | #98 open、#108 merged、30mm/h自動評価。対象・精度・運用を確認 |
| 019 | #91/#108 merged、単一閾値・エピソード1回。独立通知条件の現行コードを確認 |
| 020 | #64/#63 の原本と後続安全対策を確認 |

20 IDすべてに一次照合の結果または根拠不足を記録。完全整合性判定は0件。索引の古い状態は最新状態の証明ではない。

### 個別PR差分の確認（2026-11-28）
- VISION-006: [#60](https://github.com/miyazaki1016/emergencyalert/pull/60) 差分の共同設計契約案を確認。提供側は公式情報・地域判定・鮮度・欠損・重複識別、利用側は許可地点・会話関連性・表現。人格や記憶を提供側に渡さない。重要災害情報を生成AIが捏造・格下げ・抑止しない。Phase Aは認証付きread-only Pull、降雨観測・短時間予測・UNKNOWN・期限。Phase Bは実装済み公式イベントから拡張。契約案であり現行API未確認。
- VISION-004/005: [#61](https://github.com/miyazaki1016/emergencyalert/pull/61) 差分にEventEnvelope型、安定eventId・revision・地域コード・公式出典。型定義だけでは外部フィード接続の証明にならない。
- VISION-019: [#91](https://github.com/miyazaki1016/emergencyalert/pull/91) 差分に初回30mm/hのみ、強度上昇追加なし、有効な乾燥観測3回で終了の当時仕様。 [#108](https://github.com/miyazaki1016/emergencyalert/pull/108) 差分にSEVERE_RAINの評価スナップショット追加。現行workerの独立条件・本番到達は未確認。
- VISION-017: [#155](https://github.com/miyazaki1016/emergencyalert/pull/155) 差分に独立JASPIC互換CIと旧C#出力比較。無送信互換試験と実配信は別証拠。後続PRと現行運用を確認する。

### 現行mainコードの部分照合（2026-11-28）
- VISION-010: [トップページ](https://github.com/miyazaki1016/emergencyalert/blob/main/app/page.tsx) の現行表示名は「さきどり」、タグライン「暮らしを少し先回りする」。表示名は確認済み、正式名称の決定履歴は別確認。
- VISION-002: [MYアメふる](https://github.com/miyazaki1016/emergencyalert/blob/main/app/my-amefuru/page.tsx) blob 0e072ad20b56e0516a7712a0e0dce0c7adfde5d6。登録地点の追加・削除・見張り切替、通知登録照合、DRY表示「この先、雨の予報なし」、意味ある変化だけ知らせるという原点の文言を確認。UI部分整合、worker・配信・実機は未検証。
- VISION-003: [全国大雨予報](https://github.com/miyazaki1016/emergencyalert/blob/main/app/components/NationalHeavyRainForecast.tsx) blob 7a33c7ddc50b52a7ac2b75173ec9d039e16d7a7a。30分詳細・35〜60分延長、取得範囲限定の閾値未満表示、未取得区別、API・時刻選択・事案導線を確認。UI部分整合、公式フレームの全経路・本番は未検証。
- VISION-001/004/005: mainトップは全国雨地図中心、LiveJapanForecastMapを利用。app/live-japan/page.tsx はmain取得404。#61の試作と現行トップの関係は部分確認に留め、最終構想との差を直ちに不具合扱いしない。
以上はmain参照時点の個別ファイル証拠であり、完全照合は0/20のまま。全体の固定SHA・テスト・本番確認は後続。

### 現行mainの地点判定・公開ゲート（2026-11-28）
VISION-002/006/018/020関連の部分証拠（通知workerとは別）。
- [地点API](https://github.com/miyazaki1016/emergencyalert/blob/main/app/api/rain/route.ts) blob 48c1b39c9d36f73256468c78457faa910da13adc：JMA画像取得、checkedAt/sourceValidAt分離、判定公開不可なら解釈・イベント・文面をnull、取得例外503。生成AIによる気象判断なし。
- [判定エンジン](https://github.com/miyazaki1016/emergencyalert/blob/main/lib/weather/rain/RainInterpretationEngine.ts) blob afbeef8a8fe95e47102770fbb945a374783a173b：UNKNOWN等を不足扱い、観測鮮度-5〜15分、時刻形式・予報時刻順序検査、DRYは期待枚数一致かつ全有効、弱雨1〜5は5分間隔3枚、5〜10は2枚、10以上は単枚候補、30分以内の通知候補。ENDINGはNO_RAIN 3枚を要求。ただしENDINGの5分間隔連続性を明示検査していないため、欠落フレームをまたぐ可能性は入力側契約・テストで要確認。予報のENDINGと観測によるエピソード終了は別。
- [公開ゲート](https://github.com/miyazaki1016/emergencyalert/blob/main/lib/weather/rain/canPublishRainInterpretation.ts) blob be3bcd3bb3f3dc64804f36410c14a3df07356f6b：主張ごとに必要な証拠を検査。後続の無関係な欠損で有効な近未来雨の主張を消さない。原点の不明≠安全と部分整合。
- workerの候補パス2件は取得不可。現行workerの正本位置・通知排他・大雨独立通知・実配信は未確認。上記APIのshouldNotifyを実送信と同一視しない。完全照合0/20維持。

## 継承システムの継続更新（2026-11-28 ユーザー確認）
ユーザー確認：このシステムも今後更新されていくようにする。一度限りの復元・照合で完了としない。
設計案：既存の自動棚卸し・開発履歴・着手前照合を再利用し、PR作成・main統合・日次棚卸しを契機にVISION IDと変更範囲を照合。構想版、対象SHA、証拠、観測時刻、整合状態、差異、次の判断を記録する。未確認は未確認のまま、CIやmain統合を本番・実機の証明としない。変更なしの場合は重複記録・無限再実行を避ける。思想・構想の変更はユーザー承認と変更理由・旧版保存を必要とし、自動棚卸しが正本を上書きしない。継承システム自体の仕様・変更履歴・回帰検証も既存開発台帳で管理する。運用の具体的なトリガー・頻度・差異通知先は設計案であり未承認。自動化コード・ワークフローの変更は別途案件化・着手前照合・CIを経る。現PRは文書のみ。

### 継続照合の運用仕様案 v1
既存 WORK_HISTORY_PREFLIGHT.md の最新原本取得・指紋・HEAD・競合防止・最大3試行・read-only原則を再利用する。既存照合（過去成果の再利用判断）と構想照合（目的・仕様との整合）は別の判定軸とし、片方の成功で他方を合格にしない。
| 契機 | 照合対象 | 出力 |
| --- | --- | --- |
| Issue着手前 | 依頼とVISION ID・承認済み方針 | 関連候補・方向性の差異・未確定事項 |
| PR作成・更新 | 変更パス・対象HEAD・構想版 | 影響ID・根拠・要レビュー |
| main統合後 | 統合SHA・変更範囲・CI | 実装証拠の更新候補 |
| 日次棚卸し | 前回以降の差分・未解決項目・鮮度 | 変化のみ、未確認の再提示 |
記録キー案：VISION ID、構想版、対象repo、対象SHA、証拠URL、観測日時、判定軸（仕様/コード/テスト/本番/実機）、状態、判断理由、担当、次の作業。対象SHAと構想版が変わらない同一結果は重複登録しない。構想版変更時は関連IDを再照合。入力欠損・取得失敗は根拠不足とし、既存証拠を消さない。差異は自動修正せず、承認済み方針との差・研究による改善候補・未確定案を区別する。
初期受入案：同一入力再実行で重複なし、古いHEAD結果で上書きなし、取得失敗で誤合格なし、構想変更時の再照合、未確定案を必須扱いしない、承認なしの正本変更なし、既存棚卸し/着手前照合の回帰なし、外部AI料金・Vercelビルド・本番変更なし。まず読み取り専用の報告モードを検証し、強制ゲート化は別承認。実装案件は別Issueで事前照合を行う。本節は設計案であり自動化実装済みではない。

### 話し合いから生まれる構想の即時保存（ユーザー確認 2026-11-28）
旧総覧の「これ総覧に追記しといてね」という運用を継承し、明示的な追記指示を待たずに担当AIが新しい構想・仕様案・重要な判断を記録することを必須要件とする。Issue/PR化・実装予定の有無を問わない。通常チャット・Muse等の担当間で共通とする。
- 構想台帳の既存VISION IDを検索し、重複なら追記、新規なら安定IDを付与。発案日、発案内容、発案者区分、検討中/決定済み/保留/撤回、理由、関連ID、根拠を記録。ユーザー発言とAI提案を混同しない。
- 検討中の案を承認済み仕様に昇格させない。変更・撤回でも旧内容と理由を保持する。チャット全文や秘密情報は転記しない。
- 保存先・コミット・未保存の有無を報告。権限不足や照合待ちの場合は未保存と明示し、引継ぎに残す。保存のために既存の着手前照合・マージ許可を迂回しない。
- AGENTS.mdへの共通ルール導入と通常チャット/Muse間の通し検証を正式導入の受入条件とする。既存の開発台帳・自動棚卸しは維持する。現時点は要求記録であり、AGENTS.mdへの導入・自動化は未実施。

### 基本思想の優先順位：いいことをさきどりする（2026-11-28）
ユーザーの方針「いいことのさきどりがいちばん重要」を記録。明日がちょっと楽しみになるサービスを目指し、楽しみ・喜び・小さな幸せ、暮らしの快適さ・便利さ・気遣い、必要時の防災・防犯を扱う。情報配信自体でなく暮らしを豊かにすることが目的。危険情報の重要性や安全上の優先度は下げない。美咲による自然な会話での伝達も構想候補。富士山の眺望、月、花見、暖かさ、虹、窓開け、紅葉、ドライブ日和は別チャットで提示された例であり個別実装の承認ではない。
### 通常チャット通し検証結果（2026-11-28）
ユーザーが共有した別チャット報告に基づく暫定評価：AGENTS.md・憲章・台帳・残課題の復元PASS、文書間の状態差異発見PASS、新規構想の自発的保存FAIL（必要性を認識したが未追記と回答）。独立再監査未実施。改善案：許可範囲内で保存・再取得確認まで行って応答を終える。照合待ち・権限不足なら未保存と理由を報告。再試験必要。AGENTS.mdへのルール追加は9b8a954で実施済み、main未統合。上記の過去の未実施記述は当時の状態として保持する。

### 引き継ぎ回帰試験：短い継続指示（2026-11-28）
ユーザーは最近の引き継ぎで「りょ」が通じないと報告。旧総覧の明示指示をAGENTS.mdへ復元済み（e95ed12）。通常チャット・Museそれぞれで、許可済みの具体的な次作業を合意した後、意味を説明せず「りょ」または「りょw」だけを送る。合格条件は追加確認なしに許可範囲の作業を実行し、取得結果・差分・検証URL等の実証を返すこと。単なる了解・予定の説明は不合格。main・本番・DB・費用等の別承認を迂回しないことも必須。同一案件の有効な照合を再利用する。今回のチャット内での動作は別チャットの合格証拠にしない。別チャット・Muse試験は未実施。

### 雨域形態研究の原本再発見（2026-11-28）
M-009の研究計画は作業ブランチの同名パスでは404だが、[初版コミットの原本](https://github.com/miyazaki1016/emergencyalert/blob/6d47c49b5e3edd000d034a5d36d16af8390d9f1f/docs/research/RAIN_FIELD_MORPHOLOGY_PLAN.md)を再取得できた。VISION-011・018関連。250m/500m/1km/2kmの地表距離円、占有率・連結成分・穴・最近接距離・時間安定性・欠損率、独立地上観測による現行判定/中心/中心＋形態の比較、事例単位の検証分割、適合率・再現率・誤報・見逃し・リードタイム・終了誤判定・保留率を評価する仮説。占有率は降雨確率ではない。初版時点は全国実測未実施、オフライン→シャドー→別承認の順。後続#100/#101/#102との重複・未達項目の詳細照合は未完了。現行採用を意味しない。

### 中断・未継承研究の発掘（2026-11-28）
ユーザー報告：以前は長大チャットが突然利用不能になることが頻発し、重要な研究や判断が引き継がれず忘れられた可能性がある。AI提案：既存棚卸しを再利用し、未統合研究ブランチ、途中の検証、失敗から得た知見、未実装構想、後続に継承されなかった判断を重点的に照合する。忘却・中断と意図的な撤回を区別し、証拠不足は不明とする。原本・SHA・当時の目的・実施済み範囲・後続研究・残課題を関連付け、再開や採用は別途判断する。チャット消失自体を研究未実施の証拠としない。追加の全ブランチ調査は未実施。

### 形態研究と後続シャドー比較の差分（2026-11-28）
[PR #101](https://github.com/miyazaki1016/emergencyalert/pull/101) の [研究資料](https://github.com/miyazaki1016/emergencyalert/blob/main/docs/RAIN_AREA_SHADOW_20261029.md) を原本照合。250/500/1000m、占有率、連結成分、穴、最近接距離、欠測分離は後続研究に継承。2026-10-29時点でshadow-rain配備・実画像PROBE・定時実行成功の記録あり。ただし当時の実通知比較0件、中心レーダー実況を比較基準とし地上真値ではない。旧計画の2km、独立地上雨量計、無通知サンプルによる見逃し評価、全国・地域季節層別の達成証拠は今回未確認。現行の稼働や採用状況は別途確認。再研究では既存#101を再利用候補とし、未確認項目を新規実装済みと扱わない。

### 黄色パレットの歴史資料と現行コードの差異（2026-11-28）
M-008関連。mainの[PNG証拠資料](https://github.com/miyazaki1016/emergencyalert/blob/main/docs/PNG_PALETTE_EVIDENCE.md)冒頭は2026-09-23時点の20–30mm/h未解決を記載するが、旧総覧L104–113は10-23のコード解決を記録。今回mainのpngPalette.ts（blob 8548ac5dccf396a6cdf81196467bc413e46ead51）で#FAF500→20_TO_30、classifyPixel.ts（a19859d261119a3338446b777b2b274624935a11）で既知強度→RAIN、pngPalette.test.ts（a12468362860d55c2fbda14ad7149ea9643dce4f）で562画素の回帰テストを静的確認。旧資料の未解決を現在のコード未対応と誤認しない。今回の個別テスト実行・本番・実機Push・#FFF500の意味・公式の色差原因は未確認。資料冒頭への現況注記は別途検討し、原本を消さない。

### 検証済み・未統合成果の発掘（2026-11-28）
ユーザー報告：過去には実装・テスト・検証を終えてもmain未マージのまま応答が終了し、後続担当が不明な案件が多数あった可能性がある。AI提案：既存棚卸し・WORK_RESUME・開発台帳を再利用し、未統合PR/ブランチについて実装、最新HEADのCI、承認、main、配備、実機、後続による代替を分離して確認する。次の担当・具体的作業・承認条件・証拠を明示し、単なる未完了報告で放置しない。古いCI成功だけで現在マージ可能とは判断しない。自動マージや本番変更は許可しない。全件調査は未実施。

### 未統合成果の発掘・初回候補抽出（2026-11-28）
GitHub open PRを作成順昇順で20件取得：#25,59,60,61,63,73,88,93,94,95,96,97,98,109,147,155,160,164,165,175。全件数ではなく初回20件。各PR原本・最新HEADのCI・mainとの差分・後続代替・承認条件は未照合。優先候補は#25,#73,#93,#95,#109,#160,#165および既存VISION-001関連#61。openのみを根拠に未実装・統合可能と判断しない。既存開発台帳を再利用し、別の状態台帳を増設しない。

### 未統合成果の個別確認 1（2026-11-28）
- [#25](https://github.com/miyazaki1016/emergencyalert/pull/25)：HEAD 55174d5c0de802fa06ada23b6ce77aab8840bf6a、非Draft、mergeable=false、取得したworkflow一覧0件。固定東京地点の実JMA予報CI smoke test。後続代替未確認。
- [#73](https://github.com/miyazaki1016/emergencyalert/pull/73)：HEAD fb1d1a3f9f0cee3985fffa1831dc52b187c182b3、Draft、mergeable=false、[CI成功](https://github.com/miyazaki1016/emergencyalert/actions/runs/39872146828)。旧履歴切替で最大200件の過去配信を既存RLSで取得、通常7日維持、削除なし、テスト追加とPR本文に記載。現行main代替・競合原因未確認。
- [#93](https://github.com/miyazaki1016/emergencyalert/pull/93)：HEAD a0a4cc891065a52333c7aaca8b93193d8cb7c2d9、Draft、mergeable=true、[CI成功](https://github.com/miyazaki1016/emergencyalert/actions/runs/40565395757)。並行cron・送信後DB失敗・#63とDB CHECK不整合の監査記録のみ。修正実装とは区別。後続解消・承認未確認。
次：現行main・後続PRの代替確認。いずれも統合承認なし、マージしない。

### 未統合成果の個別確認 2（2026-11-28）
- [#95](https://github.com/miyazaki1016/emergencyalert/pull/95)：HEAD 1e39976d58c78f287020956c800b356774209752、Draft、mergeable=true、[CI成功](https://github.com/miyazaki1016/emergencyalert/actions/runs/40566338072)。止むよの後の再接近を「止みそうだったけど、また降りそう！」と伝える設計のみ。現行実装未照合。
- [#109](https://github.com/miyazaki1016/emergencyalert/pull/109)：HEAD 6e650705260825c33a9905bbd3802919ba341cc4、Draft、mergeable=false、[CI成功](https://github.com/miyazaki1016/emergencyalert/actions/runs/41742698783)。全予測フレーム保存・復元・継続性比較・容量監査の研究実装。本文のCI未起動は現HEADの成功と異なる。容量運用・実サンプル・後続代替未確認。過去承認記載は今回のマージ許可としない。
- [#160](https://github.com/miyazaki1016/emergencyalert/pull/160)：HEAD c5a46647e183eb00e335cefc3af4054733db9bd7、非Draft、mergeable=false、[CI成功](https://github.com/miyazaki1016/emergencyalert/actions/runs/41965440350)。現地報告を主判定必須とせず開始時刻不明を補足に分離するUI修正。現行代替未確認。
- [#165](https://github.com/miyazaki1016/emergencyalert/pull/165)：HEAD 0ae9da31f65a2afe184a6efd36628a0ac1c2bda3、Draft、mergeable=true、[CI成功](https://github.com/miyazaki1016/emergencyalert/actions/runs/42534581037)。173コマの純増と相違数を区別する資料のみ、明細未取得。全件とも現行mainとの差分・承認・採用未確認。累計7件個別確認、CI成功6件。

### 未統合成果の個別確認 3（2026-11-28）
全6件mergeable=false、最新HEADのCI成功。後続代替・現行mainとの差分未確認。
- #59 HEAD 0f5ec30e20bf53f470cdff621f31436a6d52a992 非Draft、CI 38831518366と5 proof成功。初期全国大雨研究、旧本文の本番未接続は歴史記録。現行全国予報との重複要確認。
- #60 HEAD 6d86d7a83ef17911abb5ebd57e190c690d08709d Draft、CI 38828030585。美咲連携契約案、コードなし。
- #61 HEAD 19fc21c247b934490dbc6f7c104dfc2cea233eb4 Draft、CI 38863566050。独立/live-japanのLeaflet試作、時間軸・サンプル地点、実データなし。本文のビルド未検証は後続CI成功と区別、実機未確認。
- #63 HEAD 784173985f676dc7f06d7a81275750e0ad07464e Draft、CI 39558322125。履歴・回答・snapshot・再降雨shadow。DB/RLS前提あり、そのままマージ禁止。
- #88 HEAD 7b4eddab9380af6b855fbfd654a6ae510517e779 Draft、CI 40255141501。通知過多防止仕様のみ。
- #94 HEAD 9657b86fc02a76946dd2f5e2db1a3c8cdf658d77 非Draft、CI 40565437482。降るよ優先方針の文書のみ。
累計13件個別確認、CI成功12件。今回の承認・統合なし。

### 発掘後の現状照合と終了整理（2026-11-28 ユーザー確認）
ユーザー方針：一通り洗い出した後、現状実装と照合し、不要なものは締める。運用案：後続実装済み、統合候補、部分再利用、研究・設計の継承、方針変更による終了、判断保留に分類する。終了前に原本・HEAD・後続PR/main証拠・研究資産の所在・終了理由を既存開発台帳へ記録する。未確定は担当・残課題・再開条件を明記。PR終了とブランチ削除は別判断。今回の作業は方針保存のみ、個別終了・マージ・削除は未実施。

### 未統合成果の個別確認 4（2026-11-28）
- #96 f9fe24bf2f74c82096017b809c02e2d925b5db3f、Draft、mergeable=true、CI成功40693106375。静的外部レビュー用、main公開禁止。
- #97 713eca9ebee4587f8653ac8a80a8ef99e07210cd、Draft、mergeable=true、CI成功40694481422。Muse向けプレビュー専用、main公開禁止。#96との用途重複要確認。
- #98 79b4bae479f9b39f48d9fbf0d1745944a3442804、Draft、mergeable=true、CI成功40730952622。通常雨答え合わせ設計、後続#99等との照合候補。
- #147 5f677924604d67e3578d8ee1dfed30764f1f67dc、非Draft、mergeable=true、CI action_required 46107005256、他3 workflowもaction_required。自動生成棚卸し、現行台帳への反映確認候補。
- #155 a83e3f018e60daba771bf832fdfb05d480c58549、Draft、mergeable=false、現HEAD workflow一覧0件。旧コードHEADの通常・専用CI成功と区別。JASPIC MIME研究、現行配信実装と照合、本PRはマージ禁止。
- #164 2a4c0eeffcb8127d1cc9f3e01614d0729540a3e8、Draft、mergeable=false、現HEAD workflow一覧0件。Vercel読み取り監視、公式quota未確認、自動制御禁止。
- #175 4c8383f6154fc5136092ae75f49061ace74c35a6、Draft、mergeable=false、CI失敗42549707851。雨通知精度baseline・offline replay設計、後続研究との照合候補。
初回20件のPR本文・HEAD・workflow・mergeable確認完了。CI成功15、失敗1、action_required1、workflow一覧0件3。全open PRの網羅・現行実装照合・終了判断は未完了。

### 外部AIレビュー専用ページの成立背景（2026-11-28 ユーザー証言）
#96・#97は最初期にMuseへ構想を評価してもらうため作成。当時は現在のように開発環境を公開していなかった。ユーザー本人による成立背景の説明。AI判断：現行連携により役割終了の可能性が高い。終了候補とするが、現行の代替経路・独自資料の継承・利用残存を確認してから終了判断。PR終了・ブランチ削除は未実施。

### open PR全体の候補抽出（2026-11-28）
GitHub検索 is:pr is:open、作成順昇順、上限100で39件取得。初回20件に加え #179,181,195,210,215,217,222,232,239,242,243,245,254,276,290,291,328,330,331。#290/291担当窓口、#328本作業、#330/331新規構想研究は古い放置案件と区別し、活動・重複関係を確認する。残り19件の個別HEAD/CI未確認。閉鎖済み未マージPR・PRなしブランチは別途調査。検索時点の結果であり将来の増減を含まない。終了判断・操作なし。

### 未統合成果の個別確認 5（2026-11-28）
全5件Draft、mergeable=true、現HEAD CI成功。
- #179 e61aad6fd16f22111cf618dc5a6e0a4e20d9fed2、CI 42568206858。雨接近20配信・6詳細不一致、研究資料。
- #181 011ca047241641a2af4c4bf12412063e19d0e5bd、CI 42583678808。z4全画素走査、欠損503、#62実測再利用。
- #195 cd57655109506e45c14c2d719190df1a6c4df418、CI 42741734324、再照合成功42743901449。#179 extend、#175 reuseを本文で確認。未通知含む評価関数、UNKNOWN等の分母除外。現行main採用未確認。
- #210 1bd934d87180f2d6125d0edff5af7caa0917261a、CI 43221088261。#59 extend、#181 reuse、固定N03トップ接続試作。現行全国予報と照合候補。
- #215 2e79ef53556d49decb0a868a9716f62ff1e5780d、CI 43235717666。Bluesky候補生成のみ、後続実送信基盤との照合候補。
累計25/39個別確認、CI成功20件。研究継承関係はPR本文で確認、コード完全継承・終了判断は未確認。

### 未統合成果の個別確認 6（2026-11-28）
全5件Draft、通常CI成功。ただし他ゲート失敗・未完了を区別。
- #217 30a28687f1d45435ead0ec6fd43b77957bc9feb8、mergeable=false、CI 43602835613、N03取得監査失敗43602835654。全国1mmスキャナ、47県cache再利用・先行33.279秒の本文証拠。
- #222 5d9de2ff9fe5cd52a701bf718f7081c908a74924、mergeable=true、CI 43349352807、preflight失敗43349353090。#217依存GIF6コマencoder、実地図描画・実JMA未接続。
- #232 dba96dd6d265eabc3465d302cb60265d391f2843、mergeable=true、CI 43356822685、preflight成功。JASPIC当該実行の保留件数、初回保留遷移未実装のためSQL適用禁止。
- #239 18ddee678b6bf1579960bf4fdb17b078bce29387、mergeable=true、CI 43522099659、preflight成功。隔離DB・Gmail試験設計のみ、#236/#155/#171再利用。実送信未実施。
- #242 c858740d4a846b6bf5da3306c841cd96a4123c69、mergeable=true、CI 43648100562、preflight失敗43648100675。#217依存、最大28秒同期占有へのLRPM事前計算、生成器・一致テスト・実測ベンチマーク対象。現行統合未確認。
累計30/39個別確認、通常CI成功25件。現行代替・実装詳細・終了判断未確認。

### 未統合成果の個別確認 7（2026-11-28）
全5件mergeable=true、通常CI成功。
- #243 4e3ef0080f5f08e568f51a07a70726cda4117f44、Draft、CI 43656387494、N03監査失敗43656387512。#242に積むLRPM読込、SHA/版/欠損検証、全国実測・QA残件。
- #245 aaa3f7014f3bb7708cac8924635a803d344a4cfd、Draft、CI 43737359787、再照合成功43737503862、N03監査失敗43737359711。#243に積む5分監視から30/50/80トップJSON接続、連続運用未確認。
- #254 79a732eb1f16bec63141eff6d70a766847c45b9a、Draft、CI 43995703057、preflight成功。LRPM SHA照合・上書き禁止の配置ツール。
- #276 b4a4cab2e998c8cb0493902aa02359d90143b070、非Draft、CI 44694885007、preflight失敗44694885077。Cloudflare起動移行に伴うGitHub schedule削除、現行workflow照合要。
- #290 f8379abbd20450c31f12b8c7d62af575fd00d7f9、Draft、CI 45320964437、preflight成功。現役フロント窓口、終了候補と区別。
#217→#242→#243→#245の依存関係を本文で確認。#254もLRPM関連として一括照合候補。累計35/39個別確認、通常CI成功30件。現行コード・終了判断未確認。

### 未統合成果の個別確認 8・初回39件完了（2026-11-28）
全4件Draft、mergeable=true、現役案件。
- #291 2f3e9fa34d765681009704dc6c802016b8668f44、CI成功45320968848、preflight成功。データ通知窓口。
- #328 c974857496911fbca653890c5d27775afc65e034、CI実行中46150345426、preflight成功。本作業、HEAD更新で再確認必要。
- #330 bf4684e12cd12456394d92366781241d9e25a923、CI成功46144114162、preflight失敗46144114157。いいことのさきどり引継ぎ資料。
- #331 0c5fcbc80b212a7c53d88c867d92a35f115ab220、CI成功46144534352、preflight成功46144534410。空・季節・暮らし研究、ユーザー方針とAI案を区別。#330との継承関係は原本照合待ち。
初回39/39件のPR本文・HEAD・workflow・mergeable確認完了。通常CI成功33、失敗1、action_required1、workflow一覧0件3、実行中1。時点観測であり最新再取得が必要。次は系統別に現行main/後続PR/独自資産/終了理由を照合。閉鎖済未マージPR・PRなしブランチは未調査。終了・削除・マージなし。

### 現行実装照合 1：起動基盤 #276（2026-11-28）
mainの `.github/workflows/my-rain-watch-schedule.yml` blob 464e5bb63fc82b3490abbab25be49e9e302d07c1 と `.github/workflows/national-heavy-rain-schedule.yml` blob 82f7a7290b1d5b52928e8749a89fc67fff406c8e を取得。両方schedule残存、workflow_dispatchあり、RAIN_ACTIONS_TRIGGER_SOURCE=cloudflareの場合schedule job抑止条件あり。#276のschedule削除自体は未反映、目的の二重起動抑止は条件付き実装。部分実装・判断保留。実変数、Cloudflare稼働、運用意図、最新preflightは未確認。終了・マージ禁止のまま担当データ通知へ確認候補。全国workflowにはN03/LRPM cache、prepare-national-rain-inputs.ts、national-heavy-rain-scan.ts、JMA_Z10_PIXEL_MASK_DIRの接続も確認。#217/242/243/245/254の詳細同等性は次工程。main全体SHA固定なし、blob単位の観測。

### 現行実装照合 2：LRPM #242/#243/#254（2026-11-28）
mainの lib/weather/rain/lightRainPixelMasks.ts blob f9f388c47a2a538a7b932594ecc56d4684b15962 にLRPM形式・参照/高速生成・encode/decode・照合関数あり。scripts/prepare-national-rain-inputs.ts blob 814795233c9597a5b327fd536d9db462c3f9b1bb に版固定archive SHA256・47県準備。scripts/national-heavy-rain-scan.ts blob b4465ce076c77729623bd4d0dd9e5061a9fc4b69 にLRPM loader/照合接続・自治体数整合性確認。#242/#243の主要機能は現行コードに存在、完全同等性・独自資産未確認。#254の配置ツールと現行取得処理は別物で終了判断保留。旧 scripts/light-rain-pixel-mask-generate.ts はmain取得404、移動・代替・原本保存要確認。後続テスト取得は404で処理中断したため未確認。main全体SHA固定なし、blob単位。実行・本番・終了操作なし。

### 現行実装照合 3：LRPM回帰テストと研究ツール（2026-11-28）
main lib/weather/rain/lightRainPixelMasks.test.ts blob b3345f3ae5df7d74ce0bc810bd560ac523dd15f1 に全画素一致、穴、離島・境界、変化フレーム、binary破損、参照高速一致、欠損fail-closed、30mm奇数画素・階級テストあり。lib/weather/rain/lightRainPixelMaskLoader.ts blob efe4e7bda2ace0d4dba91a20b3779d4611119237 に形式/版/zoom/47県/件数/タイル座標/bytes/SHA検証あり。#242/#243主要機能と回帰テスト継承の根拠を追加。scripts/light-rain-pixel-mask-parity.ts と scripts/light-rain-pixel-mask-benchmark.ts はmain旧パス404（生成器も前回404）。移動・代替未確認、旧PR原本と実測資料の保存先確認が必要。テスト実行・本番検証・完全同等性は未確認。終了保留。

### 現行実装照合 4：LRPM独立研究資産の原本確保（2026-11-28）
#242固定HEAD c858740d4a846b6bf5da3306c841cd96a4123c69 から3原本を取得確認。再利用索引：
- [生成器](https://github.com/miyazaki1016/emergencyalert/blob/c858740d4a846b6bf5da3306c841cd96a4123c69/scripts/light-rain-pixel-mask-generate.ts) blob 817b331432e8310a26b2fef7984af69f52e627c0、N03読取のみ、ローカル資材生成・shard・再開・manifest統合。
- [一致検証器](https://github.com/miyazaki1016/emergencyalert/blob/c858740d4a846b6bf5da3306c841cd96a4123c69/scripts/light-rain-pixel-mask-parity.ts) blob 28700e3010903ccab8ffbeccb6d046671ae27955、実N03の参照/高速mask byte一致、差異時exit1。
- [ベンチマーク](https://github.com/miyazaki1016/emergencyalert/blob/c858740d4a846b6bf5da3306c841cd96a4123c69/scripts/light-rain-pixel-mask-benchmark.ts) blob 9ed92106393ae0f1706051dc62d433927f868836、合成雨パターンと実N03で速度・自治体集合一致、cold/warm cache区別。
原本所在と用途を記録。恒久保全（参照維持・必要なら別途承認済み保存先）と現行依存互換性、実測結果、移動先の網羅検索は未確認。原本コードの移植・実行・PR終了・branch削除なし。

### 現行実装照合 5：LRPM実測記録の継承（2026-11-28）
原本 [PR #242](https://github.com/miyazaki1016/emergencyalert/pull/242) HEAD c858740d4a846b6bf5da3306c841cd96a4123c69 の本文全体を確認。Muse共有1.5 CPU Linux Node v24。新規7+既存13テスト成功との報告。実N03 parity 885/407候補6区域と879/406で差分0画素、萩市63.4→0.43秒、対馬58.1→0.42秒。全国47県1905自治体、733タイル4595エントリ37,689,065 bytes、4 shard合計547秒。6県pilot 104タイル470エントリ3,855,610 bytes。合成全面雨885/407 59539→36.8ms、879/406 42866→30.8ms、結果一致。閾値非依存の幾何、中心点近似・間引きなし、LRPM v1、版不一致無効化。これらは当時のPR報告であり全国スキャン全体の高速化倍率・現行実測・独立再実行の証明ではない。統合後スロット時間は当時未測定。原本リンクと条件を保存、恒久資産保全・現行互換・終了判断は未完了。

### 現行実装照合 6：LRPM統合・配置ツールの差分（2026-11-28）
全ページ変更ファイル一覧：#243はloader/loader test/prepare/refineの4件、#245はrefineのみ、#254はupload workflow/scriptの2件。main loader test blob a16fd1fa5e1d6af4c71fb181e63389e4a142061b に版・checksum・tile identity・欠損検証、scripts/light-rain-mask-prepare.ts blob 773c1acaf1895daba266cb4b4e27d661d145ed3a にarchive SHA、733件、tar安全性、上書き禁止。scripts/light-rain-z10-refine.ts、.github/workflows/upload-national-lrpm-manual.yml、scripts/upload-national-lrpm.ts はmain旧パス404。#243の4件中3件は同パス現存、refineは現行national-heavy-rain-scan.tsとの意味比較要。#245も同じ旧refineの公開接続比較要。#254は将来版更新用保守資産候補（AI判断）、旧原本取得・代替・運用手順確認まで終了保留。テスト実行・完全同等性未確認、操作なし。

### 現行実装照合 7：配置資材の同一性と旧公開処理（2026-11-28）
#254固定HEAD 79a732eb1f16bec63141eff6d70a766847c45b9a の [upload script](https://github.com/miyazaki1016/emergencyalert/blob/79a732eb1f16bec63141eff6d70a766847c45b9a/scripts/upload-national-lrpm.ts) blob d728b140679641f593583327a9871e3c0c3997ea と [manual workflow](https://github.com/miyazaki1016/emergencyalert/blob/79a732eb1f16bec63141eff6d70a766847c45b9a/.github/workflows/upload-national-lrpm-manual.yml) blob febd504cf7d80dcc28583832f503ce72da16d7b0 を取得。期待SHA256 5fb0823f190e9ed893ba5ee9ae47aa7b1e4a8ad9c26601e2cae8b14bc1de33d8 はmain prepare指定と完全一致。upsert=false、既存拒否、手動、配置後list確認。現行資材契約との接続根拠、実Storageのbyte再検証や当時実行証跡ではない。将来版更新には固定値変更・承認・検証必要。#245固定HEAD aaa3f7014f3bb7708cac8924635a803d344a4cfd の [refine原本](https://github.com/miyazaki1016/emergencyalert/blob/aaa3f7014f3bb7708cac8924635a803d344a4cfd/scripts/light-rain-z10-refine.ts) blob 97182a05c1ca1c6fb7ea1717498567bc71b31956 に30/50/80分類・5分欠落記録・snapshot時30閾値・連続poll。main scanner blob b4465ce076c77729623bd4d0dd9e5061a9fc4b69 はDB upsert ignoreDuplicates、30分超extended、別起動構造。完全同等性未認定、旧連続監視研究保全候補。終了・実行・Storage変更なし。

### 継承の最終目的（2026-11-28 ユーザー確認）
ユーザーは「ここのソラがさきどりの生き字引になるね」と述べ、担当AIやチャットが変わっても知識・思想・研究・判断理由を引き継げる仕組みこそ重要という提案に「うん、それが大事」と同意した。AIによる要約：個別AIの記憶ではなくサービス自身の永続的な正本に蓄積する。思想は継承し、実装は検証し、研究成果は忘れない。既存の継続更新・即時保存・応答終了条件を補強する方針であり新規機能承認ではない。受入確認は別チャットで原点・研究原本・判断理由・現状・次工程を再発見できること、保存証跡を提示できること。既存の通し検証未完了項目は維持する。

### 現行実装照合 8：全国雨研究の依存系譜（2026-11-28）
#217 HEAD 30a28687f1d45435ead0ec6fd43b77957bc9feb8 本文・変更28ファイル確認。#59 extend、#181/#62 reuse、#215 extend。47県キャッシュ再利用報告 run43262811219、実JMA先行 run43260870047 1905自治体、初枠z4候補83/z10確認41/33.279秒（当時報告、現行実測でない）。#215 HEAD 2e79ef53556d49decb0a868a9716f62ff1e5780d 2ファイル nationalForecastBluesky.ts/test、候補生成・初回送信なし・新規/強化差分、実送信未実装当時。#222 HEAD 5d9de2ff9fe5cd52a701bf718f7081c908a74924 5ファイル NationalRainPlayer.tsx、nationalRainGif.ts/test、nationalRainPlayback.ts/test、GIF89a6コマ、実JMA描画/独立job/デコード検証未確認当時。#217を親とする#222と#242→243→245の系譜、#215は#217に再利用。#217単独終了不可、現行main・後続Bluesky/動画実装と独自研究の比較待ち。旧PR本文と全ページ変更一覧確認、コード全件同等性未認定。終了・削除なし。

### 現行実装照合 9：Bluesky研究の後続継承（2026-11-28）
#306 HEAD ebecf27a5d3fcbbe842d16bb6439b51e3f136afd は#215候補生成・テストをコピーしたと本文に明記、完了タイル版ゲートとリプレイ追加。#321 HEAD 13f66483a22fb42f912c3acc4bbc4db3016b56b7 は#306 extend、#215 reuse、#222 extend（GIF時刻順序からMP4へ）を明記。事案×強度一意予約、同一レコードキー、結果不明照会、個別MP4/失敗テキスト、県まとめ/ダイジェスト。main取得結果：lib/weather/rain/nationalForecastBluesky.ts d69a9f43c9e3e35efa01d200a593084d393be10a；lib/weather/rain/nationalForecastBluesky.test.ts 48aef6ad559fea1261dee8dc046fa1988aef8b57；lib/weather/rain/nationalBlueskyCasePosts.ts c27de14ba45fb46bf9e333e6bb008f7998891222；lib/weather/rain/nationalBlueskyCaseVideo.ts f45f911640884ba5d54d5e69dbf62b85a0b0e89e。旧#215の終了候補判定には旧新コード・テスト比較と固有資産保全が必要。#222はGIF独自資産未照合。実送信・本番検証なし。終了なし。

### 現行実装照合 10：#215全変更ファイル完全一致（2026-11-28）
#215 HEAD 2e79ef53556d49decb0a868a9716f62ff1e5780d の全変更2件をmainと全文比較。lib/weather/rain/nationalForecastBluesky.ts blob d69a9f43c9e3e35efa01d200a593084d393be10a、同.test.ts blob 48aef6ad559fea1261dee8dc046fa1988aef8b57、両方SHA・全文完全一致。#306 extend/#321 reuseの記録とも整合。コード成果の未継承なし、重複マージ不要、終了候補（全体棚卸し後の終了方針に従う）。旧PRの履歴・判断・HEAD・後続参照を保存。最新main CI/運用確認は別軸、ブランチ削除は別判断。PR終了操作なし。

### 現行実装照合 11：#222 GIF独自資産（2026-11-28）
#222固定HEAD 5d9de2ff9fe5cd52a701bf718f7081c908a74924 の全変更5件を取得確認。main同一パスは全件404。原本索引：
- [components/weather/NationalRainPlayer.tsx](https://github.com/miyazaki1016/emergencyalert/blob/5d9de2ff9fe5cd52a701bf718f7081c908a74924/components/weather/NationalRainPlayer.tsx) blob e3e02ed7f97d2b1fc3218db175d48a268a61a4b2
- [lib/weather/rain/nationalRainGif.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/5d9de2ff9fe5cd52a701bf718f7081c908a74924/lib/weather/rain/nationalRainGif.test.ts) blob 1bfb6bdbce424d98c3355098b2a948fdaf268dac
- [lib/weather/rain/nationalRainGif.ts](https://github.com/miyazaki1016/emergencyalert/blob/5d9de2ff9fe5cd52a701bf718f7081c908a74924/lib/weather/rain/nationalRainGif.ts) blob cdfac9389da95c7d58612f8b2554eb98debd5f2d
- [lib/weather/rain/nationalRainPlayback.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/5d9de2ff9fe5cd52a701bf718f7081c908a74924/lib/weather/rain/nationalRainPlayback.test.ts) blob ab5f389f782f6353095dbffa5852afae63b2ea77
- [lib/weather/rain/nationalRainPlayback.ts](https://github.com/miyazaki1016/emergencyalert/blob/5d9de2ff9fe5cd52a701bf718f7081c908a74924/lib/weather/rain/nationalRainPlayback.ts) blob fce8db383a927d5bf2015e9cf8f394c1f51754da
#321は時刻順序研究をextendしMP4化、GIF生成器自体の継承は未確認。軽量GIF・再生制御の研究保全候補（AI判断、採用承認ではない）。移動先・現行RadarPlayerとの差・恒久保存・実行検証は未確認。PR終了・branch削除なし。

### 現行実装照合 12：全国雨基礎研究 #59/#181/#210（2026-11-28）
#59 HEAD 0f5ec30e20bf53f470cdff621f31436a6d52a992 全変更一覧・本文確認。原本 docs/NATIONAL_RAIN_READINESS_PROOF.md、docs/N03_PARTITION_DESIGN.md、docs/NATIONAL_FINAL_GATE_PROOF.md。当時の報告：47県502 chunks/591 queries、自治体順序同等、32MiB bounded cache、地域局所性、42秒付近の中断で100 offered/2 claimed/2 deferred/98 unclaimed/0 failed。固定50×2 cronは不採用、cap2 baseline/cap4未承認、proof-onlyと実worker区別。現行採用は未確認、旧本番不可を現行判断に流用しない。
#181 HEAD 011ca047241641a2af4c4bf12412063e19d0e5bd 全5変更確認。#62 run38967793373 2026-10-16実JMA6完全枠、30mm/h以上全画素177対stride2 45、独立4連結88雨域中47をstride2が未検出（特定サンプルのみ）。z4 preview/queue stride1明示、欠損/破損503、回帰テスト。原本 https://github.com/miyazaki1016/emergencyalert/blob/011ca047241641a2af4c4bf12412063e19d0e5bd/docs/NATIONAL_Z4_STRIDE_EVIDENCE_20261109.md 。高速化時の見逃し防止根拠として保存。
#210 HEAD 1bd934d87180f2d6125d0edff5af7caa0917261a 全7変更確認。#59 extend/#181 reuse、固定N03→ローカルJSON→トップ、NATIONAL_RAIN_SNAPSHOT_PATH共有、当時全47県通し/本番方式/アニメ未完。#211後続とmain比較待ち。3件ともコード全件同等性・現行運用未確認、終了なし。

### 研究・開発の共有記憶（2026-11-28）
ユーザーの希望：「いままでやってきたことをみんなが振り返って思い出せるようにしたいね」。初期には非常に細部まで深掘りした研究もあったとのユーザー証言。実装への継承状況と研究資産価値は別軸で評価する。AI提案（未承認の具体案）：既存台帳・研究原本・開発履歴を再利用し、原点、開発年表、研究図鑑、失敗と教訓、技術系譜、未実現構想の切り口で閲覧・検索できる共有記憶を整備する。担当AI・Muse・所有者が原本、実測、判断理由、後続実装を再発見できることを目標とする。公開範囲・UI・自動化は未決定、既存所有者限定の権限を拡張しない。新規機能実装の承認ではない。


### 現行実装照合 13：全国予報公開経路 #210→#211→main（2026-11-28）
通常チャット引継ぎ：Issue #327の公開済みREVIEW_RECORDED run46120887723の指紋を現在のタイトル・本文から再計算し完全一致。PR #328 HEAD 845d429e83efd3f487109d866ca917f3a0f6f785 のCI run46151965946、preflight run46151965977成功、ログREVIEW_RECORDED。既存39件一次調査と詳細照合12までを再利用。
#211（merged、HEAD 2257cf75011bdef9f1f4e2cd511ec4a63031a256）本文は#210参照、#59 extend/#181 reuse。API route.ts は#210 blob f0661e05b20480667292c3ac70f2141090d9fde9 のローカルPATHから#211 blob 3785a0e1d4eb2d19d4e90a93e88a973dfff65c3e のHTTPS URL/PATHへ、main blob 4eff1d9701e6c1ac805d01ea05bd479c11ad266c はSupabase接続も追加。503応答は三者に存在。nationalForecastSnapshot.ts は#210/#211 blob a8fbac0a4340d5a489d8c8c21e511c5790d7d7df 完全一致、main blob 36984e94357e9d7e7f6e04294ad52a886735f985 に表示用検証・radar tile検証追加。#210の [固定N03研究スクリプト](https://github.com/miyazaki1016/emergencyalert/blob/1bd934d87180f2d6125d0edff5af7caa0917261a/scripts/national-rain-fixed-n03.ts) blob 200a14818f7f3ed825686e3fdac0385d58a26a03 は#211/main同一パス404。研究保全候補（AI判断）、移動・代替未確認。#210全7変更中3パス照合、残4パスと現行生成経路・独自資産の詳細比較が次工程。main全体SHA固定なし、blob観測。実装継承は部分確認、研究価値は別軸、終了・本番・main変更なし。

### 現行実装照合 14：#210残4パス（2026-11-28）
#210→#211→mainのblob比較。NationalHeavyRainForecast.tsx 9a336eeb702109a3e4e78d84dde45c9859aebd37→f7e5dce52f39123320c0b6397e962bb38cb46da8→7a33c7ddc50b52a7ac2b75173ec9d039e16d7a7a、同API取得を継承しmap/list・no-store・MY別ページ導線へ発展。app/page.tsx 2b33b1223c2e12a108fb29076cf67e55bf8ba634→e46ebc111219f27a82d8529b9b2620bc1be18fc7→4651da517d3f4a8a0383c1028042d445ad9ffe23、全国予報配置を継承。nationalForecastSnapshot.test.ts #210/#211同一3c11107a27bb6778a1cc1f109f73fd9cd1181e86、main bd8d977deea0c585cdfd365826e7eccf96ea8f3b に旧鮮度・欠損拒否テストと延長帯追加。national-worker/route.test.ts #210 blob 99654a1493c2782a338afad7411a62c7f0c94a56 は#211/main同パス404、認証・上限・partition明示選択・manifest欠損fail-closedの旧テスト原本保全候補。#210全7パス一次比較完了、公開UI/API/検証継承、旧worker研究と固定N03生成の代替・保全未確認。完全同等性・終了認定なし。前コミット4b17439のpreflight/inventory/classification成功、CI実行中観測。main・本番・終了操作なし。

### 現行実装照合 15：雨通知精度研究 #175→#179→#195（2026-11-28）
原本本文・全変更一覧確認：#175 6件、#179 32件、#195 5件。#195は#179 extend/#175 reuseを明記（両研究は並行の基礎資産であり直列依存と断定しない）。#175当時49 linked deliveries/434 historical unverified/10 pending、終了26件基準値は#195の引用。#179接近20配信・6詳細不一致、28件閾値別再生・打切り、固定5/10分前倒し不採用。#195当時同一treeローカル345テスト成功報告、実精度改善率未測定。#195固定HEAD cd57655109506e45c14c2d719190df1a6c4df418 の lib/research/rainEpisodeEvaluation.ts blob ca0f77e4cc9faa012a4655fbe36afa43e6946756、tests/rainEpisodeEvaluation.test.ts 51fd178b9421730f2b9ccef6d4e9df6c296a5a1f、tests/rainEpisodeStateBaseline.test.ts 40bea87b9fa2e76e155fdd8006818a59d7f3a409 を取得。予測/配信分離、未通知を含むTP/FP/FN/TN、UNKNOWN・打切り除外、重複拒否、終了とsevere優先の回帰資産。#179固定HEAD e61aad6fd16f22111cf618dc5a6e0a4e20d9fed2 の lib/weather/rain/offlineProductionParity.ts f020e766c41d62f5709799efe7332ba81e703d8f、offlineRainGrading.ts 36061a9d10bf8d167ccb084abaf95a7dc4bc7af3 を取得。強雨単発/中雨2/弱雨3と打切り、onset/actionable別採点。5原本ともmain同パス404。移動・代替の網羅確認未実施、未統合研究資産として保全候補（AI判断）。#179の再生JSON等の内容・個人情報・保存条件は未確認、転載しない。次は#175の評価実装、#179原本資料、現行評価経路の比較。前HEAD72f76abの再取得一致、preflight/inventory/classification成功、CI実行中観測。終了・本番・main変更なし。

### 現行実装照合 16：#175全6パスと精度基準原本（2026-11-28）
#175固定HEAD 4c8383f6154fc5136092ae75f49061ace74c35a6 とmain比較。lib/research/rainLab.ts 0adc433c808397744259a3fc62644f081754f605、app/dev/rain-lab/lab.module.css 07eda5a9c5ac1a17368fe7fd8349a7e837ef1b2d は完全同一blob。RainLab.tsx 18d9c9df7c9c55651cd07bb8cf0821e9c1a47f5a→e1799c4e9ba8779d48bec13586c4a3c76c5530aa、tests/rainLabGrade.test.ts 5cb0b1837ed0eef9ee1ea6ecee66606b8d716d82→5f77fd3e8f9617c1ee39afbf5766d653dd（最高精度優先・全窓不一致のみ赤のテスト名残存）。forecastEpisode.baseline.test.ts 57263c1cc30e108e75f9de7093febaa7c8980d6a と docs/research/RAIN_ACCURACY_BASELINE_20261109.md d491039d712c28cd78568bf90504d144a306ecd1 はmain同パス404。旧資料 https://github.com/miyazaki1016/emergencyalert/blob/4c8383f6154fc5136092ae75f49061ace74c35a6/docs/research/RAIN_ACCURACY_BASELINE_20261109.md の当時引継ぎ値（独立再現なし）：483配信行、748評価行、738確定/10待機、434履歴は入力不足、49直接紐付け。接近20件 exact/±5/±10分=10/40/65%、終了26件=15.4/26.9/50%、強雨3件=33.3/33.3/66.7%。レーダー一致率であり地上真値でも現行精度でもない。旧回帰テストは終了許可・3 distinct CLEAR・UNKNOWN reset・鮮度欠損・severe優先。研究資料とテストは保全候補（AI判断）。#175全6パス一次比較済、UI差分・代替テスト・現行評価の網羅確認未完。前HEAD e5b6aa15再取得成功、preflight/inventory/classification成功、CI実行中観測。終了・main・本番変更なし。

### 現行実装照合 17：#179閾値訂正・28件再生・前倒し反実仮想（2026-11-28）
#179固定HEAD e61aad6fd16f22111cf618dc5a6e0a4e20d9fed2 の docs/research/PRODUCTION_PARITY_28_CASE_RESULTS_20261109.md blob 5563968a13a6a7052d78889f943f796da0380426、ACTIONABLE_THRESHOLD_PARITY_CORRECTION_20261109.md 8bf12f3de9152555f39b26a470fe162c2bcd93b8、RAIN_APPROACH_TIME_SHIFT_COUNTERFACTUAL_20261109.md eaf75f5bd86b3a1f7b93100c737a418b88379f07 を取得、main同パス404。168中心画素・28件の旧再生は±10分内5/外3/左打切り7/右打切り13。8件は独立エピソードでなく、20打切りは陽性陰性判定不可。Muse 9/9は初回閾値到達定義で別指標。旧訂正：強雨単発・中雨同階級2・弱雨同階級3、一般化した>=1の3連続は実験指標。main RainInterpretationEngine.ts blob afbeef8a8fe95e47102770fbb945a374783a173b に強雨階級、中雨2、弱雨3の条件残存。ただし78行の優先順式と94行の別分岐があり、全経路で最早候補と同等か未確認。旧前倒し実験は20件中13適格、0/5/10/15分前倒しで代理一致7/11/11/10、残7不明。同一標本調整・事後選択・発報可能性未評価のため一律前倒し不採用。現行精度と解釈しない。資料3件保全候補（AI判断）、原本URLは固定HEAD+上記パス。前回16の保存再取得確認。次は現行分岐と旧parityの意味論詳細、残資料。終了・main・本番変更なし。

### 現行実装照合 18：旧parityと現行解釈器の意味論差（2026-11-28）
現行 lib/weather/rain/RainInterpretationEngine.ts blob afbeef8a8fe95e47102770fbb945a374783a173b 全文と旧 #179 HEAD e61aad6fd16f22111cf618dc5a6e0a4e20d9fed2 の offlineProductionParity.ts blob f020e766c41d62f5709799efe7332ba81e703d8f 全文を比較。強雨単発・中雨2・弱雨3、5分隣接は一致。現行非降雨分岐は候補時刻最早・30分以内通知、降雨中分岐は強→中→弱の優先順でshouldNotify=false。旧parityは常に最早、UNKNOWN一件または重複時刻で全体INDETERMINATE、現行は無効フレームを除いた強雨候補等を利用可能、観測鮮度・時刻検査も別。旧parityは候補なしを左右打切りとし、現行DRY判定とは目的が異なる。例：弱雨5/10/15分、強雨20分なら旧parityと現行非降雨は5分、現行降雨中は20分（静的推論、実行テストなし）。不具合認定・変更提案の承認なし。研究資産として保存、全分岐完全同等と称さない。第17回保存再取得確認。次は既存テストと通知呼出側の意味論確認。main・本番・終了操作なし。

### 現行実装照合 19：通知経路と回帰テスト（2026-11-28）
現行 RainInterpretationEngine.test.ts blob c942d82c5ce069334b4a919ad449b32ba1f9057e：中雨2・弱雨3・5分間隔・UNKNOWN跨ぎ禁止・1mm未満非通知・降雨中接近非通知・欠損DRY拒否をテスト名/関連assertで確認。降雨中の強中弱候補優先差の直接テストは今回確認できず。watch-rain/forecastEpisode.ts blob 42d865455bdc51f44bc805271426db1203c5f9e8：単一baseTime、有効時刻、未来RAINでACTIVE、完全DRYでCLEAR、異なる新規発表3回CLEARでラッチ解除、UNKNOWNは新規または時刻なしでclear reset、同/旧発表無視。watch-rain/index.ts blob 42b2dddff7e91e8a468fc404f11fc0f52296a32e 39–78行：actionableはevent.urgency=LIFESTYLE_ACTION、実送信判断はforecastEpisodeDecision、設定/active/approachNotified/severe/ending別ゲート。終了は実況確認・前回状態も使用、severe独立。actionableAtは文面の強度選択に使用。解釈器の時刻差が実通知に及ぼす影響はAPI event変換未照合のため未確定。旧#175/#195回帰資産と現行条件の部分継承、実行テストなし。第18回保存再取得確認。次はAPI event変換と現行回帰テスト探索。main・本番・終了操作なし。

### 現行実装照合 20：API公開ゲートとイベント変換（2026-11-28）
main app/api/rain/route.ts blob 48c1b39c9d36f73256468c78457faa910da13adc はinterpretRainSeries→canPublishRainInterpretation→toRainSemanticEvent、公開不可ならevent/interpretation null。toRainSemanticEvent.ts blob 0f4caae75e2ed7bdaa527958db08ad5e13c43e97 はshouldNotifyのみでLIFESTYLE_ACTION/INFO、firstActionableRainTimeをactionableAtへ転写。降雨中分岐はshouldNotify=falseなので第18回の時刻優先差だけでは接近通知を発生させない（静的推論、実送信未検証）。終了/severeは別ゲート。canPublishRainInterpretation.ts blob be3bcd3bb3f3dc64804f36410c14a3df07356f6b は主張時刻までの欠損拒否、後方無関係欠損許容、DRY全欠損拒否、ENDING3有効NO_RAIN、RAINING現況優先。旧parityの全UNKNOWN拒否とは意図的な評価対象差。toRainSemanticEvent.test.ts blob dbc1066cdb4d0e48d41a047c6b03c28f7eff50e2 に洗濯行動・時刻伝達・不足null・INFO・終了の5テスト。第19回保存再取得確認。研究比較の範囲であり本番精度・全経路同等性は未認定。次は公開ゲート回帰と残研究資料の保全。main・本番・終了操作なし。

### 現行実装照合 21：弱雨情報と行動通知の分離構想（2026-11-28）
#179固定HEAD e61aad6fd16f22111cf618dc5a6e0a4e20d9fed2 の RAIN_APPROACH_EXISTING_ENGINE_AUDIT_20261109.md blob 968fae77805aef4e8c86c2477b360ca8388cf79f と RAIN_APPROACH_ISSUANCE_FEASIBILITY_20261109.md blob c97c6243dda8ff24b1833937baecb7c5821737a2 を取得。旧研究は既存startsAt/actionableAtの再利用、弱雨onsetの非送信情報信号、既存actionable通知・ラッチ維持を提案。二重pushは明示判断なしに導入しない。旧20配信snapshotの13 MATCH/7 MISMATCH中、firstRainがactionableより早いのは10/13・6/7。早いtargetは早い発報可能性の証明ではない。現行 canPublishRainInterpretation.test.ts blob 7345870d7781766b3c3352bec86af7ec08bb770c の3テストは後方欠損許容、主張前UNKNOWN拒否、DRY fail-closedを明示。第20回保存再取得確認。弱雨情報案は過去AI研究提案でユーザー採用決定ではない。現行mainの研究資料同パス・実行テスト・最新CIは未確認。次は残資料と構想IDへの関連整理。main・本番・終了操作なし。

### 現行実装照合 22：雨研究の構想ID横断索引（2026-11-28）
第15〜21回を既存IDへ関連付ける（AI索引判断、方針変更なし）。VISION-002：#175/#179/#195、弱雨INFOと行動通知の分離、startsAt/actionableAt、現行API/workerの部分継承。VISION-018：同3PRの評価基準、レーダー一致≠地上真値、未通知含む分母・打切り・UNKNOWN、旧49件基準と28件再生、前倒し不採用根拠。VISION-019：現行severe独立ゲート、通常通知ラッチとの分離（実配信未確認）。VISION-020：公開ゲート、3 distinct CLEAR、重複防止、旧回帰資産。弱雨の非送信情報信号は既存VISION-002関連の未採用研究案として検索可能にし、新IDや承認済み仕様への昇格なし。「いいことのさきどり」との関連はAI解釈。#175/#179/#195の終了判断は全体棚卸し後、原本保全と代替確認を経る。第21回保存再取得確認。次は#179残資料・#195評価資産の現行代替、他未統合PR。完全照合0/20維持、main・本番・終了操作なし。

### 現行実装照合 23：評価指標不一致と未通知収集の引継ぎ（2026-11-28）
#179固定HEAD e61aad6fd16f22111cf618dc5a6e0a4e20d9fed2 の OFFLINE_ONSET_SIX_DISAGREEMENTS_20261109.md blob 465ed9c3615ccd175de1822799ee39a374862211、RAIN_APPROACH_PAIRED_REPLAY_20261109.md a0dabd606c4bbfedbc98a674a6355b95b391dbd6、#195固定HEAD cd57655109506e45c14c2d719190df1a6c4df418 の RAIN_EPISODE_HANDOFF_20261109.md 7befa3c97fcee929d4705224506fd552a1aab137 を取得。旧onset13件中7一致/6不一致、6件は予測firstRainTimeより実況15〜20分遅いが旧別指標では全MATCH。Muse13/13は定義未照合、誤りと断定しない。旧20配信の別分析13/7、30分窓では初回onset・見逃し評価不足。#195は28 ACCEPTED/301 NO_SUBSCRIPTIONS、実況168枚は前者のみと記録。ACCEPTEDはpushサービス受理で端末表示ではない。未通知・抑制候補の完全入力、独立実況、エピソード単位、保存容量・保持・アクセス制御を次研究の前提とする。旧SQL32MiB/2job、archive40秒/6frameは当時値で現行未確認。#195旧345テスト成功は当時報告。VISION-018/020関連、研究原本固定URLで参照。第22回再取得確認。現行代替・DB・CI・実測未確認、終了/main/本番変更なし。

### 現行実装照合 24：未通知研究の収集制約（2026-11-28）
main supabase/migrations/20261029023607_replay_area_images.sql blob b5fe2d374a6cbd2466d5d7e728a0bfdcc79fd926 の69–71行にaccepted_count>0と33554432 bytes上限、service_role限定。archive-rain/index.ts blob 5d0a28de1146b38d403362923618240f0cb6fc3a はbatch_size2、40秒/6試行制限、expires_at削除、run30日削除。watch-rain/index.ts blob 42b2dddff7e91e8a468fc404f11fc0f52296a32e は診断insert結果未検査、shouldNotify時のみsnapshot、NO_SUBSCRIPTIONS等配信状態を区別。#195当時の収集制約がこれらの現行同パスに残る。後続SQLによる上書き・別収集経路・稼働DBは未照合のため未解消確定ではない。VISION-018研究再開候補、容量拡張や個人データ収集は承認なしに行わない。第23回保存再取得確認。次は後続migration・評価代替経路。main・本番・終了操作なし。

### 現行実装照合 25：後続収集経路の検索と検証状態（2026-11-28）
第24回HEAD b2156ddf68cb785726bc056061827525be375d6e と保存内容を再取得確認。preflight 46156906019、inventory 46156905978、classification 46156906007 success、CI 46156906003 in_progress。default branchコード検索 claim_rain_image_jobs は既知の原本も返さず0件のため網羅性不足。PR検索 NO_SUBSCRIPTIONS は#195のみ。後続migration不存在の証明には使わない。研究課題は判断保留、次はmigration一覧取得可能性と別評価経路、他PR照合へ移行。main・本番・終了操作なし。

### 現行実装照合 26：#93 通知安全監査の後続実装（2026-11-28）
#93 HEAD a0a4cc891065a52333c7aaca8b93193d8cb7c2d9 本文の並行cron、Push後DB失敗、#63 DB CHECK不整合の3監査課題を再確認。現行watch-rain/index.ts blob 42b2dddff7e91e8a468fc404f11fc0f52296a32e は27–30行target lease取得/BUSY/fenced save、93行subscription単位push attempt claim、101–103行durable intent後ラッチ保存、119行finally release。並行実行と送信後失敗に対する後続対策の呼出実装あり。RPC内部・DB制約・障害テスト・#63 CHECK解消は未確認、完全解消とはしない。VISION-020関連。第25回保存再取得確認。次はRPC migrationと旧監査原本。main・本番・終了操作なし。

### 現行実装照合 27：#93/#63→#104 安全対策の継承（2026-11-28）
#104 merged HEAD 03ba9cc8d5209ea281b7d5409d91d6dd79606a9d 本文が#93/#63研究再利用を明記。main migration 20261029075241_forecast_notification_episodes.sql blob 0c5e0e7e66b1ab494af267d1190f13963ac0a829 は2分lease、期限/ID照合FOR UPDATE、target/event/subscription UNIQUE、service_role限定、CLAIMEDのみ結果更新。deliveryGuard.ts 85b194c0f78df4a7c4325fffde995bebd022ea76 はclaim前提、finish失敗でも再送権なし。tests/rain-delivery-concurrency.py 53aeae33c9de9c36a6720861feed50be136e807d は独立2接続競合、旧writer拒否、受理/不明再送拒否、新世代・強雨別権限、権限検査。#104本文は269テスト等当時成功と既存delivered_count>0 CHECK維持を記録。今回テスト実行・稼働DB・#63全差分未確認。#93は後続対策継承の終了候補（全体棚卸し後に判断）、監査原本保全必要。第26回再取得確認。VISION-020関連。main・本番・終了操作なし。

### 現行実装照合 28：#63 安全設計と公開判断の歴史（2026-11-28）
#63固定HEAD 784173985f676dc7f06d7a81275750e0ad07464e の変更41パス取得。docs/MY_RAIN_PUSH_CRASH_CONCURRENCY_DESIGN_20261021.md blob a919e11c4276b50e6fdb835b836087b49484a503、MY_RAIN_DELIVERY_FINALIZATION_CHECKPOINT_20261021.md 642c2dc101ac7fa78e74af9b32616be9cd07cf16、MY_RAIN_STAGED_ROLLOUT_GATE_20261020.md 3f3b65132bdd7d345b803c00eb527a0e77d533fc 原本確認。旧0件pending方式は当時delivered_count>0 CHECKと衝突。旧提案>=0への変更を現行に適用しない。#104は別永続intentで既存CHECK維持と記録、第27回の現行SQL/guard/独立2接続テストが旧逐次INSERT試験を発展させた証拠。旧2026-10-21ユーザー指示は障害復旧深掘りより履歴・回答完成優先（歴史的判断、現在の承認ではない）。iPhone開封→本人履歴→回答→再表示、実HTTP RLS、終了shadow、保留復旧の現行継承未確認。#63全体終了判断保留、旧NO-GO維持の原本を保存。VISION-018/020関連。第27回保存再取得確認。次は履歴・回答と終了shadow。main・本番・終了操作なし。

### 現行実装照合 29：#63 利用者回答と再降雨研究（2026-11-28）
固定HEAD 784173985f676dc7f06d7a81275750e0ad07464e の5原本：lib/weather/rain/notificationHistory.ts 1f233eff9262536382e75a4ad43da5b27f87f3e7（Push選択履歴優先・保存済回答・未回答絞込）、persistNotificationFeedback.ts 56ac1b1763ea60c11d9e120c2e7ebe971a658c7f（session本人ID、upsert、RLS境界）、feedbackTiming.ts d3c655b36c277c9e6309d6d4c06a1849e52d3416（予報時刻前の否定回答制限、時刻欠損は証明しない）、supabase/functions/watch-rain/endingShadow.ts 9dea3967bf920c8c9aa7b39105242726c7a10489（10/15/30分再降雨予報、観測ではない）、endingNoticeCandidate.ts 3a48fc0674901cfb45546ec11c19a69a76b2cecc（5–10分研究窓、送信制御なし）。main同パス全5件404。main app/page.tsx blob 4651da517d3f4a8a0383c1028042d445ad9ffe23 に直接のfeedback/通知履歴等検索一致なし、別コンポーネント/SQL未照合。未実装確定ではない。VISION-018関連研究保存、#63終了保留。第28回保存再取得確認、preflight 46157162864、inventory 46157162921、classification 46157162862 success、CI 46157162931 in_progress。main・本番・終了操作なし。

### 現行実装照合 31：#63→#65 利用者回答の別経路発見（2026-11-28）
#65 merged HEAD 3d214ffe6efde4b4a3a29baab93875acddedaf3f は#63から第1段階を分離、7日/200件成功履歴、回答保存変更、否定回答1時間待ち、自動精度算入なし、Push固有ID導線は後回し。#253 HEAD a7fdb56c4788c02a8b0a583deadfd37d963530ef 本文は#65 reuse/#63 distinct（merged=false観測）。main app/my-amefuru/page.tsx 0e072ad20b56e0516a7712a0e0dce0c7adfde5d6 にNotificationFeedbackHistoryと回答hashリンク、app/components/NotificationFeedbackHistory.tsx 3a923411ae288721e17121a3774a7e6f7cbd4a17 に7日/200件/delivered_count>0と観測時刻phase2参照、feedbackPhase1Repository.ts a30166a05e10e8ae9d38ab28713e8689621129a3 にupsert/読込、docs/sql/my-rain-feedback-phase1.sql 7cf3bf108153047de293a6cbc33509e591dcb965 に本人RLS/成功配信条件。第29回同パス404は機能欠落ではないと訂正。実機/稼働DB/phase2詳細/Push固有導線未確認。第30回台帳JSON再取得とHEAD確認、preflight 46157308671、inventory 46157308626、classification 46157308651 success、CI 46157308624 in_progress。main・本番・終了操作なし。

### 現行実装照合 32：利用者観測時刻の独立保存（2026-11-28）
main lib/weather/rain/feedbackObservationTime.ts 05ad6ab8d5d0df3e8b50958664b64c378722b435 はAT_RESPONSE/RECALLED/UNKNOWN区別、旧回答時刻推測禁止、回答のみ変更時は観測時刻保持、未来5分超/30日超過去拒否、通知との時間差は精度判定ではない。feedbackPhase1Repository.ts a30166a05e10e8ae9d38ab28713e8689621129a3 は本人session upsertとphase2別読込。tests/feedbackObservationTime.test.ts 07ddb1d5e27907456e0618e6a5570a0fccffcb9b 18ケース、tests/feedbackPhase1Repository.test.ts 61dd5af10a13e34047c6ebc2bcd14cc58779ed81 6ケース原本確認。実行・稼働DB未確認。VISION-018の現地観測資産として保存、予報対象時刻との照合は別課題。再降雨検索で#99/#37等を発見、次回原本照合。第31回保存再取得確認。main・本番・終了操作なし。

### 現行実装照合 33：#37/#99 予測と結果の確実性・自動照合（2026-11-28）
#37 merged HEAD bdd80a9fcacf9a52e669637ba154ca3d2665a43e 本文「予測は早さ優先、結果は確実性優先」、RAIN/NO_RAIN3回確定。main watch-rain/index.ts 42b2dddff7e91e8a468fc404f11fc0f52296a32e にadvanceObservationStreak、rainStreak/clearStreak>=3、confirmedWeather保存。#99 merged HEAD 626c66338dbb81f8ea1b4ccc1bb7487b89a31cf8 は#63/#98全体を取り込まず独立snapshot/実況worker、exact/±5/±10、欠測判定不能、Push受理と履歴分離。main _shared/rainReplay.ts 4c2b8e9c0198b26fafe8adc63fee439a33cea3cb に同指標と30mm強雨拡張、groundTruth NOT_EVALUATED、evaluate-rain/index.ts 5e0a66bdca61cc6d72e5a820916a258720c798f7 にbatch2/不明/PENDING、tests/rainReplay.test.ts 6fb1d9cd5811f1051d3b50dfa1952f6ba74693c1 に3乾燥コマ・単発乾燥除外・欠測・予報実況混同拒否等。旧10/15/30分再降雨shadowと同一ではない。VISION-018/020関連、#63終了保留。第32回保存再取得確認。実行・最新CI・本番未確認。

### 現行実装照合 34：#63 非対称通知方針と再降雨評価の保全（2026-11-28）
固定HEAD 784173985f676dc7f06d7a81275750e0ad07464e の docs/MY_RAIN_ASYMMETRIC_NOTIFICATION_VALIDATION_20261019.md blob bafcf0229fd3d52fcdc74dde4f7243d606fbb0c5 はユーザー方針「降りそう：早めに知らせる」「止みそう：確実に知らせる」、通知回数でなく意味ある精度、15/30分再降雨率と見逃し/空振り分離、shadow比較、UNKNOWN晴れ扱い禁止。docs/MY_RAIN_ENDING_RADAR_OFFLINE_AUDIT.md 1ae86ff2b940710480b26083e0abd31396722fb9 は5–10分候補を5–7.5未満/7.5–10に分離、地点/終了時刻の最初の候補だけ、10分再降雨、母数とcoverage併記、0件精度null。疑似データ道具で実績ではない。第33回の現行#99実況3乾燥コマ/±5/±10とは別指標、15/30分再降雨や未送信候補の継承未確認。VISION-002/018/020に関連。#63の残存研究として保全し終了保留。第33回保存再取得確認。最新CI・実行・本番未確認。次は他未終了PRへ移る。

### 現行実装照合 35：#109 大雨予報の継続性・全フレーム保存研究（2026-11-28）
#109固定HEAD 6e650705260825c33a9905bbd3802919ba341cc4、25変更パス。津南町#576/狐島#577旧予報復元不能、将来サンプル必要、旧CI未起動/容量運用未整備は当時のブロッカー。supabase/functions/_shared/forecastEvidenceCompact.ts e5f9ce3fdef8389b95328b6b88c98a04b73c7229 は全コマbase/valid/status/intensity/RGBA、COMPLETE/PARTIAL/MISSING、lib/research/severeRainConsistency.ts a028585b9c3e84e250dc5379cb4bfbf45be3f1d4 は同対象時刻の発表間継続性PERSISTENT/NEW/ABSENT/UNKNOWN、forecastEvidenceCapacity.ts f9f7f40dc8fb056ba3699f0cde34aee67bd1277c は件数×頻度×payload×保持日数、TOAST/index/WAL除外。main同パス3件404、別実装未照合。通知判定非接続、旧承認は今回の本番許可ではない。VISION-018/019/020関連、研究保全・終了保留。第34回保存再取得確認。次は現行診断保存と容量/継続性の後続照合。最新CI・実行・本番未確認。

### 現行実装照合 36：#109 診断保存と容量安全研究（2026-11-28）
main app/api/rain/route.ts 48c1b39c9d36f73256468c78457faa910da13adc にexpectedForecastFrames/forecastDetails、watch-rain/index.ts 42b2dddff7e91e8a468fc404f11fc0f52296a32e にdiagnostic object時全forecast base/valid/status/intensity/RGBA保存、null時null、insert結果未検査。#109の正常null時も保存/失敗監視とは同一でない。API正常時の実際のdiagnostic分岐・DB保存率は未確認。#109固定HEAD 6e650705260825c33a9905bbd3802919ba341cc4 のlib/research/forecastEvidenceRetention.ts 7d3f151d0062069dfcc938a520b1858ca242f0b1 は明示期限なしREVIEW、通知証拠/保全hold/旧schema KEEP、削除なし。forecastEvidenceFailureMonitor.ts 2752ecb3cf34178483245477d3079744cadeae10 は連続失敗とUNKNOWN区別、閾値未確定・非接続。容量監視/保全の研究資産、現行運用保証ではない。第35回保存再取得確認。最新CI・本番未確認。main・本番・終了操作なし。

### 現行実装照合 37：#109 容量実測と期間限定収集の研究保全（2026-11-28）
固定HEAD 6e650705260825c33a9905bbd3802919ba341cc4 のdocs/SEVERE_RAIN_CONSISTENCY_RESEARCH_20261101.md eaa879b6dd330bb14a25cd6bdce4f974d7359d7e 原本。旧11/2監査51031行/約16MB、直近24h3444行12地点、diagnostic非null0。合成JSONB SELECT測定6/12/18/30/60コマ1520/2864/4208/6896/13616B、7日換算34.9/65.8/96.7/158.5/313.0MiB。実ディスク増分ではなく旧実績と仮定を区別。旧正常diagnostic=null原因特定、7日保持は未決定。lib/research/forecastEvidenceBudgetGate.ts 1644943d82ad800e026d8dc61689c72d43286439 は欠測UNKNOWN、予算警告のみ、supabase/functions/_shared/forecastEvidencePilot.ts 3b271a6728b934a24b863aecf5f760abbd916fa4 は明示UTC期間最大24h、欠損/不正設定無効、8192B既定超過は全体拒否（コマ切捨てなし）。旧研究条件であり現在の承認・容量・稼働証拠ではない。第36回保存再取得確認。#109終了保留、次は他PR。最新CI・本番未確認、変更なし。

### 現行実装照合 38：#98 レーダー画像容量測定研究（2026-11-28）
#98固定HEAD 79b4bae479f9b39f48d9fbf0d1745944a3442804、11変更パス。docs/research/RAIN_TILE_BENCHMARK_RESULTS_20261029.md 01ed5586b67ecbea72dd55574fe858b48f3fe522 は人工256角PNG dry/scattered/noisy 334/708/98901B、19角PNG77/90/701B、RGBA1444B、zlib20/23/614B。JMA DNS失敗で実画像未測定、古いキャッシュを現在と扱わない。lib/weather/providers/jma/tileSizeCollector.ts 69f90baa40f75f382fb2d8d52ec22351eb5a26f7 は任意有効化・メモリ内最大1000件・base/valid/zoom/x/y重複排除・空平均null。main同パス2件404、別経路未照合。#99独立実況照合・現行画像archiveとは別の容量研究、VISION-018/015関連。第37回保存再取得確認、CI46157813156/preflight46157813138/inventory46157813149実行中、classification46157813194成功。#98終了保留、本番変更なし。
