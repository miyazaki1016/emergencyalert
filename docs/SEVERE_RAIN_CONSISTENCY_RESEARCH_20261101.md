# 大雨予測継続性・保存設計（研究用、2026-11-01）

## 現状と制約
- 2026-10-31の SEVERE_RAIN #576（津南町）・#577（狐島）は、保存された気象庁ナウキャスト画像の中心画素で予測30〜50mm/h、対象時刻の実況はいずれも30mm/h未満。独立した地上雨量計による検証ではない。
- `rain_notification_evaluations` / `rain_evaluation_images` / `rain_area_shadow_results` は通知時点の一連の予測と後日実況の比較用。過去の異なる発表時刻の予測を比較する履歴としては不足。
- `rain_diagnostic_history` は存在するが、#576/#577の前回発表分の比較に使える完全なフレーム列は確認できなかった。
- 現行 `severeForecast` は未来の最大強度フレームを選択し、継続性を通知前に要求していない。

## 提案する保存単位（未実装）
- 地点ID、取得時刻、発表時刻（baseTime）、対象時刻（validTime）、予測状態（RAIN / NO_RAIN / UNKNOWN）、中心強度区分、中心画素、半径250m/500m/1kmの強雨占有率・利用可能画素率、元データ識別子・取得品質。
- 同一地点・同一発表時刻・同一対象時刻を一意に扱い、再取得と別発表を混同しない。
- 既存の画像・面判定データを再利用。画像バイナリの重複保存や無制限の保持を避け、保持期限と容量を事前評価する。
- 欠測・透明・雨なしを分離。発表時刻と対象時刻の整合性を確認し、通知後の再取得画像を「通知時点の原本」と断定しない。

## 研究用判定
`lib/research/severeRainConsistency.ts` は同一対象時刻に対する最新と前回の発表を比較し、PERSISTENT / NEW / ABSENT / UNKNOWN を返す。通知判定とは未接続。前回の対象時刻が未取得なら UNKNOWN とする。

## 検証計画
1. 現行診断と保存テーブルのデータ重複・容量・RLSを監査。
2. 通知に影響しない履歴収集の設計とテスト。DB変更・デプロイは別途レビュー。
3. 強雨の真陽性・偽陽性・見逃し・通知遅延を、予測リードタイム別（0〜30分、35〜60分）、急発達型・移動型、面積別に比較。強雨の真陽性データが集まるまで通知抑制ルールを本番適用しない。
4. #576/#577は予測と実況の既存画像を可視化し、1km外の雨域移動は別途広域データがない限り断定しない。

## 安全境界
本PRは研究用純粋関数・テスト・設計文書のみ。watch-rain、Push、Edge Function、本番DB、通知閾値には変更を加えない。

## 本番READ ONLY監査追記（2026-11-01）
- PR #109 の最新確認時、GitHub Actions verify / phase1-feedback-http / phase1-feedback-rls / rain-delivery-concurrency は全てsuccess。初回CIで発生したJMA日時パースの6件失敗は修正済み。
- `rain_diagnostic_history` は照会時46,214行、うち `diagnostic IS NULL` が45,913行、`diagnostic.forecastDetails` が空でないものは17行のみ。最終該当時刻は2026-10-27 01:05 JST。つまり現状の診断履歴だけでは発表別の継続性評価を再現できない。
- `rain_evaluation_images` は603行・約1.4MB、`rain_area_shadow_results` は42行・約520KB、`rain_diagnostic_history` は約14MB（照会時点）。件数は稼働中に変化する。
- `watch-rain/index.ts` のコード上は予測フレームを `diagnostic.forecastDetails` に付加してinsertする。ただし本番の保存行にほぼ反映されていないため、稼働版との不一致・APIが返すdiagnosticの形・書込経路をREAD ONLYで切り分ける必要がある。原因未確定。
- このギャップが解決するまで、既存診断履歴を予測継続性の証拠とみなさない。次の実装は新規DB書込ではなく、まず記録経路・スキーマ・保持期限の監査を優先。

## 原因特定（本番Edge Function v35・main APIのコード突合）
- 本番 `watch-rain` v35 の保存処理は `rain.diagnostic` がオブジェクトの場合にのみ `forecastDetails` を追加する。 `rain.diagnostic === null` なら `diagnostic: null` をそのまま保存する。
- `app/api/rain/route.ts` は `interpretationEnabled === true` の正常系で意図的に `diagnostic = null` とする。つまり正常に雨判定できた回ほど予測履歴が残らないのが直接原因。GitHub/mainと稼働Edge v35のこの分岐は一致する。
- APIのトップレベル `forecast` は正常系でも返されているため、記録処理を `diagnostic` の有無から独立させれば予測フレームを保持できる。欠損・期待フレーム数の不明は別状態として扱う。
- 研究用の `lib/research/forecastEvidence.ts` と6テストを追加。現行APIでは正常系のexpectedFramesがトップレベルに出ないため、研究関数が正常系を `PARTIAL / EXPECTED_COUNT_UNKNOWN` と返すのは意図的。 `COMPLETE` と確定するにはAPI契約に期待件数を追加するか、JMA系列の仕様・検証済み期待値を参照する必要がある。
- **未実装**: 本番保存経路の修正、APIのexpectedFrames追加、DBスキーマ変更、バックフィル、デプロイ。安全な書込先・保存量・個人位置情報保護を別PRで確認してから実装。

## 完全性の確認と実装準備（追記）
- 本番DB直近24時間の診断履歴は3,775件・15地点で、全件 `diagnostic IS NULL`。これは雨情報APIが正常時に診断をnullにする設計と整合。正常系の予測履歴は現在の診断テーブルから再現不能。
- JMAプロバイダー `getForecastSeries` はすでに `expectedFrames: targets.length` を取得している。APIは現在、正常系レスポンスにこの値を公開していない。**最小変更案**: `app/api/rain/route.ts` のレスポンスへ `expectedForecastFrames: forecastSeries.expectedFrames` を追加。既存 `diagnostic` の正常時nullという意味は変えない。
- `watch-rain` 側は診断の有無とは独立して `forecast` と期待件数を読み取り、`COMPLETE / PARTIAL / MISSING` を明示して保存する。取得失敗や未知画素はフレーム件数が揃っても `PARTIAL`。この状態分類を研究関数に追加しテストする。
- **データ保持案**: 全地点・全発表回の長期無期限保存は避ける。まず短期（例: 7日）のフレーム系列と、通知発生時・強雨予測発生時の検証用証跡を分ける。7日は未決定の仮置き。容量・期限・地点プライバシー・RLS・既存クリーンアップの調査後に決定。
- `rain_diagnostic_history` は14MB、`rain_evaluation_images` 約1.4MB、`rain_area_shadow_results` 約520KB（監査時点）。既存診断テーブルへ毎回フレーム配列を付加すると容量が急増する可能性があるため、保存先と必要粒度を先に測定。
- **本番実装前の受入条件**: 正常時にも記録される、期待フレーム数一致、取得失敗・未知画素の欠測扱い、発表時刻と対象時刻の保持、重複取得時の一意性、保持期限、通知経路への非干渉、RLS、負荷試験、過去の正しい大雨を見逃さない評価。

## API契約の研究ブランチ実装
- 正常時のAPIレスポンスに `expectedForecastFrames` を追加（プロバイダーの既存 `forecastSeries.expectedFrames` を転送）。既存の `diagnostic`、`interpretation`、通知条件は不変。
- 研究用 `extractForecastEvidence` はトップレベルの期待件数を優先し、診断の期待件数は後方互換のためのフォールバックとする。正常時の完全性判定と件数不一致のテストを追加。
- **注意**: このPRはDraft。VercelのPreviewが自動生成される可能性はあるが、本番環境へのデプロイ・DB保存経路の変更は未実施。実際の保存・保持期限・容量・権限は別途検証が必要。

## 保存経路の研究ブランチ実装
- `supabase/functions/watch-rain/index.ts` の履歴保存を修正し、正常時にAPIの `diagnostic=null` でも `forecastDetails` を履歴JSONへ記録する。追加の通知判断・Push経路変更なし。
- `forecastEvidence` に `state`（COMPLETE/PARTIAL/MISSING）、期待件数・受信件数・利用可能件数を格納する。APIが未更新の場合は期待件数不明としてPARTIALとする。
- **容量上の注意**: 既存の `rain_diagnostic_history` へ全監視サイクルの予測配列を保存するため、このまま本番へ適用するとデータ量が増加する。保持期限・圧縮/間引き・必要な通知証跡の保護と、DB容量の見積もりが完了するまで本番反映不可。
- 本番Edge Functionのv35は未変更。研究ブランチでの静的変更のみ。CI確認後に、保存先・保持方針を決める。

## 保存容量・保持方針（本番適用前の設計ゲート）
- 既存の通知スナップショット／予測・実況画像は `rain_notification_evaluations` 等で管理され、90日保持など既存の別ルールがある。これらは変更しない。
- `rain_diagnostic_history` は通常の監視履歴で、現行データには正常時の `diagnostic=null` が多い。今回の研究コードは毎回の予測フレーム配列をJSONBに入れるため、単純に90日保持を流用しない。
- 概算の母数：15地点 × 288回/日（5分間隔）= 4,320履歴行/日。1行当たり追加予測JSONが1KBなら約4.3MB/日・30日で約130MB、3KBなら約13MB/日・30日で約390MB（JSONB圧縮・インデックス・実際の監視回数は別）。**実測値ではなく容量検討用の仮定**。
- 推奨：通知の不変スナップショットを優先保護し、全監視予測の高頻度履歴は短期（候補7日）で保持する。長期の分析には、同一有効時刻に対する発表時刻別の予測差分と完全性メタデータを抽出した軽量サマリーを別途検討する。保存前に対象件数・1行のJSONBサイズ・既存cron/retentionの有無を本番読み取り専用SQLで測定する。
- **本番適用の必須条件**：①保存容量の実測と上限、②既存履歴を誤削除しない対象範囲、③保持処理の排他・失敗時挙動、④研究データの完全性と再取得不能時の区別、⑤通知・Pushの回帰テスト、⑥新規保存から検証UIまでの導線。満たすまで本番DB migration/cleanup/Edge deployはしない。
- 本番変更前の段階では、既存データの一括削除・テーブル全体への保持期限の後付けはしない。

## 2026-11-02 本番DB読み取り専用・実測
- `rain_diagnostic_history`: 51,031件、テーブル+インデックス合計約16MB。既存の `diagnostic` 非nullは301件、非null時の平均JSONBサイズは204.6 bytes。最古2026-09-26、最新2026-11-02。**この平均は新しい予測フレーム配列のサイズを表さない**。
- 直近24時間: 3,444件／12地点／`diagnostic` 非null 0件。直近7日24,180件、30日47,821件。実際の稼働地点数・実行回数は変動するため15地点の概算とは区別。
- 現在のcronジョブ名と頻度: watch-rain 5分、evaluate-rain 5分、archive-rain 1分、shadow-rain 5分。確認できたジョブ一覧に診断履歴専用の保持処理はないが、DB関数や別経路の全保持処理を否定するものではない。
- **未確認**: 新形式の実測1行サイズ、容量上限、保持処理の完全な所在。研究用の保存コードをそのまま本番へ適用しない。古い診断履歴は残す。

## 2026-11-02 追加：保存サイズの非破壊ベンチマーク
- 本番DBで **SELECT内のjsonb_build_objectとpg_column_sizeのみ** を使い、合成フレーム6/12/18/30/60件の新しい `diagnostic` 構造（`forecastDetails`＋`forecastEvidence`）を測定。保存・更新・削除なし。
- 6件: 1,520 B/行・直近24時間の3,444行換算で約4.99 MiB/日（7日約34.9 MiB）。
- 12件: 2,864 B/行・約9.41 MiB/日（7日約65.8 MiB）。
- 18件: 4,208 B/行・約13.82 MiB/日（7日約96.7 MiB）。
- 30件: 6,896 B/行・約22.65 MiB/日（7日約158.5 MiB）。
- 60件: 13,616 B/行・約44.72 MiB/日（7日約313.0 MiB）。
- **注意**: これは代表値を模した未圧縮の合成JSONBサイズであり、実際のフレーム数・TOAST圧縮・ページ・インデックス・データの重複排除を含めたディスク増分ではない。実際の取得済みAPI応答からの測定は未実施。
- 実DBのSQL関数一覧では診断履歴専用のretention名は見当たらず、cron一覧にも専用ジョブはなかった。ただし全削除経路の不存在を証明したわけではない。
- **設計判定**: 7日保持でも大量になる可能性がある。研究用の毎回全フレーム保存コードをこのまま本番反映しない。既存通知スナップショットと保存領域を競合させないため、独立した容量予算・期限と、期限切れの削除対象を明示する実装および負荷テストが必要。短期解析に必要な予測発表の連続性を失わせない間引き条件も必要。
- 直近head `ee4a5407` のGitHubチェック verify/classify/feedback/競合/Preview は全件成功を確認。新しい文書追記に対するCIは別途確認。

## 2026-11-02 コンパクト化実装（Draft PR内、本番未反映）
- 保存容量試算を受け、**全フレームを毎回大きなJSONオブジェクトの配列にする研究実装を置き換え**。`supabase/functions/_shared/forecastEvidenceCompact.ts` に、各フレームを `[baseTime, validTime, status, intensityClass, [r,g,b,a] | null]` の順序固定タプルで保存する `packForecastEvidence` を実装。スキーマバージョン1、期待件数、取得件数、利用可能件数、COMPLETE/PARTIAL/MISSINGと判定理由を付ける。
- 読み戻し側は `diagnostic.forecastEvidenceCompact.frames` を上記タプル順で解釈する。**予測発表時刻・有効時刻・雨量区分・RGBA・失敗状態は欠落させず、時刻間引きもしない**。透明なNO_RAINと未知・取得失敗を区別する。
- `watch-rain/index.ts` の研究版は、正常系・診断nullでも `forecastEvidenceCompact` を記録。古いエラー時診断の各キーは保持。通知条件・Push意思決定は参照しない。旧 `forecastDetails` 新規書込はやめる（過去データの削除はしない）。
- 上記エンコードの単体テスト8件を追加。**CIの結果を確認するまで成功扱いにしない**。
- 未解決：実運用データの圧縮後サイズ、短期保持の実装、重複発表の扱い、期限切れ削除の安全条件、研究表示の読み戻し。**本番適用不可**、DB変更・本番Edge deployなし。

## 2026-11-02 コンパクト版の計測・回帰テスト修正
- Draft head `d3ff7690` のCI `verify` は **9件失敗**。新しい共有関数 `packForecastEvidence` をソース文字列から実行する既存テスト `tests/replayWatchIntegration.test.ts` に注入していなかったのが原因（監視ワーカーの実運用失敗ではない）。統合テストの注入設定を変更し、再実行結果を待つ。
- 本番DBの読み取り専用 `SELECT` で旧JSONBオブジェクト形式と新タプル形式を同じ合成フレーム値で比較。6枚: 1,400→936 bytes（33.1%減）、12枚: 2,624→1,656 bytes（36.9%減）、18枚: 3,848→2,376 bytes（38.3%減）、30枚: 6,296→3,816 bytes（39.4%減）、60枚: 12,416→7,416 bytes（40.3%減）。
- 実際の取得フレームでなく合成値のJSONBデータサイズ。TOAST圧縮・インデックス・ページ・保持コストは未計測。通知スナップショット・既存画像・過去診断は変更しない。

## 2026-11-02 読み戻し・破損検知
- 直前のPR head `a3a8e861` は verify / classify / feedback HTTP / feedback RLS / delivery concurrency / Vercel Preview Comments 全成功。
- `unpackForecastEvidence` を研究用共有ヘルパーへ追加。`schemaVersion=1` のみ復元し、発表/有効時刻・RGBA・雨量・取得失敗を元の順番で再構成する。フレーム要素数・RGBA 0〜255・期待件数・受信件数・完全性判定が矛盾するデータはnullを返して拒否する（「雨なし」にはしない）。
- 往復変換・取得失敗・互換性外バージョン・破損データ・偽装完全性の追加テスト4件。研究コード内だけの読み戻しであり、本番UIへの接続や本番保持期限の設定ではない。最新CIは要確認。
- 保存期限の候補7日については **既存診断テーブルの過去データを一括削除する仕組みは追加しない**。対象を新形式の証跡だけに限定する方法・容量上限・UIで必要な比較窓を先に決めてから保存先と削除処理を実装する。

## 2026-11-02 保持期限の判定ゲート（研究関数のみ）
- 過去の CI `c002356c` は `unpackForecastEvidence` の重複宣言による構文エラー。別作業の同ブランチ更新と競合していたため、現在の共有ファイルを再取得したところ、宣言は1箇所に整理されていた。新headのテストで再確認する。
- `lib/research/forecastEvidenceRetention.ts` に純粋関数 `classifyEvidenceRetention` を追加。schemaVersion=1の研究用証跡のみを対象とし、レガシー診断・通知に紐づく証跡・保全指定中のレコードは KEEP。期限なし、日時破損、期限逆転は REVIEW とし、削除候補にしない。期限到達した独立証跡だけ ELIGIBLE。
- `tests/forecastEvidenceRetention.test.ts` に期限境界・旧形式保護・通知保護・保全指定・不正時刻の6テストを追加。削除のSQL/cron/Edge連携は **一切追加していない**。
- 7日という期間は引き続き候補段階。実際の期限列・保存場所・監査ログ・DB権限・誤削除対策の設計が確定するまで本番 cleanup は実装しない。

## 2026-11-02 新規：保存済み系列→強雨継続性への研究用再生
- `lib/research/forecastHistoryReplay.ts` に `compareStoredForecasts` を追加。保存済み `diagnostic.forecastEvidenceCompact` を版管理付きで復元し、**同一対象時刻の発表更新**に渡す。対象地点IDを必須とし、他人・他地点の系列を混ぜない。 `checkedAt` が比較基準より後の記録を使わない。
- データ不足・版違い・不正JSON・取得失敗は「降っていない」に置き換えず UNKNOWN。利用できたスナップショット数・欠落数・COMPLETE数を返す。
- `tests/forecastHistoryReplay.test.ts` に持続強雨、初回強雨、地点分離・未来データ除外、欠測/壊れた版を試す4テストを追加。通知処理・本番UI・保存先には非接続。
- **未解決**: 保持期限用の専用保存領域、実取得データでの再生、時刻重複の厳格な排除、データアクセス権限、履歴可視化。CI未確認の間は合格扱いにしない。

## 2026-11-03 保持期限の本番スキーマ適合チェック
- head `ab5b2457` のCIは verify/classify/feedback HTTP/RLS/delivery concurrency/Preview全成功。
- 本番の `rain_diagnostic_history` 列を読み取りで確認。列は id/target_id/checked_at/source_valid_at/interpretation_enabled/event_type/urgency/current_status/diagnostic/created_at/current_rgba。**証拠専用のexpires_at、保全フラグ、通知評価との確実な連結は存在しない**。
- `inspectStoredEvidenceRetention` を追加。実在の履歴形式から新形式の存在だけ認識するが、専用期限・保全情報が未確認なので自動削除候補には絶対にせず REVIEW を返す。旧形式・不明バージョンは KEEP。テスト2件を追加。
- **安全判断**: 7日経過を `checked_at` から推測して歴史データを削除しない。独立の期限・通知証拠保全・容量予算・監査ログが備わるまで本番cleanupを導入しない。研究コードはDraft PRのみ。本番変更なし。

## 2026-11-03 重複取得・矛盾フレームの安全判定
- head `ad5c4026` のGitHubチェック（verify/classify/feedback HTTP/RLS/delivery concurrency/Preview）は全て成功。
- 同一の発表時刻＋有効時刻の予測は監視cronにより複数回取得される。過去の研究関数は同一発表時刻で矛盾するRAIN/NO_RAINや異なる雨量区分を含むと「一つでも強雨なら強雨」と判定していた。
- `analyzeSevereConsistency` を変更し、同一発表＋同一対象時刻で一致する重複は1発表として扱い、矛盾する取得結果やRAINの雨量区分欠落はUNKNOWNとして扱う。重複ポーリングだけでPERSISTENTを作らず、欠損・矛盾からNEWを作らない。
- 正常な重複、矛盾する最新・直前発表、区分欠落の4テストを追加。**これらは研究分析のみ**で通知判定には未接続。最新CIは要確認。

## 2026-11-03 取得時刻と発表時刻の整合性
- head `619d4731` のCIは verify / phase1-feedback-http / phase1-feedback-rls / rain-delivery-concurrency / classify が全件成功。
- 研究用 `compareStoredForecasts` は履歴の `checkedAt` をasOfで切っていたが、フレームの `baseTime` が実際の収集時刻より未来でも通していた。発表時刻が収集時刻を超えるものは証拠として使わないようにした。
- 異常な未来発表を除外するテスト、通常の収集時刻の連続予測が維持されるテストを追加。保存・通知・Pushには影響しない。最新CIは未確認。

## 2026-11-03 完全性判定の追加監査
- head `fc003fa0` のCI verify / phase1-feedback-http / phase1-feedback-rls / rain-delivery-concurrency / classify は全成功。
- 実装照合で、`status=RAIN` かつ `intensityClass=null`、またはRGBA欠損を持つフレームが枚数一致だけでCOMPLETEになる余地を発見。実際のJMAプロバイダーは透明(NO_RAIN)にもRGBAを返すため、画素が欠けた場合は証拠を不完全として扱うべき。
- `packForecastEvidence` と `extractForecastEvidence` を一致させ、雨量区分のないRAIN、RGBA欠損・RGBA異常値を `PARTIAL / INCOMPLETE_FRAME_EVIDENCE` とする。フレーム自体は保持し、欠損をNO_RAINへ置換しない。正常なRGBA付きの雨・透明NO_RAINはCOMPLETEのまま。
- 追加の回帰テストを作成し、旧テストの「RGBAなしでもCOMPLETE」という不適切な期待値を修正。本番通知・Push・DB・Edge Functionは未変更。最新CI結果の確認が必要。

## 2026-11-03 保持期限の安全な棚卸し（非破壊）
- head `ab9dcd34` のCI verify / classify / phase1-feedback-http / phase1-feedback-rls / rain-delivery-concurrency は全件成功。
- `summarizeEvidenceRetention` を追加。実DBに存在する `checked_at` と `diagnostic` だけを入力とする純粋関数で、KEEP/REVIEW/ELIGIBLEの件数を計算する。DB接続・DELETE/UPDATEは一切持たない。
- 期限・保全情報が無い現在のスキーマでは新形式でも REVIEW、旧形式・不明版は KEEP となり、ELIGIBLE は0件のはず。単体テストで確認する。
- 次の本番導入判断には専用の有効期限・通知関連証拠保護・容量上限・保存エラーの可観測性が必要。**現行の履歴テーブルを7日で一括削除しない**。この追加変更のCIは未確認。

## 2026-11-03 保存容量の明示的な試算
- head `04ec017d` のCI verify/classify/feedback HTTP/RLS/delivery concurrency 全成功。
- `projectForecastEvidenceCapacity` を追加。地点数・地点別日次取得回数・1件あたりJSONB bytes・候補保存日数・予算を**明示的な入力**として扱う純粋関数。DB更新や削除はしない。
- 合成12フレームの1656 bytes、12地点×288回/日なら5,723,136 bytes/日、7日40,061,952 bytes（約40.1MB、10進表記）。14日では約80.1MB。50MBの仮予算なら7日内、14日超過となる。**実運用サイズではなく、TOAST・WAL・インデックス・JSONB圧縮・行オーバーヘッドを含まない**。
- 無効な入力と数値オーバーフローは拒否。保存期間や予算は未承認の仮定であり、容量管理や自動削除は本番未実装。最新CIは要確認。

## 2026-11-03 証拠保存エラーの検知（本番未適用）
- 容量試算テストを含むhead `99e1a0c1` のCIは成功。ドキュメント追記後のhead `e7408fa0` は当該headのcheck-runが確認できなかったため成功扱いしない。
- 研究ブランチの `watch-rain` で `rain_diagnostic_history.insert` の戻り値 `error` を確認し、失敗時に `RAIN_EVIDENCE_HISTORY_WRITE_FAILED` の識別子、エラーコード、スキーマ版、フレーム数のみをログに出す。位置・予測画像・個人識別子はログに含めない。
- 証拠履歴の書き込み失敗を通知の失敗と混同しない。**通知・Push処理を止めない**。実ワーカーを動かす統合テストで診断履歴だけを失敗させ、Push継続と警告ログを確認する。
- 未解決: 監視アラート閾値、容量超過時の制御、データ欠落のバックフィル、保護期間。研究ブランチのみ。本番Edge deploy・DB変更なし。最新CIは要確認。
