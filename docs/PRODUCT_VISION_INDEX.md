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
