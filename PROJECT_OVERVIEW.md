# EmergencyAlert 総覧

最終更新: 2026-09-28

## この文書の役割

EmergencyAlert の仕様・実装方針・運用上の決定事項を、次の作業でも迷わないために残す正本メモ。重要な仕様変更や運用ルールを決めたら随時更新する。

## 作業コミュニケーション

- ユーザーの「りょ」は「進めて」の意味。
- 「りょ」と来たら、返事だけで止まらず、直前まで合意している作業の次工程を実行する。
- ただし、本番データ破壊・秘密情報の露出・不可逆な操作など、新たな重要判断が必要な場合は勝手に進めない。
- 実装は、差分確認 → テスト/CI → Preview確認 → 必要に応じてマージ → Production確認、の順を基本とする。
- 実際に確認できていない状態を「成功」「反映済み」と断定しない。

## 現在の基本構成

- GitHub: miyazaki1016/emergencyalert
- Vercel project: emergencyalert
- Supabase project: EmergencyAlert
- 雨監視は Supabase Edge Function `watch-rain` が担当。
- Web Push 購読情報は `push_subscriptions` に保存。
- 場所ごとの監視状態は `watch_targets` / `watch_states` で管理。
- iPhone はホーム画面に追加した PWA から通知許可・Push購読を行う。

## 雨通知の現行仕様

- 気象庁高解像度降水ナウキャストを判定元にする。
- 現在は雨が降っておらず、5mm/h以上の雨が30分以内に来る場合を `ACTIONABLE_RAIN` とする。
- semantic event の urgency が `LIFESTYLE_ACTION` のときだけ Push 候補になる。
- 場所ごとの `notifications_enabled` が ON であることが必要。
- 未配信の actionable event は再試行し、すでに配信済みの同一 actionable 状態は重複通知しない。
- 5mm/h・30分境界と通知判定ロジックは CI の回帰テストで固定している。

## Web Push 現在地

- iPhone Home Screen PWA で通知許可 → PushSubscription → Supabase保存まで確認済み。
- 認証済みテスト送信で、Supabase Edge Function → Web Push → iPhone通知センターへの実配信を確認済み。
- テスト用UIは Production から撤去済み。
- `test-push` / `test-push-once` は 410 Gone のみ返す無害なFunctionへ置換済み。
- 本番 `watch-rain` はテストのために変更せず稼働を継続。
- 自然発生した実際の気象条件で `watch-rain` 自身からiPhoneへ通知された実績は、まだ未確認。

## 残る本番ハードニング

- 現在の VAPID 秘密鍵は開発中にチャットへ露出したため、最終リリース前にローテーションする。
- ローテーション時は Supabase秘密鍵、Vercel公開鍵、Edge Function側公開鍵を同時更新する。
- クライアント側で applicationServerKey の不一致を検出し、自動で購読し直せるようにしてから鍵を切り替える。
- `watch-rain` の VAPID subject は仮の mailto ではなく管理下の HTTPS origin に変更する。
- Supabase Edge Function の本番ソースをGitHubで正本管理できる構成へ移す。

## プロダクトの設計思想

- Emergency は災害だけを意味しない。その人にとって「今すぐ何とかしたい暮らしの困りごと」も対象にする。
- 中心コンセプトは「必要な人に、必要になる少し前に知らせる」「暮らしのEmergencyを、困る前に先回りして知らせる」。
- 洗濯物の雨濡れを最初の日常ユースケースとし、日常的に使う入口から大雨・熱中症・地震・特別警報・避難情報などへ広げる。
- 通知は単なる気象データの転送ではなく、「今どう行動すると困りにくいか」が分かる生活の言葉に変換する。

## 洗濯物・先回り通知の方向性

- 前日17〜18時ごろ: 翌日の予報から「外干しOK / 早めならOK / 部屋干し推奨」などを通知し、その時点の洗濯判定を保存する。
- 当日朝: 最新予報で再判定し、前日夕方の判定と比較する。天気マークの差ではなく「洗濯の判断が変わったか」を重視する。
- 朝に判断が悪化した場合は「昨日の予報から変わったよ」と明示し、外出前に間に合う行動を案内する。改善した場合も、外干し可能になったことを知らせる。
- 朝の再判定後に「今日は外干しする？」を確認し、ユーザーが外干しを選んだ地点は洗濯物見張りモードとして扱う。
- 日中: 朝の予報が晴れでも、その後の予報変化を追跡する。数時間先の雨リスクが高まったら、外出中でも間に合う早期通知を行う。
- 直前: 現行の高解像度降水ナウキャストを使い、5mm/h以上の雨が30分以内なら取り込みを促す通知を行う。
- 目的は「雨を知らせる」ことではなく「洗濯物を濡らさないために先回りする」こと。
- 次工程は、翌日予報・数時間先予報に利用できる気象庁データの調査 → 判定ロジック設計 → 実装。既存の30分前通知は維持する。

## 2026-09-25 現在地（main実物確認）

- JMA降水短時間予報の `targetTimes.json` が返す `member` をタイルURLへそのまま引き継ぐ修正は PR #26 で完了。ハードコードしていた `none` を廃止し、`immed` / `none` の両方を回帰テストで固定した。
- PR #26 は CI #198 Success、Vercel Preview Success、main へのマージ、Production の Vercel Success まで確認済み。したがってこの修正を再実装しない。
- 通知エピソード判定は、ACTIONABLE→INFO→新ACTIONABLE で再通知できること、UNKNOWN を挟んでも直前の grounded actionable 状態を保持すれば重複通知しないこと、未配信の actionable は再試行対象になることをテストで固定した。
- `last_notified_at` は「Push候補になった時刻」ではなく「1件以上のPush配信に成功した時刻」を表す。配信成功0件の actionable では進めず、非actionableへ戻ったらクリアする。この判定を `nextLastNotifiedAt` として分離し、回帰テストを追加済み。
- 現在の main HEAD は `7ce69b1f66df02726aaceb966303cbb4ea1e2014`。古い PR #25 はライブJMA検証用の履歴であり、`member` 修正の実装元として扱わない。
- 次に進むときは、最新main上の `watch-rain` 実装とテストの整合を確認し、未完部分だけを1個ずつ進める。完了済みのJMA member修正やPush基盤を作り直さない。


## 2026-09-28 統合照合スナップショット（GitHub main / Supabase DB / 本番Edge）

この節は、2026-09-28 に GitHub main のプログラム、Supabase の実DB、本番 Edge Function を実物照合して更新した運用正本。古い節と矛盾する場合は、原則としてこの節と現行実装を優先する。ただし「GitHub mainに実装済み」と「本番Edgeへデプロイ済み」は必ず分けて扱う。

### 正本の位置づけ

- 日々の運用・現在地点の正本はリポジトリ直下の `PROJECT_OVERVIEW.md`（この文書）。
- `docs/PROJECT_OVERVIEW.md` は原点・設計思想・過去の検証経緯を含む長文履歴資料。古いcheckpointも残るため、現在の本番状態を判断するときはこの文書を先に読む。
- `docs/DECISIONS.md`、`docs/PNG_PALETTE_EVIDENCE.md` 等は根拠・決定理由の詳細資料として残す。
- README は公開向け概要であり、運用正本ではない。
- 合言葉は引き続き「未来のソラを信用するな」。決定だけでなく理由と、本番反映の有無を残す。

### プロダクト名称と思想

- 開発中の正式名称候補は **サキクル** に一本化。
- 名称コンセプトは **「暮らしを、少し先回りする。」**
- ドメインは `emergencyalert.news` を取得済み。ただし本番切替はまだ行わない。
- 商標等の最終確認前なので、現行UIの「アメくる？」は一斉変更しない。
- サキクルは天気実況アプリではなく、公式情報から「少し先に起きる、今なら行動できる変化」を知らせるサービス。
- したがって「予報が当たったことをサービス側が報告する」ための通知は出さない。

### JMA降水PNG — 現在の確定パレット

現行 main の `lib/weather/providers/jma/pngPalette.ts` と実地検証で、hrpns 用として次を採用する。

- <1 mm/h: `#F2F2FF`
- 1–5 mm/h: `#A0D2FF`
- 5–10 mm/h: `#218CFF`
- 10–20 mm/h: `#0041FF`
- 20–30 mm/h: **`#FAF500`**
- 30–50 mm/h: `#FF9900`
- 50–80 mm/h: `#FF2800`
- >=80 mm/h: `#B40068`

20–30 mm/h は一時 `#FFF500` と資料上の不整合があったが、現行mainでは `#FAF500` を正式採用。2026-09-28 の白浜等の実PNGでも `#FAF500` をRAIN / 20_TO_30として認識できた。AMeDAS 10分雨量の丸形SVG色はhrpns判定根拠に混ぜない。

透明pixelは現行実装では、実地観測（同地点で transparent → verified rain color → transparent の遷移等）を根拠に `NO_RAIN` として扱う。未知の不透明RGBは引き続き `UNKNOWN_PIXEL` とし、勝手に雨なしへ変換しない。

### 監視・DB構成

監視は通常5分周期。サーバー側は保存済み `watch_targets` を評価し、ブラウザを閉じていても監視する。端末の移動履歴をバックグラウンド追跡する方式ではない。

主要テーブル:
- `watch_targets`: 保存地点、label/display_name/address、enabled、notifications_enabled。
- `watch_states`: last_event、last_checked_at、last_notified_at、rain/clear streak、confirmed_weather、ending/confirmed管理、severe_rain_level。
- `push_subscriptions`: Web Push購読。
- `notification_deliveries`: **実際に1件以上配信成功した通知**の履歴。
- `rain_diagnostic_history`: 各地点・各監視回の診断履歴。2026-09-26から蓄積され、2026-09-28 13:15 JST照合時点で6地点・1289行を確認。

2026-09-28 13:15 JST時点の有効なテスト監視地点は6件:
- 自宅（塩浜二丁目）
- 勤務先（平井四丁目）
- 羽田空港（東京国際空港）
- ちいちゃん家（戸ヶ崎一丁目）
- 大雨の予報（子浦）
- 大雨の予報（白浜）

同じlabelが複数の有効地点にある場合、通知では `label（display_name）` の形で場所を補足する実装をmainへ入れている。ユニークなlabelは従来どおりlabelのみ。

### 雨エピソードと事実確定

原則: **予測は早さ優先、結果は確実性優先。**

- 「降りそう」: 未来予測。生活上行動価値がある段階で早めに通知。
- 「止みそう」: 未来予測。通知対象。
- 「また降りそう」: 3回連続NO_RAINでエピソード終了する前に一時的に弱まり、その後再びactionableになった場合の通知。event_typeは `RAIN_RETURNING`。
- 「降った」: 現在雨を3回連続（通常5分間隔なので1回目→3回目は約10分）確認して内部事実として確定。
- 「止んだ」: NO_RAINを3回連続確認して内部事実として確定し、降雨エピソードを終了。
- UNKNOWN/FETCH_ERROR等はNO_RAINへ読み替えない。

**2026-09-28の製品判断:** `RAIN_CONFIRMED`（「降ったよ」）単独Pushは廃止する。理由は、未来の行動を助けず「予報当たっただろ」とサービスが自己主張する通知になりやすいから。3回連続RAINの内部確定は、エピソード管理・RETURNING/ENDING判断のため残す。

GitHub main（PR #50 / merge `08003ebd...`）では、単独 `RAIN_CONFIRMED` を通知条件から外した。「降雨確定」と「止みそう」が同時成立した場合も、ユーザーには `RAIN_ENDING` として「○○の雨、もうすぐ止みそうだよ🌥️」の未来情報だけを出す。

**重要:** 2026-09-28 13:15 JST照合時点、本番Supabase Edge Function `watch-rain` は **version 28** のまま。したがって #48（重複labelの場所名補足）や #50（RAIN_CONFIRMED Push廃止）など、GitHub mainの最新版がすべて本番Edgeへ反映済みとは断定しない。DBに残る羽田12:55等の `RAIN_CONFIRMED` 配信は旧本番仕様の実績であり、履歴として正常に保持する。

また、mainの #50 では `rain_confirmed_notified` が依然「配信成功時」に立つ旧名/旧更新条件を保持している。単独Pushをやめた後は内部確定フラグとしての意味とずれるため、本番Edge反映前に状態更新ロジックを再点検する。内部確定が毎回再成立扱いにならないようにすること。

### 通知するもの / しないもの

基本方針:
- 降りそう → Push
- また降りそう → Push
- 強くなりそう（防災レイヤー） → Push
- 止みそう → Push
- 降った → **内部確定のみ、Pushしない**
- 止んだ → **内部確定のみ、Pushしない**

通知履歴 `notification_deliveries` はPush成功時だけ作る。したがって内部だけの「降った」「止んだ」は新規通知履歴を作らない。

### 防災・強雨レイヤー

生活通知とは別レイヤー。
- 30–50 mm/h = 激しい雨
- 50–80 mm/h = 非常に激しい雨
- >=80 mm/h = 猛烈な雨

未来の公式降水予測が30 mm/h以上に達する場合、現在すでに雨でも通知候補。同一エピソード・同一強度段階は繰り返さず、上位段階への悪化は追加通知する。これは雨量強度表現であって、大雨警報・注意報そのものではない。

強雨の実地Push成功はまだ最終確認できていない。特に本番投入前後に、DBのurgency制約、配信失敗時のsevere level保持、強度選択順などを実地/コード両面で再確認する。

### 実地テストで確認できたこと（2026-09-28）

iPhone通知センターで少なくとも以下の実着を確認:
- 「自宅：もうすぐ雨が来そうだよ☔️ 洗濯物を確認してね」
- 「勤務先の雨、もうすぐ止みそうだよ🌥️」
- 旧仕様の「羽田空港で雨が降ったよ☔️」

この3本を並べて見たことが、単独「降ったよ」Push廃止の判断材料になった。

DBでも、監視地点ごとに5分刻みで `current_status` / semantic event / RGBA / forecastDetails / Push実績を追跡できることを確認。自宅では「まだNO_RAINだがACTIONABLE_RAIN_APPROACHING」等を時系列で観察できた。

### UI / PWA 現在地

- 現在の公開UI名は「アメくる？」のまま。
- 明るい雨ブルー系背景＋濃いカード、主要CTAは青グラデーション、監視ONは黄緑を現行デザイン基準とする。
- 登録地点は住所・駅・学校・施設・現在地から作成でき、メモlabelを付けられる。
- 見張るON/OFFと削除を実装済み。
- iPhoneはHome Screen PWAからWeb Push。AndroidもPWA実機テスト済み。
- 「今日の最新アラート」は東京日付00:00以降の `notification_deliveries` から地点ごとに最新1件を表示。
- PR #49で、画面を開いたままでも5分ごとに最新アラートを再読込し、バックグラウンド復帰時は `visibilitychange` でも再読込する。日付境界も次回再読込時に自然に切り替わる。

### GitHub main の主要到達点（2026-09-28）

- #40: `RAIN_RETURNING`
- #46: 現行UIの小文字/補助文字を白系へ調整
- #47: JMA 20–30 mm/h `#FAF500` 修正
- #48: 重複label通知にdisplay_nameを補足
- #49: 今日の最新アラートを5分ごと＋foreground復帰時に更新
- #50: 単独 `RAIN_CONFIRMED` Pushを廃止し、内部確定を残す
- 2026-09-28 13時台照合時の main HEAD: `08003ebdf6032da7bccdebd5221c32c16c506b92`

### 次にやること（優先順）

1. **#50の内部状態ロジックを再点検**: Pushを出さなくても3回連続RAINの内部確定を一度だけ記録できるよう、`rain_confirmed_notified` の意味/更新条件を整理する。必要なら互換性を保った最小修正をPR化。
2. **本番Edgeのdrift解消**: GitHub mainと本番 `watch-rain v28` の差分を確認し、上記修正も含めて安全にSupabaseへデプロイ。デプロイ後にversion/sourceを再取得して一致を確認。
3. `RAIN_RETURNING` の初実着を確認。
4. 未来30 mm/h以上の条件が来た際に強雨/防災Pushを実地確認。
5. サキクル名称の商標等最終確認後、UI/PWA/metadataを一括切替。
6. `emergencyalert.news` のVercel/DNS/HTTPS接続は、フィールドテストを壊さないタイミングで実施。

### 将来機能: 地点別・時系列診断画面

開発者用に、1地点を選び5分ごとの判定を時系列で追える画面を作る。

表示候補:
- checked_at / source_valid_at
- current_status / current_rgba / intensity
- semantic event / urgency
- forecastDetails
- rain_streak / clear_streak / confirmed_weather
- 通知判定と実際の `notification_deliveries`

目的は「なぜこの通知が出た／出なかったか」を後から一目で検証できること。既存の `rain_diagnostic_history` と通知履歴を活用し、まずは一般ユーザー機能ではなく開発・フィールド検証用とする。

> 情報を増やすのではなく、判断の経緯を見えるようにする。


## 2026-09-28 14時台 最新フィールド検証・実装スナップショット

この節は同日13時台の統合照合スナップショット以後の進展を追記したもの。矛盾する古い記述より本節を優先する。

### 本番 watch-rain は v29 へ更新済み

- Supabase Edge Function `watch-rain` は **version 29 / ACTIVE / verify_jwt=false** まで更新・再取得確認済み。
- v29には、重複labelへのdisplay_name補足、単独 `RAIN_CONFIRMED` Push抑止、内部降雨確定のPush非依存化、`RAIN_ENDING` helper復元が含まれる。
- PR #52で `rain_confirmed_notified` をPush配信成功ではなく内部の3回連続RAIN確定で立てるよう修正。merge commit: `a03766b7a73e96848b487ae8ce4eab931dde3056`。
- PR #53でhelper抽出時に欠落していた `rainEnding` 通知判定を最小復元。merge commit: `de25a1233f59e2f8d23206fbf7b1c96e481448d3`。
- v29デプロイ後も5分周期監視が継続していることを複数サイクルで確認済み。

### RAIN_RETURNING は本番実Pushまで確認完了

- 白浜の「大雨の予報」で、13:10 NO_RAIN/雨接近 → 13:15 RAIN/止みそう → 13:20 NO_RAIN/再びACTIONABLE_RAIN_APPROACHINGという実気象遷移が発生。
- 本番で `RAIN_RETURNING` が成立し、iPhoneへ **「大雨の予報：いったん弱まってるけど、また降りそうだよ☔️」** が実Pushされたことを画面で確認済み。
- よって `RAIN_RETURNING` は「コード上」「実気象で成立」「実機Push到着」の3段階を完了した検証済み項目として扱う。

### JMA強雨色の追加実地確認

- 新たな検証地点として **鵜渡根島** を追加。
- 2026-09-28 14:05 JST、鵜渡根島で `#B40068` を実観測。これは現行パレットの **80 mm/h以上 = 猛烈な雨** に該当する。
- 14:10 JSTには `#FF9900`（30–50 mm/h = 激しい雨）へ低下し、5分刻みの強度変化も追跡できた。
- これにより `#FAF500`（20–30）に加え、`#B40068`（>=80）も本番フィールドデータで認識実績を得た。
- ただし「猛烈な雨を現在観測できた」ことと「未来予測30mm/h以上の防災Pushが正常配信された」ことは別。強雨予測Pushの実地確認は継続課題。

### 地図・座標からの地点登録

今日の強雨域が陸地から海上へ抜け、地名検索だけでは雨域を追えなくなったことから、**住所のない海上も監視地点にできること**をフィールド検証上の重要要件とした。

- 既存バックエンドは最終的にlatitude/longitudeで監視するため、監視エンジンやDBを作り直す必要はない。
- PR #54で、緯度・経度を直接指定し、逆ジオコードできない海上等でも「地図指定地点」として登録できる入口を追加。
- `location_source` は地図指定時 `MAP` とする。
- 現在地登録・住所/施設検索は従来どおり維持。
- PR #54は CI Success / Vercel Success確認後mainへマージ済み。merge commit: `7b7dfbc5e8462044f32da51d721c35db016fbccf`。
- 次段階として、数字入力だけでなく地図を見ながら地点を選べるUIを実装中。
- PR #55 **Show map preview for coordinate picker** を作成済み。head `ec7fc83b486c485e7a459c8b9c3b8418f77ee964`。
- **PR #55はまだマージしていない。直近確認ではCI実行中、Vercel Preview Failure。原因確認・修正後、両方Successになるまでmainへ入れない。**
- 将来的な完成形は「現在地 / 住所・施設名 / 地図から選ぶ」の3方式。特にフィールド検証用途では、地図上に雨レーダーを重ねて雨域そのものをタップ登録できる形が価値が高い。JMAデータ・地図の利用条件と投影/重ね合わせ方法を確認して段階導入する。

### UI・設計上の追加判断

- 現行の明るい雨ブルー＋濃いカード＋青グラデーションCTA＋黄緑ONをデザイン基準として維持し、地図機能のために全体デザインを戻さない。
- 地図登録でもlabel（メモ名）はユーザーが付けられるようにする。
- 海上などreverse geocodeが失敗する地点でも登録自体は失敗させない。座標を正本として扱う。
- 同一座標付近（既存実装では概ね50m以内）の二重登録防止は既存ルールを流用する。

### 主要PR / merge追加履歴

- #51: 総覧統合更新 — merge `deee286a8d8823ee26766c92ac15d000b9746520`
- #52: 内部降雨確定をPush成功から分離 — merge `a03766b7a73e96848b487ae8ce4eab931dde3056`
- #53: rain-ending通知判定helper復元 — merge `de25a1233f59e2f8d23206fbf7b1c96e481448d3`
- #54: 座標ベースの地図地点登録 — merge `7b7dfbc5e8462044f32da51d721c35db016fbccf`
- #55: 地図プレビュー — **OPEN / 未マージ**

### 次のチャットでの再開地点

最優先は **PR #55のVercel Preview Failure原因確認**。壊れた状態でマージしない。修正 → CI Success → Vercel Preview Success → 差分確認の順で進める。その後、実際に地図を指で操作して地点を選べるUI、さらに雨レーダーoverlayを検討する。

並行するフィールド検証では、v29について以下を実データで確認する:
- 単独 `RAIN_CONFIRMED` がPushされないこと。
- 初回eligibleな `RAIN_ENDING` は引き続きPushされること。
- 重複labelが `大雨の予報（子浦）` / `大雨の予報（白浜）` のように識別されること。
- 未来30 mm/h以上の強雨予測Pushが実機まで届くこと。

**完了扱い:** RAIN_RETURNINGの初実Push確認は完了したため、これを「未確認」の次工程へ戻さない。
