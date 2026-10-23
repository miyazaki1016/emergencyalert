# 🚨🚨🚨 ソラへの最重要指示：「りょ」＝「どんどん進めて！」 🚨🚨🚨

> **ユーザーが「りょ」と返したら、単なる「了解」ではなく「承認・了解したので、次の作業をどんどん進めて」の意味。**
>
> **次のソラは「りょ」を受けたら、確認の返事だけで止まらず、直前に合意した作業を実際に進めること。** 調査ならGitHubを読む、実装なら許可された範囲で作業する、検証なら結果を確認し、具体的な進捗・成果を返すこと。
>
> **ただし安全上・運用上の承認は別。** 「りょ」だけで本番デプロイ、PRマージ、本番DB変更、秘密情報の操作、費用発生など、明示承認が必要な変更を許可したものとはみなさない。作業範囲が不明な場合のみ必要な確認をする。
>
> **このルールはチャットをまたいで引き継ぐこと。** 2026-10-16 ユーザー明示指示。

---

## ☔ 2026-10-23 重要・未統合研究の所在：雨域密度・歯抜け解析

> **新しいチャットのソラへ：この研究はmainにまだ統合されていない。存在を見落とさず、次の作業で必ず研究ブランチを確認すること。** この節は引き継ぎ用の所在台帳であり、研究コードのmainマージ・本番適用を意味しない。

- **ユーザー方針**：時間をかけて全国の実雨雲データを調査する。アメふるの予測エンジンの核心となり得る優先研究。研究成果・失敗例・検証条件を必ず記録する。
- **研究ブランチ**：`research/rain-field-morphology-20261023`（GitHub repo `miyazaki1016/emergencyalert`）。
- **研究計画**：同ブランチの `docs/research/RAIN_FIELD_MORPHOLOGY_PLAN.md`、初版コミット `6d47c49b5e3edd000d034a5d36d16af8390d9f1f`。
- **研究ブランチ側の詳細台帳**：`docs/PROJECT_OVERVIEW.md`、追記コミット `7721090bbb8ab43ff23d856967225b963b854079`。
- **内容**：1〜5mm/h、5〜10mm/h等の雨量階級ごとに、地点中心250m/500m/1km/2kmで雨域占有率・連続性・歯抜け・時間変化を比較し、独立した地上観測と照合して現行判定からの改善を検証。欠損/不明を雨なしとみなさない。
- **現在地**：研究計画・ブランチ作成と保存確認まで完了。全国実データ取得、解析、精度評価は**未実施**。既存Push/DB/本番判定は変更しない。
- **再開の一手**：研究ブランチの計画と台帳を読む → 現行雨雲処理のソース・JMAデータ形式/取得条件を監査 → 再現可能な小規模実データ解析 → 全国へ拡張。各作業単位でGitHubに結果と次の一手を保存する。main統合・本番変更は別途確認する。



# ☔ 最優先・新チャット引継ぎ正本 — アメふる／サキクル（2026-10-23）

> **次のソラは必ずここから読む。** この項目が2026-10-23時点の最新情報。以降の2026-09-20〜10-22の古いチェックポイントは設計史であり、そこにある「未実装」「本番未反映」「PR Draft」は当時の状態であって、最新状態ではない場合がある。
>
> **開始手順**：①この総覧（特にこの節）を読む → ②GitHubのmain HEAD、開いているPR/Issue、CIを実際に確認 → ③Vercel production SHA/READYを照合 → ④Supabaseの変更が必要なら対象プロジェクトを明示して読み取り専用で現況照合 → ⑤前のチャットで合意済みの次の作業を進める。新チャットで背景を一から聞き直さない。
>
> ユーザーの「りょ」は「了解、どんどん進めて」の意味。ただし危険なDB変更、Push/Edge workerの変更、取り返しのつかない削除、明示承認が要る本番操作の**包括承認ではない**。作業結果は推測ではなく現物・CI・デプロイ状態で確かめる。実機操作はユーザーのスクショ確認が必要。

## A. 現在地（2026-10-23確認）

- 正しいGitHubリポジトリ：**miyazaki1016/emergencyalert**（Misaki = miyazaki1016/misaki は**完全に別案件、触れない**）。
- 正本：この **docs/PROJECT_OVERVIEW.md**。過去の引継ぎ／監査、実装史、設計資料もこの正本に紐づけて位置づける。mainに存在する詳細：
  - docs/MY_RAIN_FEEDBACK_PHASE1_CHECKPOINT_20261021.md（**当時の未反映記述は歴史**）
  - docs/MY_RAIN_OBSERVATION_TIME_STAGE_20261022.md（**当時のPR #71 Draft/未移行記述は歴史**）
  - docs/DECISIONS.md、docs/JMA_SOURCE_NOTES.md、docs/PNG_PALETTE_EVIDENCE.md など。
  - Push異常系詳細は **Issue #64** と **PR #63 側の資料**。PR #63の専用ファイルはmainにあると決めつけずそのブランチを読む。
- Vercelプロジェクト：**emergencyalert**、project ID **prj_LDqpPAqNGDaY4Aaix8ulwPc8oXmu**。公開例 https://emergencyalert-kishibojim.vercel.app/ （以前の emergencyalert-gilt.vercel.app も利用実績あり）。公開URLを独自の推測で変えない。
- 本番Supabase：**EmergencyAlert**、project ID **yqyevipvkdwmhcaxywes**。**MisakiのSupabaseに触れない**。Freeプラン2環境のためアメふる専用の3つ目を前提にしない。隔離テストはGitHub Actionsの使い捨てPostgreSQL 16＋PostgREST 12.2.3等。
- 確認したmain HEAD：**a4497b0857ac11402f903a97650376e87b34fa45**（通知ゼロ時の説明改善、2026-10-23）。このSHAのCIは成功、同SHAのVercel productionはREADYと照合。ただしこの引継ぎ保存後にHEADが進むので、次のソラは改めて照合すること。
- 直近の完了：PR **#65 #66 #68 #69 #71 #72** はmainにマージされ本番公開済み。最後に確認したiPhone画面では古い履歴を画面から整理し、**回答できる通知0／回答済み0／未回答0、新通知待ち**。**DBから削除していない**。
- **重要な残作業：PR #73 がDraft・未マージ**（branch **fix/archived-history-beyond-seven-days-20261023**）。「過去の通知を見る」は現行コードでは直近7日間の取得結果の範囲にとどまるため、7日より古い保管履歴を見直せない不具合の修正。#73は最大200件の過去配信履歴を本人RLSで再取得する提案。**いま本番に入っているとは報告しない。** まず差分とCIを確認する。
- 未マージのほかのPR：**#63**（第2段階のPush配信・詳細判定根拠。触らない）、**#62**（JMA Z4 stride-2検証）、**#61**（LIVE JAPAN体験試作）、**#60**（美咲との連携契約*案*）、**#59**（全国強雨スキャン試作）、**#25**（JMA early live smoke test）。いずれも勝手に本番へ統合しない。連携案のPRでもMisaki本体は改修対象外。
- 未完Issue：**#70**（観測時刻を使った通知早い・遅いの検証。時刻記録の実装自体は#71で完了、将来の予測対象時刻保存・根拠照合は未完）、**#64**（Push/DB障害・重複・クラッシュ対策の後日必須バックログ）。

## B. アメふる／サキクルの思想（絶対に残す）

- **「暮らしを、少し先回りする。必要な人に、必要な情報を、必要な時に。必要でなければ、静かに見守る。」**
- **「あなたの場所の、これからを見張る。」** ／ **「降りそうは早く、やみそうは確実に」**。
- 旧来は「アメくる？2026」、再始動で「アメふる」、コンセプト「サキくる／サキクル」。防災一辺倒ではなく、洗濯物を取り込むような生活目線の優しい見守り。現在は「降るよ（早め）／やみそう（確実）」を大切にする。
- **自前で気象予測しない**。気象庁等の確かな発表・観測を正本にする。Official source → interpretation → semantic event → UI/Push/他サービス。AIが雨雲の動き、mm/h、時刻、危険度を創作・補間しない。
- **UNKNOWN_PIXEL ≠ NO_RAIN、FETCH_ERROR ≠ NO_RAIN、NO_DATA ≠ SAFE**。まばらな雲・微量雨1〜5mmが難所。30mm以上の強雨は一致しやすかったユーザー体感あり。羽田で「やみそう」通知なのにその時点で降っていなかった事例を検証する。単に1枚乾燥フレームで「止む」と断定しない（根拠の連続性、欠損の扱いを守る）。
- 判定する範囲を地点中心の半径1kmなど選べる構想、ユーザーの移動方向推定、強雨時に雨雲画像・前後フレーム、サイトではGIF／SNSではMP4という過去の経験、浸水リスクは外部の確実な情報を使うことなどを保全。**構想＝実装済みではない**。
- 観測時刻、通知時刻、予測対象時刻、入力時刻は意味が異なる。**「すでに降っていなかった」だけで通知が遅いと断定しない**。予報根拠／目標時刻が古いPush履歴にないため、現状は予測的中率を算出しない。
- 体験は短く使いやすく。開発段階は機能優先、運用セーフティネットはIssue #64に保全してリリース前に回収。過剰な障害対策調査で機能開発を止めない。

## C. 2026-10-19〜23：実装・本番公開・iPhone実機の確定した開発史

### 第1段階：届いた通知に「実際はどうだった？」（PR #65）
- もともとのnotification_deliveries配信成功レコードを利用し、**自分の配信済み通知**だけを最近7日・上限200件まで取得して回答。雨の到来／停止に応じた4択：「降った／降らなかった／すでに降っていた／わからない」「止んだ／止まなかった／すでに降っていなかった／わからない」。否定回答は通知から1時間経過後に限定する暫定仕様で、**精度の確定判定には使わない**。
- DB：public.rain_notification_feedback（notification_id bigint PK/FK → notification_deliveries.id ON DELETE CASCADE、owner_id UUID、actual_weather、updated_at）。RLS本人だけSELECT/INSERT/UPDATE（匿名Supabase Authユーザーもauthenticated DBロール）。**DELETE権限なし**。Push worker／既存配信制約に変更なし。
- 位置の説明は端末現在地ではなく**通知のwatch_targets.target_id**。削除済み地点等は推測せず「登録地点（名称を確認できないよ）」。地点別絞り込み、回答済／未回答、回答変更、ハッシュ #rain-feedback-ID の画面内リンク、手動再取得。
- CI：vitest、使い捨てPostgresのRLSテスト、使い捨てPostgRESTの本HTTP・別所有者拒否テスト。PR #65 main取り込み **8078b4ec79f21122020b6a5587f4d1586f0be0ee**。ユーザー承認後に本番DBとUI公開。
- iPhoneで11件表示を確認。羽田空港の通知ID **209**（2026-10-21 00:40 JST）へ「わからない」を登録し、DBにUNKNOWN保存と再読み込み後の表示を確認。Issue **#67** はこの実機エンドツーエンド確認でclosed。

### UIを小さく改善（PR #66 / #68）
- 11件すべてを最初から展開するのは長すぎた。PR **#66** で初期**2件**・「もっと見る」で**5件ずつ**追加。マージ **d533960f4fa5f594ee72e47ae0caacdfd7916b27**。
- PR **#68** で通知カードの詳細を**タップで開閉**。回答済み状態・地点・通知時刻をコンパクトに表示し、過去の回答ボタンと説明は展開時のみ。リンク指定の通知は自動で開く。マージ **b8d38a7365a7dc84c91cec89343db232977dc7e1**。CI成功・本番READY、iPhoneスクショで実動作確認。

### 回答の内訳表示（PR #69）
- 本人が報告した天気を「雨が降った／続いた」「降らなかった／止んだ」「確認時すでに変化」「わからない」に数え、登録地点で絞り込む。予測の的中率とは呼ばない。
- PR **#69** マージ **e67c61b418983c358a84f1306221ddb43c9e6add**、CI成功、本番READY。
- iPhoneスクショで「回答できる通知11件／回答済み2件／未回答9件」、内訳「すでに変化1・わからない1」を確認。

### 観測日時の区別（PR #71、Issue #70の一部達成）
- 新しい本番カラム：**observed_at timestamptz NULL** と **observed_time_source text NOT NULL default UNKNOWN**。値は UNKNOWN／AT_RESPONSE／RECALLED。時刻と根拠が食い違わないCHECKを追加。過去の回答はobserved_at=NULLで保全し、updated_atから偽の観測日時を作らない。
- UI：「覚えていない・確認していない」「今、その場所で確認した」「以前に確認した（日付・時刻入力）」。入力しなくても回答可能。過去時刻は端末のローカル時刻からISOへ変換。未来や30日以上前の入力は拒否。回答だけ変えるときは古い観測日時を維持し、入力を本人が消した場合は黙って元に戻さない。時刻だけ保存可能。
- 観測時刻あり／なしの件数、配信から観測までの経過（例：通知から47時間55分後）を表示。ただし**通知の遅い・早い、予測の的中を断定しない**。登録地点と現在地を混同しない。
- ユーザーがDB2カラム追加＋PR本番公開を明示承認。**本番DBの事前確認→migration rain_feedback_observation_time_20261022→既存回答2件保持・RLS/CHECK確認→PR #71 squashマージ** **d3c02577db11ce7eab7f3c781d7a1f6ba9911c0a** → Vercel READY。Push worker/旧CHECKは未変更。
- iPhone実機：2026-10-20 17:15の自宅「やみそう」通知に対し「止んだ」、10/22 17:10に「今、確認」と入力。画面に**通知から47時間55分後**が表示。Supabase読取で観測時刻が1件追加されていることを確認。PWAを開き直しても「止んだ／回答時に確認10/22 17:10／47時間55分後」が復元。**保存→DB→再読込のE2E成功**。ただし当人が通知対象地点を本当にその時刻に目視したかの事実までは検証していない（テストの可能性がある）。品質評価データに無条件で使わない。

### 古い通知の「削除せず画面だけリセット」（PR #72）
- ユーザーは古いデータを消すか相談。方針決定：**配信通知、回答、日時はDBに残して保管し、iPhoneの画面だけ新しい検証スタートへ切り替える**。元データを完全削除しない。
- 読取時の2026-10-22の規模：notification_deliveries **130件**、直近7日**11件**、rain_notification_feedback **3件**（ALREADY_DRY 1、UNKNOWN 1、STOPPED 1）、うち観測日時あり**1件**。直近7日件数は時間と共に変わる。これらは**当時のスナップショット**であり現在値と決めつけない。
- PR **#72**：ブラウザlocalStorageにSupabaseユーザー別の**整理境界日時**を保存。境界以前を画面で隠し、それ以後の新規配信だけ表示。**「ここまでの通知を画面から整理」「過去の通知を見る」** を追加。通知タップのhash直リンクで昔のものも開ける設計。整理は端末・ブラウザ固有、他端末と共有されない。**DBのDELETE、worker、Push、スキーマの変更なし**。マージ **8be4f0042b416543be7fb068706da6f1f1c9629d**、CI成功・Vercel READY。
- iPhoneスクショ2026-10-23 08:29頃：**回答できる通知0／回答済み0／未回答0、過去の通知を見る（直近7日で10件）、🌱整理後の新しい通知はまだない**。画面リセットの実機動作を確認。**これはDBの履歴が空になったことを意味しない**。
- 続けてmainにコミット **a4497b0857ac11402f903a97650376e87b34fa45**：0件時の説明文を「新しい通知が届いたら…」へ改善。CI success・Vercel READY。ただしこの文章改善のiPhoneスクショは未取得。
- **未解決UX・PR #73**：現在mainでは履歴表示の元データを最近7日に絞って取得するため、過去を見るボタンでも7日超の記録を拾えない。#73は本人RLSのまま最大200件の古い配信を読めるようにするDraft。最新差分/CIを見て進めること。**過去記録を残したこと**と**無制限に全件閲覧できること**は別。ユーザーに「すべての130件を画面でいつでも見られる」とは約束しない。

## D. 検証の定義：何が成功し、何が未検証か

- 成功した：アプリPWAの通知履歴表示、地点別表示、回答保存/変更/再読み込み、実時刻記録/再読み込み、回答件数集計、2件折りたたみ、画面のみ履歴整理、GitHub CI（verify／RLS／PostgREST）、Vercel公開状態の確認。
- 誤解しない：UIスクショは実際の気象の正誤の証明ではない。「今、その場所で確認」はユーザーに本当に確認してもらったときのみ観測データとして扱う。7日履歴上限と最大200件には制限がある。新しい通知の予測ターゲット時刻・判断根拠は旧配信履歴にない。**的中率集計・早い／遅いの自動判定はまだ実装済みではない**。
- 未完：PR #73の安全な改善検証と反映判断、整理後に**新規Push通知が実際に届く→ユーザーが現地確認→回答と時刻が保全される**一連の新データ検証、早めの降るよ/確実なやみそうの根拠スナップショット設計、まばら雲・微量雨・地点半径の検証。
- データ保全：notification_deliveriesを直接DELETEするとフィードバックがFK ON DELETE CASCADEで消える。現行方針は**削除しない**。もし本当にDBの削除や保持期限変更の方針が出たら、バックアップ・参照関係・復旧手順と明示承認を先に検討する。

## E. 重要な技術ファイルと境界

- UI：**app/components/NotificationFeedbackHistory.tsx**、ホームのリンク **app/page.tsx**。
- 画面処理：**lib/weather/rain/feedbackPhase1.ts**（hash、絞り込み、件数、localStorage境界、カード展開）、**lib/weather/rain/feedbackPhase1Repository.ts**（本人セッションで回答の保存・取得）、**lib/weather/rain/feedbackObservationTime.ts**（時刻出典、入力検証、時間差）。
- SQL：**docs/sql/my-rain-feedback-phase1.sql**、**docs/sql/my-rain-feedback-observation-time.sql**。後者は2026-10-22の明示承認で既に本番適用済み。冒頭に「提案・未適用」と残る歴史的コメントだけを現在状態と信じない。
- Tests：**tests/feedbackPhase1.test.ts**、**tests/feedbackObservationTime.test.ts**、**tests/feedbackPhase1Repository.test.ts**、**tests/sql/feedback-phase1-integration.sql**、**tests/feedback-phase1-http.mjs**、**.github/workflows/ci.yml**。
- 主要DB：**watch_targets**（通知の登録地点）、**watch_states**（地点の監視状態）、**notification_deliveries**（実配信記録）、**rain_notification_feedback**（回答・観測日時）、**push_subscriptions**（Push購読）。Supabase Auth/RLSでユーザーを分離。現在地とwatch_targetは別概念。
- サーバ5分ごと監視／Web Push／気象解釈は現在稼働する既存実装。**フィードバック表示を直すためにEdge workerや配信ロジックを安易に変更しない**。Pushで古い行にDELIVERED_COUNT > 0 のDB制約あり。
- 新環境を追加できないため、破壊的に本番で試さずCIの使い捨てDB/HTTP上でRLSとマイグレーションを確認。Vercelビルド・GitHub Actionsが成功していても、本番iPhone実測は別ゲート。

## F. 別件として保留、混ぜない

### Issue #64／PR #63 — 配信障害対応は後日の必須作業
- Workerクラッシュ、cron競合、同じPushの二重送信、配信成功後のDB確定失敗、配信状態不明時の再送回避、outbox、購読別原子的claim、watch_states失敗時の扱いを総点検する必要あり。
- PR #63のpending方式は**本番notification_deliveriesの CHECK (delivered_count > 0)** と合わない部分があり、DB改修を前提にそのままWorkerを差し替えてはいけない。worker未接続の安全状態モデルや設計SQLは「完成／本番導入済み」ではない。PR #63は未マージ。
- プロダクト機能を先に形にし、外部公開・正式リリース判定の前にIssue #64を必ず再開する。今回の画面履歴リセットとは別の話。

### 気象観測・レーダー・夢の機能
- 気象庁 hrpns PNGの2023旧パレットと現行パレットの差、特に未検証の黄色/透過ピクセルはUNKNOWNのまま。現在の一次証拠を読む：docs/PNG_PALETTE_EVIDENCE.md。
- 30分先データの同時刻重複と最新優先、どの地点・半径で一致を調べるか、羽田・篠崎等の小雨・疎らな雲は継続検証課題。
- 防災を全面に出さず生活のそっと見守り。強雨なら公式雲画像を前後表示、検証画像、通知履歴IDと根拠・経緯を保存して振り返り可能にする。プラン容量/無料制限を考える。
- Misakiとの将来連携は**設計案のみ**。気象の判断はアメふる、表現・人格はMisaki等の受け手側。Misakiのリポジトリ/本番/Supabaseには触れない。LIVE JAPAN/全国スキャン/他のPRも実験ブランチとして区別。

## G. 次のソラの推奨順序（2026-10-23）

1. **この総覧を読んでから**GitHub mainと PR **#73** の差分・CIを確認する。#73をマージする場合は、本番公開・古い履歴の表示範囲・取得上限を実際に検証してから明確に報告する。既存のUI初期表示2件、直近7日の新履歴、履歴整理境界、回答RLSを壊さないこと。
2. 新しいPushが届いたらユーザーが登録地点の天気を実際に見て、回答・観測時刻を保存し、アプリ再起動で復元されるかの実機検証を行う。**届いていない新しいPushを作り話しない**。観測していない場所は「わからない」。
3. 通知を出した時点の**予測対象時刻・判断根拠・通知ID・データ元の取得時刻**を将来の新しい通知へ残す設計を、安全な開発ブランチで検討（旧履歴には偽の時刻を埋めない）。現行の時刻差は観測間隔にすぎず、予測の精度とは別。
4. JMAの雨雲疎らパターン、降り始めを早めに／止みそうは確実に、地点判定半径の検証を進める。データ不明を晴れ扱いしない。
5. 後日の外部正式公開前は必ず **Issue #64** と PR #63 を安全性監査・DBスキーマ移行・並列試験とともに再評価。**現時点でPR #63を本番へマージしない**。

## H. 引継ぎでの表現ルール

- 「本番にある」「実機で成功」「DB確認」「CI成功」は**それぞれ証拠の違う事実**。スクショがない操作は未確認として明記。
- 個人的な挨拶だけで開発を止めない。ユーザーが「りょ」と言ったら許可済みの具体的作業を進める。
- 長大チャットが使えなくなってもこの文書を正本とし、**新しい節を先頭に追加**するなどして最新→履歴の順に管理。旧い文章を事実上の最新版として採用しない。
- プロジェクトの精神に戻る合言葉：「ソラ、洗濯物どこいった？」。**「未来のソラを信用するなｗ」＝GitHubの現物を見て検証する**。

---


# EmergencyAlert 2026 — Project Overview

This document exists because neither future Sei-chan nor future Sora should be
trusted to remember why the system was built. :)

## Origin

The original idea was ordinary and personal:

> おかあさん、そろそろ雨降ってくるよ。洗濯物しまったほうがいいよ。

The heat/WBGT feature came from the same place: give useful information early
enough that a parent can tell a child before school:

> 今日は昼から暑くなるんだってさ、気をつけなー。

EmergencyAlert is therefore not primarily a weather-information broadcaster.
Its job is to make a small piece of the near future useful early enough for
someone to act or say something to a person they care about.

## Constitution

暮らしを、少し先回りする。  
必要な人に、必要な情報を、必要な時に。  
必要でなければ、静かに見守る。

Functional tagline:

> あなたの場所の、これからを見張る。

## Meteorological boundary

EmergencyAlert does not independently forecast weather.

Official/authorized forecasts, observations and disaster information are the
source of truth. EmergencyAlert connects that information to a person's place,
time and life, decides whether it is relevant enough to surface, and explains
it clearly.

AI must not invent, interpolate or improve meteorological phenomena, timing,
rainfall values or danger levels.

## Missing-data rule

UNKNOWN_PIXEL != NO_RAIN.  
FETCH_ERROR != NO_RAIN.  
NO_DATA != SAFE.

Never turn "we do not know" into "you are safe."

## 2023 archaeology

The old application used the JMA high-resolution precipitation nowcast at the
user's geographic point. It converted latitude/longitude to a map tile and
pixel, read that pixel and mapped the JMA legend colors to precipitation
intensity bands.

Recovered historical bands:

- #F2F2FF -> <1 mm/h
- #A0D2FF -> 1-5
- #218CFF -> 5-10
- #0041FF -> 10-20
- #FAF500 -> 20-30
- #FF9900 -> 30-50
- #FF2800 -> 50-80
- #B40068 -> >=80

The user's recollection is that the colors were measured from JMA's on-screen
legend with a color inspection tool. Current investigation has found direct
JMA page assets whose RGB values corroborate several historical values. At
least one current asset differs from the old table, so 2026 must re-verify the
complete current palette before enabling it.

Rule:

> 思想は継承する。実装は検証する。

## 2026 rain product

First product: 「アメくる？2026」

Initial chain:

current location
-> public JMA high-resolution nowcast data
-> tile/pixel
-> verified interpretation
-> useful life-language message
-> later: watch place / Push

Lifestyle notification threshold under consideration:

- <1 mm/h: no Push
- 1-5 mm/h: generally no Push
- >=5 mm/h within about 30 minutes: notification candidate
- stronger rain: stronger wording

This is a product-action threshold, not a meteorological danger threshold.

For rain ending, do not infer "やみそう" from one dry frame. Current design
requires three consecutive valid NO_RAIN frames (15 minutes) with no unknown
gap before an ending claim.

## Cost constraint

Current development assumes zero fixed weather-data subscription cost.

The paid JMBSC GRIB2 feed is a future provider option only. Do not make it a
Phase 1 dependency. Reconsider it when the project has sufficient revenue or
funding.

## Current implementation / checkpoint (2026-09-20)

「アメくる？2026」の Phase 1 本線は、現在地から気象庁データを取り、
安全に解釈して簡潔な生活言葉で表示するところまで接続済み。

Implemented:

- Next.js + TypeScript scaffold
- browser geolocation -> server API -> JMA public-image provider
- Web Mercator tile/pixel path and tests
- RainInterpretationEngine states:
  `INSUFFICIENT_DATA / DRY / RAIN_AHEAD / ACTIONABLE_RAIN / RAINING / EASING / ENDING`
- claim-specific publication gate: unknown data after a supported near-term claim
  does not erase that claim, while unknown data required for the claim blocks it
- semantic event v1 separated from presentation
- casual 「アメくる？」 message formatter and visible UI
- checked-at time, location accuracy and JMA source display
- explicit uncertainty card when a claim is withheld
- stale UI results are cleared before re-check/location failure
- provider integration tests and end-to-end interpretation -> publication ->
  semantic event -> message pipeline tests
- daily fail-safe palette watcher scaffold; it detects change but never promotes
  a new RGB mapping automatically

### Rain interpretation safety now locked by tests

The engine currently fails closed for:

- malformed JMA `baseTime` / `validTime`
- stale observation (>15 minutes old)
- implausibly future observation (>5 minutes ahead)
- a forecast series whose targets are all already in the past
- empty forecast coverage (zero frames can never become DRY)
- incomplete/unknown evidence needed for a user-facing claim
- easing claims that would have to skip an unknown frame
- impossible forecast metadata where `baseTime > validTime`

The 15-minute observation tolerance is an operational freshness guard, not a
meteorological threshold.

Do not copy the forecast `baseTime <= validTime` rule onto observation frames
without provider-specific evidence. Observation and forecast metadata are
different products even when field names look similar.

> 同じ名前の項目でも、同じ意味とは決めつけない。

### Current user-facing behavior

The main UI intentionally stays simple:

- 「この先、雨なし」
- 「このあと雨くるよ」
- 「もうすぐ雨くるよ」
- 「いま雨だよ」
- 「弱くなりそう」
- 「もうすぐやみそう」

When the evidence is insufficient it instead says, in effect:

> いまは、はっきり言えないよ。雨が降らないって意味じゃないよ。

The implementation underneath may be strict; the surface should remain
glanceable and everyday.

### Current blocker

**2026-09-23 correction:** Direct browser DOM/resource inspection now links
the hrpns layer to its own precipitation legend. Seven RGB mappings are verified
against original current PNGs (including zoom 10). The remaining 20–30 mm/h
legend uses #FFF500, while PNGs contain #FAF500; the former #FAF500 registration
has been withdrawn and both yellows remain UNKNOWN_PIXEL. #00AAFF/#FFAA00
circle assets belong to AMeDAS ten-minute rainfall, not hrpns intensity.
#FF9900 is confirmed by current hrpns evidence. See
[PNG_PALETTE_EVIDENCE.md](PNG_PALETTE_EVIDENCE.md) for the source chain, originals,
hashes, exact band table and unresolved conflict. The older archaeology and
checkpoint notes must not override this correction.

The largest remaining production blocker is the current JMA PNG precipitation
palette. The current 2026 page has verified mappings for only part of the
legend. Unknown opaque RGB values remain `UNKNOWN_PIXEL`; old 2023 mappings
must not be resurrected by guesswork.

The palette watcher is intentionally fail-safe:

> 変更は自動で見つける。意味は勝手に決めない。

It is scaffolding only; finishing the main 「アメくる？」 flow takes priority
over building a clever automatic palette-promotion system.

## Immediate work from this checkpoint

1. Keep the Phase 1 rain path stable and CI-green.
2. Tighten any remaining user-facing wording that can sound more absolute than
   the official evidence (for example, prefer “雨の予報なし” over an absolute
   “雨なし” where appropriate).
3. Expose source-valid time separately from app check time when useful, so a
   fresh UI check cannot hide old source data.
4. Finish evidence-backed verification of the remaining current JMA PNG legend
   RGB mappings; never guess them.
5. Re-check the transparent-pixel => NO_RAIN assumption against current evidence
   before calling the public-image path production-ready.
6. Once the verified rain path is solid, add watch-place/change detection and
   only then Push behavior.

## Must not break

- Do not independently forecast weather.
- Do not silently convert unknown/missing data to dry.
- Do not resurrect old RGB values without current verification.
- Do not add paid weather-data subscriptions during the current phase.
- Do not make the internals complicated for the user just because they are
  complicated underneath.

## Recovery phrases

If the project becomes abstract or bloated:

> ソラ、洗濯物どこいった？

And the engineering rule:

> 未来のソラを信用するなｗ

That is why this file exists.


## 2023 design intent recovered from operation history

The animated rain-cloud GIF was not decoration. Its purpose was to make the
coming change visually understandable: not merely “heavy rain will arrive
around XX:XX”, but “this rain area is moving toward you like this, so act now.”

The 2023 implementation automated a browser, captured successive JMA nowcast
frames, assembled them into an animated GIF, and posted it to Twitter/X.
Twitter could transcode the uploaded animated GIF to MP4 for timeline delivery;
that does not mean EmergencyAlert itself generated MP4.

This is an important product principle for 2026:

> 情報を増やすのではなく、行動につながる実感を増やす。

When useful, EmergencyAlert should help the user understand the time progression
of an officially published phenomenon, while never creating or extrapolating
meteorological movement on its own.


## Output boundary — facts first, expression later

EmergencyAlert's reusable output must stop at structured facts and
interpretation. Product-specific wording is a separate presentation layer.

Canonical flow:

> Official source → EmergencyAlert interpretation → structured event → presentation/personality layer

The structured event should carry the facts needed by downstream consumers,
for example state, relevant times, intensity class, source, checked-at time,
location and location accuracy, plus data/interpretation status.

EmergencyAlert may provide its own simple everyday-language presentation, but
that wording is not the canonical output and must not be required by downstream
integrations.

For Misaki or any future consumer:

- the consumer may change tone, phrasing and personality;
- it may use its own relationship/context rules to decide how to say the fact;
- it must not change the underlying meteorological interpretation;
- it must not invent rain, timing, intensity or danger that EmergencyAlert did
  not establish from the official source.

In short:

> EmergencyAlert = 目。各サービス = 伝え方。

This boundary is a project-wide overview item because it keeps the weather
truth reusable while allowing Misaki, Push, LINE, voice or future products to
express the same event in their own way.


### Consumer simplicity is part of the EmergencyAlert contract

Separation must not mean pushing meteorological complexity into each consumer.
EmergencyAlert is responsible for turning its interpretation into a
consumer-ready semantic event.

A downstream service should not need to understand JMA tile colors, rainfall
thresholds, consecutive-frame rules, missing-data handling, or the logic that
decides whether an event is actionable.

A semantic event may therefore include fields such as:

- event type (for example, rain approaching / raining / easing / ending);
- urgency class;
- relevant timing;
- normalized intensity;
- suggested action (for example, bring laundry inside);
- source, checked-at time and data status.

The exact schema will evolve, but the responsibility boundary is fixed:

> 判断はEmergencyAlertに寄せる。表現は利用側に渡す。
> ただし、利用側に気象ロジックを再実装させない。

Misaki and other consumers should mainly decide how to express an already
grounded event in their own voice and context. They must not be forced to
reconstruct EmergencyAlert's weather logic in order to use it.

Future integration APIs/SDKs should optimize for this goal: receiving and using
an EmergencyAlert event should be simple even when the implementation behind
that event is complex.


### Keep each consumer's experience distinct

Sharing the same EmergencyAlert event must not make every consumer feel like the
same notification UI.

**アメくる？** is a glanceable utility. Its job is to answer the immediate
question with the shortest useful wording. Do not turn it into a conversational
character merely because the event layer can support richer expression.

**Misaki** is a conversational relationship experience. EmergencyAlert events
should enter naturally through conversation and context, as something Misaki
noticed and cared to mention. Do not turn Misaki into a weather notification
bot or simply paste アメくる？ copy into chat.

Therefore:

> アメくる？は簡潔に。美咲は会話の中に。

The shared event carries the grounded fact and actionable meaning; each
consumer owns its experience. Reuse the truth, not the presentation.


### Current trust metadata checkpoint (2026-09-23)

The rain API now keeps the time EmergencyAlert checked the data separate from
the valid time of the JMA observation used for the claim:

- `checkedAt`: when EmergencyAlert performed the interpretation;
- `sourceValidAt`: the observation `validTime` supplied by the JMA source.

The user-facing アメくる？ card may show both values, but must not turn a
malformed source timestamp into a plausible-looking time. If the source time
cannot be validated, omit that detail rather than guessing.

Likewise, a DRY result is presented as **「雨の予報なし」**, not the stronger
**「雨なし」**. EmergencyAlert reports what the official data supports; it does
not convert a forecast into certainty.

> 確認した時刻と、元データの時刻は別物。
> 予報がないことと、絶対に降らないことも別物。


### Transparent hrpns pixels fail closed until coverage semantics are proven

As of 2026-09-23, a fully transparent public hrpns PNG pixel is **not** treated
as `NO_RAIN`. It is classified as `UNKNOWN_PIXEL` because transparency proves
only that the overlay did not paint precipitation at that pixel; it does not by
itself prove that the coordinate/time was inside valid meteorological coverage.

This intentionally reduces useful DRY claims while the evidence gap remains.
The restriction may be relaxed only after first-party encoding evidence or a
reproducible authoritative coverage comparison establishes the public PNG
alpha/coverage semantics.

> 分からないものを「雨なし」にしない。


## First production-device milestone and next product phase (2026-09-23)

The first iPhone production test completed the real path from browser geolocation
to JMA retrieval, conservative interpretation and user-facing display. The test
also confirmed that withheld interpretation is presented separately from a data
fetch failure, with checked time, location accuracy and JMA source time visible.

This closes the initial "can the real phone ask about this place now?" milestone.
Do not keep polishing the one-shot screen as a substitute for the product's
actual purpose.

The next product phase is **watching a place over time and noticing a meaningful
change**. Design it around the existing semantic event boundary:

- a watch target is a location the user has intentionally chosen;
- repeated checks must preserve uncertainty rather than treating UNKNOWN as dry;
- notification eligibility comes from a grounded semantic transition/event, not
  from raw PNG color changes;
- deduplicate the same episode so a 5-minute source cadence does not become
  repeated nagging;
- lifestyle notifications remain quiet when there is nothing useful to say;
- Push is a delivery layer after change detection, not the weather decision
  engine itself.

Phase order: **watch target -> repeated evaluation -> semantic change detection
-> deduplication/cooldown -> Push delivery**. Persistence and scheduling should
be added only as required by that path; do not introduce accounts or a large DB
before the first watch flow needs them.

> 見張るのは天気ではなく、「今ならひと言かける意味がある変化」。


## Handoff checkpoint — 2026-09-24

This section is the current operational handoff. Read it before continuing work.

### Production / verified on real devices

- Production: `emergencyalert-gilt.vercel.app`.
- PWA foundation is deployed: manifest, service worker registration and EmergencyAlert icon.
- Android real-device test confirmed EmergencyAlert can be installed to the home screen as a Chrome-origin PWA.
- iPhone real-device weather flow is working.
- Watch-place persistence works through Supabase anonymous auth + RLS.
- A saved watch target remains until the user deletes it.
- Each target has independent `enabled` state: OFF pauses monitoring without deleting the registration.
- Delete action is deployed and was verified end-to-end on iPhone: confirmation -> DB deletion -> card disappears.
- GPS/current-location registration works.
- Facility/station search through Nominatim works.
- Japanese street-number address search now uses `@geolonia/normalize-japanese-addresses`; `江東区塩浜2-9-8` was resolved and registered successfully on a real device.
- Important bug already fixed: the address detector was accidentally `/\\\\d/` instead of `/\\d/`.
- Public Nominatim is now used as a single explicit request for facility/station search; do not restore rapid retry loops.
- The 5-minute server watcher is proven to fire automatically. `watch-rain-every-5-minutes` showed repeated successful cron runs and `watch_states.last_checked_at` updates.
- UNKNOWN remains UNKNOWN; it is not converted to dry/no-rain.

### Push — current starting point

Push delivery is the current main line of work.

A Supabase table `public.push_subscriptions` has already been created with:
- `owner_id`, `endpoint`, `p256dh`, `auth`, optional `user_agent`;
- unique `(owner_id, endpoint)`;
- RLS enabled;
- authenticated users can select/insert/update/delete only their own subscriptions.

The PWA does **not** yet have the complete notification-permission/subscription UI and the server watcher does **not** yet send Web Push. Continue from here.

Required flow:
site/PWA -> user explicitly enables notifications -> browser Push subscription -> save subscription -> watcher finds grounded actionable semantic change -> send Push -> only after successful delivery record notification delivery state.

Do not set `last_notified_at` merely because a notification *would* be eligible. The existing watch worker previously had simplified eligibility bookkeeping; before real Push is enabled, make `last_notified_at` mean successful delivery.

iPhone Web Push should be tested from the home-screen installed PWA. Android PWA installation has already been verified on a real device.

### Watch-target UI decision waiting for implementation

The owner requested a clearer ON/OFF control:
- `見張る：ON` should have a **light yellow-green / lime** active appearance.
- OFF should be visually subdued/neutral so state is obvious at a glance.
- Keep the control simple; color is a state cue, not decoration.
- Delete remains a separate destructive action.

This UI tweak is approved direction but was **not implemented yet** at this checkpoint.

### Current DB / worker model

`watch_targets` is the canonical saved-place table. Important fields include:
`owner_id`, label, latitude/longitude, display address/name, source, `enabled`, and `notifications_enabled`.

`watch_states` stores per-target monitoring state and is deleted with its target through the FK cascade.

The Supabase Edge Function `watch-rain` is invoked by cron every five minutes using the configured secret header. It evaluates enabled targets against the production rain API. Push sending still needs to be added.

### Product/engineering invariants for the next Sora

- EmergencyAlert does not predict weather independently.
- Official/authorized source -> interpretation -> semantic event -> presentation/delivery.
- Do not turn missing/unknown data into safety.
- Watch saved places, not device movement.
- Notify only meaningful grounded change; avoid 5-minute nagging.
- UI stays simpler as internals become more complex.
- Misaki may later consume EmergencyAlert facts, but EmergencyAlert and Misaki remain separate products and presentation layers.
- Verify actual files/results after writes. A successful commit message is not proof that the intended code is present.
- CI must pass before merge; verify Production deployment afterward.
- Do not expose or repeat secrets. The watch cron token was previously visible during setup and should eventually be rotated.

### Current implementation status and immediate next work (updated 2026-09-25)

The operational handoff above was written before several items were merged. The
repository on `main` is now ahead of that handoff in these areas:

- the saved watch-target ON/OFF control is implemented and deployed:
  `見張る：ON` uses the approved light yellow-green/lime active state and OFF
  is neutral/subdued;
- explicit Web Push permission/subscription UI is implemented in the PWA;
- Push subscriptions are persisted to `public.push_subscriptions`;
- the service worker already contains Push reception/notification handling;
- VAPID-key changes are handled by replacing an incompatible existing browser
  subscription;
- temporary one-shot Push test UI used during verification was removed after
  testing;
- saved-place registration now clears the place-search UI after a successful
  registration.

Therefore, do **not** restart work from the old items 1–3. The next main product
work is the server-delivery side:

1. inspect the current `watch-rain` worker and existing notification decision
   code before changing it;
2. add/finish server-side Web Push delivery from the watcher only for grounded,
   actionable semantic changes;
3. make `last_notified_at` mean **successful Push delivery only** — eligibility,
   an attempted send, or a failed send must not advance it;
4. preserve UNKNOWN/fetch-error behavior and the existing meteorological
   interpretation boundary while adding delivery;
5. test Push end-to-end on the installed Android PWA, then on the iPhone
   home-screen PWA;
6. add/verify episode dedupe and cooldown so the five-minute watcher does not
   repeatedly notify the same rain episode.

Keep the JMA `rasrf` member-path correction isolated from Push work. PR #26 is
the scoped correction for carrying `targetTimes.json` frame `member` into the
tile URL; it still requires its own CI/evidence/merge verification and must not
be mixed into watcher/Push changes.

> 第3条：ソラの「入れた」は、実物を見るまで信用するな。


## JMA rasrf target member checkpoint — 2026-09-25

The precipitation short-range forecast path has an additional source-contract
requirement that must be preserved before continuing Push work.

`rasrf/targetTimes.json` supplies a `member` for each forecast frame. The
early-forecast tile URL builder must treat that value as part of the frame
metadata and use it for the member path segment. Do not hard-code `none` in
the URL builder.

Canonical frame-to-tile relationship:

> target frame `basetime` + `member` + `validtime` -> rasrf tile URL

Implementation rule:

- `buildJmaEarlyForecastTileUrl` receives `basetime`, `validtime`, and
  `member`;
- the URL member segment comes from `frame.member`;
- tests must cover at least `immed` and `none`;
- a tile fetch failure remains `FETCH_ERROR`; it must never become NO_RAIN;
- this correction does not change Push, Supabase, watch-target persistence, or
  the meteorological interpretation boundary.

PR #26 is the isolated implementation of this correction. Keep it separate
from Push work, require CI to pass before merge, and verify the resulting
Production deployment afterward.

> targetTimes の値を読んでいるだけでは足りない。URLまで同じフレーム情報を運ぶ。
