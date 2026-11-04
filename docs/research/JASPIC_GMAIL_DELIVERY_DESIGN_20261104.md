# JASPIC Gmail 配送設計（2026-11-04 / 送信禁止の設計段階）

## 決定済みの要件
- 新システムは **Gmail 経由**で送信することを希望。配送先から見える **From は `miyazaki1016@gmail.com`** とする。
- 広島の犯罪・不審者、滋賀の不審者は独立して収集・判定・配送する。初回 baseline は送信ゼロ。
- 本文・件名の生成互換試験を維持する。既存 `mail.ts` は旧 C# の生成前 From を保持し、`mime.ts` は SMTP を持たない。送信方式を決める前に、生成前 From と配送後 From を混同して書き換えない。
- **設計希望は送信許可ではない**。実 SMTP 接続、送信テスト、実配送、本番 Edge/DB 変更、18時 cron 起動、旧 Windows 停止、PR マージは未許可。

## 既存実装と観測
- 旧 Windows C# の広島の通常送信経路は MailKit `SmtpClient` → Gmail SMTP 465 (`SecureSocketOptions.Auto`) → 認証 → `smtp.Send(mail)`。`MimeMessage.From` は旧別ドメインの値で、明示的な SMTP envelope-from は渡していない。
- Gmail に保存された旧配送原本では From / Return-Path は Gmail 認証アカウントで、本文は UTF-8・8bit。**どの段階で書換えが生じたか、センター最終受信のヘッダーは未確認**。
- `generateEml` は合成データの MimeKit 比較用であり、Gmail SMTP 配送結果を保証しない。未検証の quoted-printable、超長行、`From ` 行などは fail closed。

## 送信方法の候補（未採用）
1. Gmail SMTP: 旧経路に近い。ただし Supabase Edge/Deno 実行環境での外向き SMTP 465 接続制約、TCP/TLS 対応、Gmail が受理する認証方式、Google の送信限度を**送信前に**確認する必要がある。Gmail の通常パスワードは新環境へ複製しない。
2. Gmail API: API 経由の送信も Gmail 経由の要件には適合し得る。ただし OAuth2 の認可・更新トークン安全管理と、元の SMTP と異なる MIME / envelope / Return-Path の振る舞いを区別して検証する。SMTP と同等だと推定しない。

## 推奨する実装境界（無送信で作る場合）
- `mail.ts` / `mime.ts` の旧版互換ロジックは維持し、**配送アダプターを別モジュール**にする。
- アダプターの呼出しは既存 dry-run Edge Function から隔離し、既定では動作不能とする。認証情報が存在しても暗黙に送信しない。
- 型付けされた配送依頼（kind、本文、To/Cc、希望 From、冪等キー、生成済み MIME）を扱い、配送前に宛先・From・Content-Type・CTE を厳格に検証。件名と本文を再整形しない。
- SMTP envelope-from、ヘッダー From、Reply-To、Return-Path は**別の概念**として設計する。Return-Path は最終配送側が決め得るため、送信前に固定して一致を宣言しない。
- キュー状態は NEW / LEASED / ACCEPTED / UNKNOWN / FAILED のように区別し、SMTP/API のタイムアウト後に自動で重複送信しない。県別に独立した冪等キー・処理状態を保つ。
- Secrets は専用の安全な管理方法と最小権限で保護する。認証情報、メッセージ原文、住所や管理番号を GitHub/CI/ログに書かない。既存 Gmail パスワードの変更・失効を勝手に行わない。

## 送信なしで先に満たす受入ゲート
- [ ] Gmail SMTP 465 を採るか Gmail API を採るか、Supabase Edge の実行制約と認証方式を根拠付きで比較し、ユーザーと確定する。
- [ ] 偽 SMTP / 偽 HTTP transport を注入するユニットテストで、From が希望アドレスであること、本文・件名が不変であること、宛先やヘッダーの検証、エラー/タイムアウト/冪等性、シークレット非露出を確認する。外部接続は禁止。
- [ ] 旧生成前 MIME と Gmail 配送後ヘッダーの差分を明記し、実送信前に変更が必要な箇所だけを隔離する。既存の新規97通・更新593通の本文生成検証を退行させない。
- [ ] 独立した広島・滋賀の経路、初回 baseline 送信ゼロ、cron 無効、dry-run 送信ゼロを保つ。
- [ ] 全体型チェックの既存エラーと新規エラーを切り分ける。
- [ ] センター最終受信原本を伴わない限り「センター配送互換 PASS」とは判定しない。最終配送試験には別途ユーザーの明示承認を求める。

## 次の実装の指示
既存 Draft PR #155 から継続し、まず SMTP と API の技術的適合性を読み取り・公式資料ベースで検証する。可能なら選択した方式の **ネットワーク接続を伴わない**アダプターとテストを実装する。配送機能を本番 Edge に結線しない。認証・送信や SMTP 到達性を試験したと誤報告しない。


## オフライン実装とCI結果（2026-11-04）

送信不能な純粋関数 `supabase/functions/_shared/jaspic/gmail-dry-run.ts`（commit `25f1af17`）と専用テスト `tests/jaspic/gmail-dry-run.test.ts`（commit `efcfd480`）を Draft PR #155 のブランチに追加した。旧版 `generateEml` の MIME データから Gmail API 用 base64url `raw` を作成する前に、予期する旧 From のみを希望する Gmail From に差し替える。本文を保ち、想定外のヘッダーや改行形式は拒否する。**送信API・OAuth・fetch・SMTP・Secret読込機能はない**。この From 差し替えは送信仕様の最終確定やセンター互換PASSを意味しない。

commit `efcfd480c24782af84345a657817b09c55181d87` に関連する GitHub Actions の読取り結果：通常 CI run **41848065946** = success、PR promotion classification run **41848066091** = success、JASPIC isolated compatibility run **41848065893** = success。これらはコードの CI 結果であり、Gmail API での送信、Google の認証、From の配送表示、センター最終受信を検証したものではない。CI とは独立に、追加コード単体の本番動作も確認していない。

次の承認ゲートは認証方式（個人 Gmail OAuth2 同意、アクセストークン更新、資格情報保存とローテーション、権限 `gmail.send`）を確定し、実運用前に実送信を伴わないトランスポートモックと障害時の冪等動作を追加すること。実送信、SMTP/API 認証試行、本番変更、cron、旧 PC 停止、マージは引き続き禁止。


## Google公式資料によるOAuth運用上の制約（無接続調査）

- Gmail API `users.messages.send` は `POST /gmail/v1/users/me/messages/send` と raw base64url MIME を使う。最小限の送信権限として `https://www.googleapis.com/auth/gmail.send` を要求する。閲覧・削除権限を必要以上に追加しない。公式： https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send 、https://developers.google.com/workspace/gmail/api/guides/sending
- 個人Gmailの定期送信には本人のOAuth2同意と、offline accessのrefresh tokenが必要。Google CloudのOAuth同意画面が **External / Testing** の場合、Gmail送信スコープで発行したrefresh tokenは通常 **7日で失効**。18:00の日次運用に使う前に公開状態・本人利用の可否・必要な審査/検証要件を必ず確認する。単なる「Testingで登録して終了」は不可。公式： https://developers.google.com/identity/protocols/oauth2
- refresh tokenは権限取り消し、一定期間未使用、パスワード変更、発行数超過などで失効し得るため、秘密管理・再同意手順・異常通知の設計が必要。アカウントからの認証データをリポジトリ/PR/ログに出さず、チャットで認証コード/秘密文字列を要求しない。
- 今回の `gmail-dry-run.ts` / `gmail-api-request-offline.ts` は純粋な準備関数のみで、実際の認可・通信・配送完了を保証しない。Google APIの結果からSMTP envelopeやセンターのReturn-Pathを事前に確定したとは扱わない。
- ユーザー操作が必要になる段階：Google Cloudプロジェクト（Gmail API有効化・OAuth consent）とOAuth client作成、権限付与。すべて実送信許可とは別のゲートである。


## Google一次資料による個人利用と7日制限の判断（2026-11-05）

Google公式資料を確認した結果、**個人利用のOAuth審査例外と、External/Testingのrefresh token 7日失効は別の規則**である。個人利用で審査の提出が不要でも、Testingで発行するGmail送信scopeのrefresh tokenが長期有効になるわけではない。

- Google OAuth policy: 個人利用（本人のみ、または個人的に知る少人数）には一部の本番要件の例外。https://developers.google.com/identity/protocols/oauth2/policies
- Google sensitive scope verification: 個人利用は審査申請の例外になり得るが、未確認アプリの警告と人数制限は別に残る。https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification?hl=ja
- Gmail `gmail.send` は sensitive scope。https://developers.google.com/workspace/gmail/api/auth/scopes?hl=ja
- External + Testing の refresh token は、プロフィール系scopeのみの例外を除き、**発行後7日で失効**。本人利用だから免除とは記されていない。https://developers.google.com/identity/protocols/oauth2
- Google Cloud Help: 外部アプリを Published にするにはホームページとプライバシーポリシー等のApp Domain情報が必要。ホームページのドメイン所有権確認が必要になる。https://support.google.com/cloud/answer/15549049?hl=en

現在、本人のGoogle Cloud画面で「アプリを公開」が無効、ブランディングのホームページ・プライバシーポリシー欄が空欄だった。**Google Cloudの画面上で公開できること、審査例外が実際に適用されること、Refresh tokenが7日を超えて使えることは、まだ確認できていない。** ボタンの無効化がこの2項目だけに起因すると断定もしない。

現実的な二択：(A) Testingで限定期間の無送信認証準備とモック実装を進める（長期18:00送信には使わない）、(B) ユーザーが所有・検証可能なドメインと正しいプライバシー文書を準備して公開の前提を満たす（公開や審査を保証しない）。今回、ドメインなしで7日失効を正式に回避する方法は公式一次資料では確認できなかった。**未確認の回避策や定期的な手動更新を恒久対策として採用しない**。公開ドメイン、OAuth client secret、refresh token、認証コード等はGitHubに保存しない。実送信・本番変更・cron起動・PRマージは行わない。
