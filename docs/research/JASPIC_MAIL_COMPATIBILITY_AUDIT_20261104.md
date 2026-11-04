> **実データ検証追記**：対象日2026-11-04の新規97通は同じ公開JSON IDから再生成し、本文UTF-8全バイト・CRLF・Subjectヘッダーバイト一致。実更新メールは未確保、配送全体の互換は未認定。詳細は [実データ検証記録](JASPIC_REAL_DATA_VERIFICATION_20261104.md)。今回、本番変更・送信・SMTP接続・マージなし。

> **今回の継続更新**：3種×新規/更新の6ケース、生成直後/SevenBit/EightBitの18通で、旧MimeKit 4.12と新TypeScriptのeml全バイト一致を確認。Windows net472ターゲットのCIも追加。実配送原本は未確認なので完全互換認定・送信は引き続き禁止。最新詳細は [MIME追加検証](JASPIC_MIME_VERIFICATION_20261104.md)。Gmailパスワードは変更・失効しない。旧hppmapsは更新も恒久除外するためbaselineのみでは代替不可。以下の「MIME生成未実装」は前回時点の履歴。

> **2026-11-04 Work追記：実装・無送信検証へ進行（本番未変更）。** ユーザーからコード・テスト・PR更新を許可。旧本文C# oracleの81合成パターンと移植版のUTF-8バイト一致、広島ライブ6,048件のbaseline候補0・再実行0・合成更新1を確認。県別Edge準備・専用SQL案・排他/容量ガード・MIME差分検出を追加。**MIME原本照合・新sender実装・滋賀ライブ取得・旧hppmaps除外互換は未完了**。下記旧「未許可・未実施」は監査開始時点の履歴。最新の切替ゲート・ロールバックは [手順書](JASPIC_CUTOVER_RUNBOOK_20261104.md) を参照。実メール送信、本番DB、デプロイ、cron、旧PC停止、PRマージは未実施。

# JASPIC-NES メール互換・独立収集移行監査（2026-11-04）
> **設計・読み取り監査のみ。** 本書でメール送信、本番DB変更、定期起動、デプロイを許可しない。
> 開発管理: [Issue #154](https://github.com/miyazaki1016/emergencyalert/issues/154)。旧コードの正本: private repository `miyazaki1016/fushinsha-joho.kishibojim.online` の `master:Controllers/HomeController.cs`。

## 要求
- 広島 `Home/Hpp_Map2` と滋賀 `Home/Shiga` は互いに完全独立した収集・比較・送信処理。
- 日本時間で毎日18:00に各々1回を想定。雨通知・watch-rain・PR #109に干渉しない。
- センター受信システムがメールを機械解析するため、**subject / body / MIME / envelope / From / To / Cc を旧実メールと比較してから**切り替える。表記やCRLFを「改善」しない。
- 送信先 `getter01@jaspic-nes.net`。2026-11-04は既存PCですでに送信済み。移行テスト中のセンター宛送信は禁止。
- 旧SQL Serverのデータ移行なし。警察側の全件取得を初期baselineとし、初回は送信ゼロ。baseline未完成時は収集失敗として送信禁止。
- サキくるへの転用は今回のスコープ外。センターから将来直接データ提供を受ける想定。

## 旧実装（読み取りで確認）
| 観点 | 広島 | 滋賀 |
|---|---|---|
| Action | `Hpp_Map2()` L2669-3043 | `Shiga()` L3278-3416 |
| API | `cities_master.json`、`police.json`、`suspicious_person3.json`、`criminals.json` | `cities.json`、`suspicious_person_full.json` |
| 取得 | `WebRequest` | `Selenium ChromeDriver`（HTMLの`<pre>`を剥がす） |
| DB | `suspicious_persons`、`criminals` | `suspicious_person_shiga` |
| 差分 | 既存IDと比較。緯度・経度の差分比較はコメントアウト | 既存IDと比較。緯度・経度の差分比較はコメントアウト |
| 個別メール | `criminal_mail` L3048以降 / `suspicious_person_mail` L3183以降 | `suspicious_person_shiga_mail` L3419以降 |
| 個別メール件名 | 先頭半角スペース付き ` [JASPIC-NES] 広島県警専用ツール` | 先頭半角スペース付き ` [JASPIC-NES] 滋賀県警専用ツール` |
| 本文見出し | `[JASPIC - NES] 広島県警アラート（新規/更新）` | `[JASPIC - NES] 滋賀県警アラート（新規/更新）` |
| 行末 | C#文字列内の `\\r\\n`（CRLF）。差分注記の全角空白・矢印・`●更新`を含む | 同じ。都市名・カテゴリ名も埋め込み |
| 宛先 | センター + 旧コード上のCc | センター + 旧コード上のCc |
| 正常時 | SMTP成功後に保存処理／送信結果集計。センター宛とは別の完了メールあり | 同上。独立完了メールあり |

**重要**: 旧コードにはSMTPおよびSQL Serverの資格情報が埋め込まれている。値は本書、テスト、Issue、ログ、PRにコピーしない。最新のユーザー方針はGmailパスワードの変更・失効を行わないこと。過去の露出リスクを残したまま、新システムはSecrets管理を前提とする。値をコピーしない。

## メール互換の落とし穴
1. 件名の先頭半角スペース、`JASPIC-NES` と本文中 `JASPIC - NES` のスペース差異。
2. `\r\n`（CRLF）と最終行の改行有無、`---`区切り、全角スペース、矢印 `→`、`●更新`。
3. 新規/更新で本文末尾の `●` と項目ごとの更新マーカーが変わる。
4. `DateTime.Parse` に基づく `yy.MM` の月表記とURLクエリのパラメーター順。
5. 旧C#の `null` 文字列結合挙動、数値・日付の表現、URLエスケープ。JSONとして整形し直すのは禁止（本文は**JSON風＋注釈**であり純JSONではない）。
6. 同じSMTPの外見でも、送信サービス変更でMIME/文字コード/転送エンコーディング/ヘッダーが変わりうる。**旧実メールの原本（.eml）を、資格情報と個人情報を除いて比較**するまで完全互換を宣言しない。
7. 解析宛先へのテスト送信は禁止。テスト先アドレスの置換も、本番互換の最終確認とは区別する。

## 元コードの振る舞いと再実装判断待ち
- 広島で `invalid.Contains("自転車盗")` という除外を使用。
- 広島の犯罪情報の新規処理には `2023/06/01` 下限と、日時・IDの組み合わせによる重複類似チェックがある。広島不審者の処理では `hppmaps` 旧一覧との重複チェックがある。**単純なID+ハッシュへの置換では旧挙動と必ずしも一致しない。**
- 滋賀の情報には `2024/01/01` の発生日下限があり、`case_type` の番号からカテゴリ名を引く。
- 旧版は一部、送信成功後にDBへ保存している。SMTP受理・DB保存の間のクラッシュ、タイムアウトで結果不明となったときの重複送信リスクあり。新方式は送信キュー/lease/結果不明（`UNKNOWN`）の状態遷移を設け、勝手に自動再送しない。
- **送信判断を単に発生日「今日以降」にするのは誤り**。初回baselineの公開データ集合との差分で新規・更新を決め、旧仕様の除外・フォーマットを維持する。
- 取得JSONが不完全・0件・項目欠落・キー変更の場合、初回baselineを上書きしない。県ごとに独立して失敗を報告。
- 旧完了メールと個別事件メールは別経路。センターへ送るのは従来の個別メールだけに限定し、管理向け完了通知は別扱い。

## 開発手順・検証ゲート（次の一手）
1. 3つの旧メール生成関数について、**件名・本文・ヘッダーのgolden fixture**を広島犯罪/広島不審者/滋賀不審者各「新規」「更新」で用意する。fixtureは架空の事件ID・住所などで作り、旧コードを正としてバイト比較。旧実メール原本が用意できればMIMEも比較。
2. 取得元APIへ**読み取りのみ**で接続確認。対象件数・最低必須フィールド・欠損・提供利用条件を確認し、取得失敗と「0件の正常配信」を区別。
3. 同じSupabaseプロジェクトを使う場合も、県別収集/差分/送信キューとRLSを独立し、雨テーブルやwatch cronを変更しない。容量・定期実行のコスト・通知送信サービスのFrom/MIME互換性を評価。
4. 初回baselineを **dry-run** 作成しセンター送信ゼロを確認。複数回の無送信差分テストで、0件時に送信されず、模擬更新1件だけ送信候補になることを確認。
5. 旧PC側の手動実行停止、サーバー側の本番送信開始を同時に切り替えるための手順とロールバック手順を作る。
6. **ユーザーから実メール送信の明示承認があるまでは、スケジュールを設定しても送信無効（dry-run）**。

### 現段階の未実施事項
- 公開APIのライブ疎通 / 実データ件数
- .eml原本との互換性比較 / コード変換 / テストの実行
- SupabaseのDB移行・Edge deploy・cron作成 / メール送信

## Work実装・検証記録（2026-11-04 JST）

- 本文oracle：旧 HomeController.cs blob 49f2ab4233a00456b440ca1ac2072f36a7eee18e から3メソッドの本文式だけを抽出。資格情報・SMTP・DBアクセスなし。tests/jaspic/oracle/Program.csで同式を.NET SDK 8.0.427上実行。対象フィールドは旧JSONモデル同様string。合成入力81件のgoldenとTypeScript出力のUTF-8バイト比較を実施。件名・From/To/Ccも旧定数をテスト。**.NET Framework実環境とSMTP輸送MIMEの再現ではない**。
- ローカル全体：38ファイル・369テスト成功。npm run build成功。両新規Edge entrypointのstrict TypeScriptチェック成功。専用SQLを隔離PGlite/Postgresエンジンで実行しRLS/権限/CAS/無送信baseline/重複版/lease/UNKNOWNを検証成功。実Postgresの並行競合は専用CIで検証予定。
- 広島live GET：市町30、署321、不審者452、犯罪5,596件。メモリ内比較で初回候補0・再実行0・合成更新1。比較payload 2,628,526 bytes。公開情報GET以外の外部変更・本番DB保存・送信なし。
- 滋賀live GET：旧cities.jsonとsuspicious_person_full.jsonは404。現行Nuxt公開JSにも不審者の同パスあり。address.json / suspicious_person_mail.jsonも404。User-Agent/Refererと時刻query付きGETでも不審者JSONは404。**ChromeDriver不要の本番取得を実証できていない**。
- 滋賀公式案内 https://www.pref.shiga.lg.jp/police/pa01/15767.html に2025-10-01の犯罪/交通事故マップ統合の記載。現行JSから旧cities対応表は未確認。URLを推測して自動切替しない。
- 利用条件：公開情報であることは確認したが、継続的な外部再配信に関する条件の最終確認は未完了。切替前に確認する。
- 新MIME生成/SMTP送信実装は未実装。.eml厳格比較ツールと不一致検出テストのみ追加。旧実メール原本の照合なしに「完全互換」と認定しない。
- 既存滋賀renderer入口を共通移植実装へ接続し重複実装を除去。nullと空文字の比較も旧C#に合わせた。既存4テスト成功。
- DB/cronは自動適用しないSQL準備ファイル。UTC09:00＝JST18:00の独立2ジョブ案。実cron未作成。
- Supabase changelogとEdge schedule/Vault公式資料を確認。2026-11-10予定のTLS CBC cipher廃止は現行HTTPSクライアント利用を前提とする。古い.NET SMTP接続の安全性の根拠とはしない。
- セキュリティ記録：旧認証値を除く表示処理が不十分で初期ツール出力に旧認証情報が含まれた。ユーザーへ通知済み。生成コード・fixture・資料には値をコピーせず、認証コードパターンの走査でも混入なしを確認。旧資格情報の失効/再発行は未実施。
- 未解決：旧hppmaps除外一覧、MIME/送信実装、滋賀の現行取得と都市参照表、利用条件、本番容量/Edge実行制限、承認後のDB適用と切替。切替手順書にゲートを記載。
- GitHub検証済みコードhead: `dc39ac480bd6ba78888b03143c9e2b487e6d19a5`。通常CI #1379の4ジョブ、専用JASPIC CI #1の2ジョブ、review-only分類 #96がすべてsuccess。
  - 通常CI: https://github.com/miyazaki1016/emergencyalert/actions/runs/41757454401
  - JASPIC CI: https://github.com/miyazaki1016/emergencyalert/actions/runs/41757454509
  - 実Postgres16で専用SQLと並行baseline/CAS・送信権claimの競合テストも成功。旧C#をCI上で再実行してgoldenの不変性を確認し、本文バイト比較・新Edge型チェックも成功。
  - この証拠追記は文書のみの後続更新。送信・DB・cron・デプロイ・マージは未実施。雨の実装差分がないこともmain比較で確認。
