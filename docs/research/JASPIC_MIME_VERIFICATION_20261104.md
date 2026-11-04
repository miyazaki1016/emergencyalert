# MIME無送信生成・旧除外処理の追加検証

本書はPR #155の継続作業。旧PC、Gmail、Supabase本番へ接続・変更しない。実メール送信、デプロイ、cron有効化、PRマージはしていない。Gmailパスワードはユーザー方針により変更も失効も行わない。過去の露出リスクは残り、値は一切転記しない。

## 実装と比較範囲

- `tests/jaspic/oracle/LegacyMime.cs` は旧HomeControllerの3メソッドと同じFrom/To/Cc/Subject、空の表示名を持つMailboxAddress、BodyBuilder.TextBody、ToMessageBodyを使用。本文式は前回のoracleを再利用。旧csprojのMimeKit 4.12.0に固定し、SMTPコード/資格情報/ネットワーククライアントは含めない。
- 6合成入力（3種×新規/更新）に日本語・全角・半角・引用符・バックスラッシュ・`&<>`・空文字・nullを含める。実事案は使わない。新実装は既存`generateMail`を呼び、本文生成を重複させない。
- 生成直後、SevenBit、EightBitの3段階＝18通を別ファイルへ出力。日時とMessage-IDだけ固定。CRLFを明示し、送信準備の最大行長998は旧MailKit 2.4.1のコードと照合した。SMTPサーバーの機能通知によって制約が選ばれるため、今回実際のGmail接続時の選択は未観測。
- .NET 8版に加えて、Windows用の.NET Framework 4.7.2ターゲット（Newtonsoft.Json 13.0.3 / MimeKit 4.12.0）を作成。C#本文・MIME生成コードは共用し、実行基盤だけ分ける。Windows CI結果を別に記録する。Windows最新runnerでnet472ターゲットを動かす試験は、旧ユーザーPC自体の再現とは区別する。
- 新しい`mime.ts`はDeno/ブラウザ標準のTextEncoderと純粋なbase64処理だけで生成する。ネットワークAPIと秘密値アクセスはない。旧仕様の固定ヘッダーに限る実装で、一般用途のメールライブラリとして使用しない。既存Edgeの実行経路には接続しない。

| 項目 | 実測した旧仕様・新実装の扱い |
|---|---|
| 論理Subject | 先頭半角スペースを保持 |
| MIME Subject | MimeKitは先頭スペースを正規化し、ASCIIプレフィックス＋日本語部分のUTF-8 RFC2047 base64となる。新実装もその出力に一致。論理Subject自体は変更しない |
| From/To/Cc | 空表示名、元アドレスを保持。滋賀のCcだけ別アドレス |
| MIME-Version | 1.0 |
| Content-Type / charset | text/plain; charset=utf-8 |
| 生成直後のCTE | ヘッダー未設定。本文はUTF-8生バイト |
| SevenBitのCTE | この6入力ではbase64、76文字で折り返し、CRLF終端 |
| EightBitのCTE | この6入力では8bit、UTF-8本文とCRLFを保持 |
| ヘッダー順序・折返し | 固定ヘッダーは折返しなしで一致。本文/CTE以外の行もrawバイト比較対象 |

全バイトのテストではDate/Message-IDも固定して比較する。比較スクリプトでも検証し、同スクリプトは実メールの可変輸送ヘッダーを列挙して除外するだけ。追加で重要ヘッダーを除外していない。CTE未設定の旧生成直後を扱うため、明示的な`--unprepared`モードを追加した。設定済みと未設定を同一視しない。通常モードはCTEを必須とする。

**限定事項**：MimeKitがquoted-printableを選ぶ低い非ASCII比率、`From `で始まる行、998byteを超える行、NUL、非CRLFは未対応で、新実装は生成を拒否する。勝手にbase64へ変更しない。SevenBitのbase64選択閾値は公式4.12のBestEncodingFilter（count8 >= floor(total×0.17)）と照合。将来、対象入力の拡張には追加の旧版比較が必要。BinaryMime制約、SMTPUTF8、SMTP dot-stuffing、Gmail側の書換え、実配送のヘッダーは今回再現しない。

## 再現コマンド（SMTP不要）

```bash
dotnet restore tests/jaspic/oracle --locked-mode
dotnet run --project tests/jaspic/oracle -- --mime tests/jaspic/mime-fixtures.json /tmp/jaspic-old-eml
node --experimental-strip-types scripts/jaspic-generate-eml.ts tests/jaspic/mime-fixtures.json /tmp/jaspic-new-eml
node scripts/compare-jaspic-eml.mjs /tmp/jaspic-old-eml/shiga-person-new-eight-bit.eml /tmp/jaspic-new-eml/shiga-person-new-eight-bit.eml
node scripts/compare-jaspic-eml.mjs /tmp/jaspic-old-eml/shiga-person-new-unprepared.eml /tmp/jaspic-new-eml/shiga-person-new-unprepared.eml --unprepared
npx vitest run tests/jaspic
```

Nodeは22.18以降または24を使用。CIでは全18ファイルを比較する。Windows版は`dotnet build tests/jaspic/legacy-framework -p:RestoreLockedMode=true`の後、出力されたLegacyFramework.exeに`--mime 入力JSON 出力先`を渡す。NuGet lockfileも保存する。

MimeKit 4.12.0にはGHSA-g7hc-96xr-gvvxの既知警告がある。旧版再現用テスト依存だけに限定し、アドレスは旧固定値、入力は合成情報、SMTP APIは持たせない。本番依存へ追加しない。警告を隠さず、旧PCのライブラリも更新していない。

## Gmail実配送原本の読み取り監査（2026-11-04、無送信）

ユーザーが接続したGmailアカウントの**既存メールを読み取り専用で確認**した。メール原本の本文・事件内容・Message-ID・個人情報・raw MIME全体はGit/PR/CIに保存していない。SMTP接続・送信は一切行っていない。

| 項目 | 広島の旧送信メール | 滋賀の旧Cc受信メール |
|---|---|---|
| 確認日時（JST） | 2026-11-04 09:13 | 2026-11-04 09:08 |
| 件名（復号後） | `[JASPIC-NES] 広島県警専用ツール` | `[JASPIC-NES] 滋賀県警専用ツール` |
| 本文見出し | `[JASPIC - NES] 広島県警アラート（新規）` | `[JASPIC - NES] 滋賀県警アラート（新規）` |
| Content-Type | `text/plain; charset=utf-8` | `text/plain; charset=utf-8` |
| Content-Transfer-Encoding | `8bit` | `8bit` |
| From（配送原本） | `miyazaki1016@gmail.com` | `miyazaki1016@gmail.com` |
| To | センター受信アドレス | センター受信アドレス |
| Cc | 広島用Cc | 滋賀用Cc |

**重大な差分・本番切替ブロッカー**：既存の旧MimeKit oracle／新TypeScript生成器は `From: hppmap@kishibojim.online` を固定しており、今回確認した**配送済みGmail原本の `From: miyazaki1016@gmail.com` と一致しない**。したがって「旧C#と新TypeScriptの18通一致」はあくまで**送信前の生成段階**の一致であり、実配送ヘッダーの完全互換を証明しない。Gmail側のFrom書換え、旧SMTPクライアントの送信時設定、あるいは他の経路が原因かは現時点で未確定。**固定Fromを推測で変更しない**。送信経路とGmailの差出人エイリアス設定を読み取り調査し、旧実配送原本に合わせる方法を別途検証すること。SMTP envelope-fromと最終受信側Fromも未確認。

観測した実配送原本は両県とも `8bit` であり、既存の `eight-bit` 合成ケースに整合する。ただし実事件レコードと完全に同じ入力からの新MIME生成・バイト比較は未実施。件名の表示文字列だけではRFC2047のヘッダーバイト一致を証明しない。長行・quoted-printableなど未対応入力の扱いも従来どおり切替ブロッカー。

滋賀の旧完了通知は同日09:08の実行について `不審者 9/0（708） 件送信しました`、続く実行では `0/0（708）` と報告している。**708の意味、実際の公開JSON取得の成功、現在のデータ取得先は完了メールだけでは確定しない**。旧PCの実行ログ／取得結果を読み取りで検証すること。滋賀の新collectorは引き続き404で送信禁止。

結論：**配送済み原本の存在と重要ヘッダーは確認できたが、実配送の完全互換認定は保留**。実メール送信・本番DB/cron/Edge変更・旧PC停止・PRマージ禁止を維持する。

### 旧C#送信経路の追加照合（2026-11-04、コード読取りのみ）

旧リポジトリ `master:Controllers/HomeController.cs` の**センター向け個別メール送信関数**を再確認した（認証秘密値は取得・転記・表示しない）。

- 広島犯罪メール：旧ソースL3126–3149、広島不審者メール：L3221–3244。両方ともSMTP接続先は `smtp.gmail.com`、認証ユーザーは `miyazaki1016@gmail.com`。一方、`MimeMessage.From` に指定する値は `hppmap@kishibojim.online`。SMTP送信には `smtp.Send(mail)` を使用する。
- Gmailで観測した旧配送原本は `From: miyazaki1016@gmail.com`。したがって**「旧ソースのFrom指定」→「Gmail SMTP認証」→「受信済みメールのFrom」**という経路に差異があることが具体的に確認できた。
- **最有力仮説**はGmail SMTPによる送信元アドレスの置換・エイリアス扱い。ただし旧PCからのSMTP DATAと受信側ヘッダーを直接比較しておらず、どの段階で変わったかは**未確定**。他の送信経路や受信時変換の可能性も排除しない。
- **重要な設計上の帰結**：新TypeScriptの送信前MIMEに旧ソースと同じ `From: hppmap@kishibojim.online` を置くだけでは、最終配送原本が一致するとは限らない。逆に新生成器のFromを観測されたGmailアドレスへ直接書き換えるのも、原因未確定なので行わない。送信経路の再現条件（SMTP認証主体、Gmailの送信元エイリアス、envelope-from、受信側最終ヘッダー）を別ゲートとして確認する。
- 次の**無送信**検証：Gmail側の「他のメールアドレスを追加」設定の有無をユーザー承認の範囲で読取り確認。旧PCの設定やログを安全に確認できる場合は接続設定のメタデータだけ照合する。新実装のメール送信経路を決める前に、Gmail経由と別サービス経由の差異を設計資料に列挙する。
- 本項はソースコード読取りと既存メール原本の観測に限る。SMTP認証試行、テスト送信、実送信、資格情報変更、Supabase本番変更、PRマージは行っていない。

## 実配送原本との比較手順（未実施）

1. 旧PCで既に送信済みのメール、またはCcで受信済みのメールを、利用中のメールソフトの「メッセージのソースを保存」「原文をダウンロード」等の読取り操作で.emlとして確保する。新規送信・Gmail SMTP接続は不要。旧PCへは今回アクセスしていない。
2. 実事案を含む原本はローカルの非公開一時領域だけに置き、Git/PR/Issue/CI artifactへアップロードしない。秘密値を含むログも採らない。
3. 同じ入力から旧版と新実装のemlを非公開領域で生成する。実配送が7bit/8bitのどちらかを原本のCTEで確認し、対応する制約で比較する。quoted-printable等なら現段階では未対応として止める。
4. 比較スクリプトの既定除外以外の不一致はヘッダー項目・生バイト・復号本文を安全なローカル環境で調べる。Gmail由来の差に見えても、推測で除外へ追加しない。公開報告は一致/不一致の項目だけにする。
5. 旧ソースからの生成一致は実配送一致の証明にならない。6パターンの旧実メール原本が揃っていないため、**メール全体の完全互換・本番送信可は認定しない**。

## 滋賀の再調査

現在の公開トップページが参照するNuxt entry.Cpue5Fho.jsを通常のGETで確認した。APIクラスは公開相対パスへ時刻queryを付けてfetchする。新しい市町・住所参照は`/data/geo/address.json`、不審者は引き続き`/data/map/suspicious_person_full.json`。メール一覧の別パス`/data/map/suspicious_person_mail.json`も公開JSに存在するが、事件データと同じ仕様とは認定しない。

旧cities.json、不審者full.json、現行address.jsonは今回の環境から404 / text/html。トップやJSが200でも、データ不存在かアクセス制限かは断定できない。旧ChromeDriverの利用理由がアクセス制限だったというユーザーの記憶と整合する可能性はあるが、原因を証明したものではない。認証回避、ブラウザ偽装による突破、推測URLの追加は行わない。市町参照スキーマも未確認。公開取得が確認できるまでは既存collectorを失敗扱いのまま維持する。

## 広島 hppmaps.LINKKEY の意味

旧HomeController（blob 49f2ab4233a00456b440ca1ac2072f36a7eee18e）の`Hpp_Map()` L2244付近はLINKKEYで既存確認し、新規なら旧sendmailを呼んだ後に旧一覧を保存する。ただしカテゴリ除外時や一部送信失敗時にも保存されるため、**hppmapsは送信成功の証明ではなく、旧地図方式で扱ったIDの一覧**と読むべきである。

`Hpp_Map2()`はこの一覧を取り出し、広島不審者の新規と更新の両方で`!old.Contains(json.id)`を送信条件にしている。犯罪メールや滋賀にはこの除外を適用しない。旧→新の地図方式切替に伴う二重取込み防止が目的と考えられるが、当時の意図そのものの記録はなくコードからの推論である。

| 場面 | 公開baselineだけで代替できるか |
|---|---|
| baseline内IDの内容が変わらない | できる：初回/再実行とも送信候補0 |
| baseline後に消えた同じIDが同内容で再掲 | できる：ID状態を残す設計 |
| 旧除外IDがbaseline後に更新 | できない：旧版は恒久除外、新版baselineだけでは更新候補になる |
| baselineに存在しない旧除外IDが再掲 | できない：公開baselineに履歴がない |

完全な送信判定互換を保つには、原則として旧hppmapsの**LINKKEYだけのdistinct集合**が最小の必要データとなる。本文・住所・人物情報・SQL Server全体は不要。現在公開中のIDとの交差だけでは将来の再掲漏れが残る。量が問題なら件数とIDの保持量を先に調べる。ID再利用の有無が不明なまま発生日で削らない。

今回、`plan`へ信頼済みの旧広島不審者ID集合を渡すオプションを追加し、新規/更新の両方の候補抑止、比較状態の継続更新、犯罪への非適用をテストした。実際の集合は取得しておらず、Edge/DBへ取り込んでいない。旧SQL Serverにはアクセスできていないため、件数・IDの重なり・保存量は未確認。全SQL Server移行とは別の、ID集合だけの読取り取得と承認された保存方法を今後決める必要がある。

## 参照した一次資料

- 旧対象リポジトリのHomeController.cs / csproj / packages.config（認証行は出力しない）
- https://raw.githubusercontent.com/jstedfast/MailKit/2.4.1/MailKit/Net/Smtp/SmtpClient.cs
- https://raw.githubusercontent.com/jstedfast/MimeKit/4.12.0/MimeKit/IO/Filters/BestEncodingFilter.cs
- https://mimekit.net/docs/html/Frequently-Asked-Questions.htm
- https://github.com/advisories/GHSA-g7hc-96xr-gvvx

検証の実測結果・CIの最終コードSHAはPR #155へ追記する。

## 最終コードの検証証拠

- コードhead: `ec6cfeb1b5c080f4c8c323147eb9eddde6289908`。主実装 `da2eee72e27b645e1ac620d743ecbb3d5a77c2f9`、WindowsのNuGet復元条件修正が後続。
- ローカル：39ファイル390テスト成功・失敗0、Next build成功、Edge/MIME strict TypeScript成功。従来81パターンの本文goldenは不変。新旧eml18通は全バイト一致。
- 通常CI #1382（4ジョブ）：https://github.com/miyazaki1016/emergencyalert/actions/runs/41761205793 — success。
- JASPIC CI #4（3ジョブ）：https://github.com/miyazaki1016/emergencyalert/actions/runs/41761205702 — success。Linuxの旧新MIME/本文/型、Windowsの.NET Framework実行＋18 golden不変＋19 MIMEテスト、隔離Postgresの権限/排他/重複防止を確認。
- 初回Windows試験はNU1004で停止した。SDK/OSによる暗黙のruntime identifierとReferenceAssemblies追加の違いが原因。win-x64と参照パッケージを明示し、lockfileを再生成してlocked restore成功へ修正した。MIMEの差異を除外して通したものではない。
- この検証記録追記は文書のみ。最終PR headでの結果もPR #155に記録する。実配送原本・滋賀データ取得・旧除外IDの実取得は引き続き未完了。実送信・SMTP接続・本番変更なし。
