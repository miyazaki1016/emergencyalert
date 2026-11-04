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
