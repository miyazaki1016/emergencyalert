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


## iPhone専用ウェブOAuth準備（2026-11-05、無認証・無送信）

ユーザーは現在Windows PCを使えないため、所有する `emergencyalert.news` で本人がiPhoneのSafariからGoogleのOAuth同意を行う方式を採用する方向。既存の **デスクトップOAuthクライアントは削除しない**。代わりにGoogle Cloudで **Web application クライアントを別途作成**し、認可済みリダイレクトURIを正確に `https://emergencyalert.news/jaspic/oauth/callback` と登録する計画。現段階ではまだそのクライアントは作成されておらず、callback URLも本番で稼働していない。

今回 `supabase/functions/_shared/jaspic/gmail-web-oauth-offline.ts` を追加。暗号学的乱数によるstateとPKCE verifier、S256 challenge、`gmail.send` 最小権限、`access_type=offline`、厳格なcallbackのホスト/パス/重複パラメータ/CSRF検査を**オフラインで**生成・検証する。専用テスト `tests/jaspic/gmail-web-oauth-offline.test.ts` も追加。**Googleとの認証通信、認可コード交換、Cookie設定、実トークン保存はまだ一切実装していない。**

callbackを本番で実装する前に必要な安全要件：本人確認済み管理者のみ開始可能、stateとPKCE verifierを短命・署名付きHttpOnly Secure SameSite=Lax Cookieまたはサーバ側保存に結びつけること、コールバックでのワンタイム消費とCSRF拒否、セキュリティヘッダー/Cache-Control no-store、クエリ内の認可コードをログ・アクセス解析・Referrerへ残さないこと、refresh tokenのサーバ専用暗号化保存・明示的な回転/失効手順。**Supabase Secretsへの保存は既存ランタイムSecretの更新権限を伴うため、具体的保存方式を決めずに「自動保存」と断言しない。** Google Cloudのclient secret / refresh token / codeをチャット・GitHub・ログに投稿させない。

本番にOAuthルートを公開する時は機能フラグで停止を初期値とし、送信モジュールには一切結線しない。公開ページ `/jaspic`, `/jaspic/privacy` は PR #156 にて独立管理されている。すでにmainへマージ済みの公開ページをPR #155で作り直さない。JASPIC 既存コードに関する変更はDraft PR #155に留め、実メール送信・SMTP/Google API接続・本番変更・cron有効化・旧PC停止・PRマージは行わない。


## Web OAuth認可コード交換のオフライン設計（2026-11-05）

ユーザーがGoogle Cloudでウェブアプリ用OAuthクライアントを作成済みと報告。クライアントID・シークレットそのものは受領しておらず、GitHubにも保存しない。

`supabase/functions/_shared/jaspic/gmail-web-exchange-offline.ts` に、PKCE付き認可コード交換の **HTTPリクエスト記述子を作るだけの関数**と、受け取る想定のトークン応答を検証する純粋関数を追加した。デイリー運用前提で `refresh_token` 欠落や `gmail.send` スコープ欠落を拒否する。テストは合成値のみ使用。

**未実装の重要ゲート**：本番 `/jaspic/oauth/callback` ルート（現行の公開サイトには未配置）、本人確認、HttpOnly短命state/PKCE検証・ワンタイム失効、Google認可コード交換の実通信、トークンの暗号化保存・更新/取消、監査用ログの秘密情報対策。サーバレスの並行実行時に再使用不能を保証するには永続トランザクションが必要。これらが完成する前に一般公開のOAuth開始導線を設置してはならない。

今回の変更は **オフライン関数・テスト・文書のみ**で、Gmail APIへの接続、同意画面の起動、トークン取得、Supabase Secrets書込、実メール送信、cron、本番デプロイ、PRマージは行っていない。


## iPhone OAuth短命セッションCookie（2026-11-05、オフライン準備）

`supabase/functions/_shared/jaspic/gmail-web-session-offline.ts` を追加。認証開始時に生成するstateとPKCE verifierを、サーバ側AES-256-GCMで暗号化して5分間のみ検証可能とするユーティリティ。Cookieポリシーは `__Host-jaspic-oauth`、HttpOnly、Secure、SameSite=Lax、Path=/。改ざん・期限切れ・state不一致を拒否する単体テストを用意した。暗号鍵はランタイム専用環境変数でのみ供給し、GitHub/チャット/画面へ露出させない。

**まだ認証フローとして有効化できない**：本人の管理者認証、サーバ側のワンタイム状態消費（CSRF再利用対策）、Cookie設定を行う実際の認証開始ルートとcallback、Googleへの実通信、tokenの暗号化・永続保管、アカウント本人性確認、適切な失効・監査・運用監視は未実装。暗号化Cookieだけでは1回限りの認証フローを保証できないため、いずれも本番有効化前の必須条件として扱う。今回はGitHub Draft PR #155内の純粋関数・テスト・文書の追加だけを行い、Vercel/Supabaseの環境変数、公開ページ、メール送信、cron、旧Windows運用、PRマージに変更なし。


## OAuth one-time state消費契約（2026-11-05、DB未接続）

`supabase/functions/_shared/jaspic/gmail-oauth-once-offline.ts` と単体テストを追加。OAuth開始時はstateのSHA-256ダイジェスト、本人を表すownerId、有効期限だけを永続DBへ登録し、callback時は **ownerIdと期限も含めた原子的な一回限りの消費** を必須とする契約を定義した。再利用、不一致、期限切れを拒否。テスト内ではローカルな擬似実装を使って同時16件の呼び出しに対し成功が1件であることを検証する。

**これは並列DB環境での排他制御が証明されたことを意味しない。** 本番DBの一意制約＋単一DELETE ... RETURNING等の原子操作、アクセス権制限（service role専用）、管理者本人の認証と確認、適切なリプレイ耐性、トークン暗号化保管、実callbackとGoogle連携はすべて未実装。OAuthで認証できる公開URLは引き続き作らない。

今回もDraft PR #155へのコード・テスト・設計書の追加のみ。本番送信、Gmail API通信、OAuth認可、Secrets、cron、Vercelデプロイ、既存Windows停止、PRマージは変更なし。


## OAuth状態のDB排他用SQL案（2026-11-05、未適用）

Draft PR #155に `supabase/migrations/20261105074100_jaspic_oauth_once.sql` を追加（**本番DBには実行していない**）。stateのSHA-256ダイジェストのみを主キーに保存し、ownerId・期限・消費時刻を持つ専用表を定義。RLS有効化、anon/authenticated/publicアクセス禁止、service_roleのみテーブル・関数を許可。サーバ側関数 `jaspic_consume_gmail_oauth_state(state_hash, owner_id)` は期限内かつ未消費の1行だけを原子的なUPDATEで消費し真偽を返すため、複数インスタンスからの二重消費防止を狙う。

このSQLの静的テストを追加したが、**ローカルPostgresや本番SupabaseでのSQL実行テストは未実施**。SQL適用時の既存スキーマとの衝突・権限・並行トランザクション動作も未検証。旧supabase構成との照合、migration採番・運用順序の確認が必要。本人認証は未実装であるため、service_roleを利用するAPIに入る前に強い管理者認証・許可リストを実装し、サーバ鍵・認証コード・リフレッシュトークン等はDB表へ保存しない。期限切れ行の削除は将来の保守設計で、cronは追加していない。

この追加によって認証ページが本番利用可能になったわけではない。今回もPR #155はDraftのままで、実行可能なOAuth callback・外部API通信・実メール送信・Secrets・cron・旧Windows停止・PRマージは行っていない。


## OAuth管理者照合とcallback連結（2026-11-05、完全オフライン）

`gmail-oauth-admin-offline.ts` で管理者のserver-side検証済みID（subject）・検証済みメール・issuerが設定値に完全一致することを要求する。ユーザー入力から得たIDを渡してはならない。実際のSupabase Auth検証・セッションの署名、issuer、audience、期限の検査は**未実装**であり、現段階のTrustedServerIdentityは信頼できるサーバアダプターを接続して初めて意味を持つ。

`gmail-web-callback-offline.ts` に暗号化Cookie→CSRF照合→管理者照合→永続DBの一回限り消費という処理をまとめた純粋なオーケストレーションを追加。テスト内のみのMapで成功後の再利用拒否や本人不一致をテスト。**このMapは本番DBの排他性を示さない。** SQL migrationも未適用で、HTTP callbackルート、鍵・tokenの実保管、OAuth認可コード交換通信、セッション本人性の実検証はいずれも未完成。返り値に認可コードとverifierを含むため、HTML・JSON・ログへ返してはならない。

送信、Gmail API/Google OAuthへの通信、cron、Secrets、本番デプロイ、既存Windowsの停止、Draft PR #155マージを引き続き行わない。


## Supabase OAuth stateアダプター（2026-11-05、接続未実行）

`supabase/functions/_shared/jaspic/gmail-oauth-supabase-store.ts` を追加。server-side専用Supabaseクライアントを注入して `jaspic_gmail_oauth_states` へstateダイジェストを保存し、`jaspic_consume_gmail_oauth_state` RPCで一度だけ消費する実装。DBエラー詳細や内部識別子はレスポンスに返さずフェイルクローズ。専用モックテストはinsert、RPC、再利用拒否、DBエラー拒否を検査。実際のサービスロール鍵、Supabase API呼び出し、migration適用は **一切実施していない**。

本番に進む前にDB migrationが正しく適用されたことと実Postgresの行ロック排他をテストし、APIをadmin server auth (Supabase Authの署名・issuer・audience・期限を信頼できる認証サーバで検証) の背後に接続すること。RLSにservice_roleを付与していても、その鍵を持つサーバ処理自体の認可が必要。OAuth開始・callbackエンドポイント、Secret暗号化保管、Googleへの実OAuth通信は未実装であり、公開できる状態ではない。ドラフトPR #155をマージ・デプロイせず、既存のメール送信やcronを有効化しない。


## Supabase Auth本人照合アダプター（2026-11-05、HTTP未接続）

`supabase/functions/_shared/jaspic/gmail-oauth-supabase-auth.ts` と専用模擬テストを追加。将来のサーバ専用HTTPハンドラーからSupabase Authの `auth.getUser(accessToken)` に渡し、取得したサーバ検証済みID・メール・確認日時を前提に既存の管理者subject/email許可リストと照合できるようにした。設定するissuerは信頼するSupabaseプロジェクトのURLに限定し、クライアントが自己申告したemail/subは利用しない。空セッション・未確認メール・異なるID・認証エラーは拒否する。

**これはSupabase Authの実リクエスト・管理者ログイン画面の実装完了ではない。** 模擬クライアント注入のみでテストし、本番接続、本人のログイン方式、管理者IDの設定と管理、CSRF防御、DBマイグレーション、トークン暗号化永続保管、Google callback本番公開は未完了。アクセストークンは将来のサーバハンドラーで適切なAuthorizationヘッダー/HttpOnly Cookieから厳密に取得し、発行者・プロジェクトの信頼境界を守る。OAuth本人認証後もAPIハンドラーの二重認可が必要である。

今回もDraft PR #155のオフラインコードとテスト・文書のみ。Gmail送信、Google認証画面起動、実Supabase接続、Secrets更新、DBデプロイ、cron、旧PC停止、PRマージは行わない。


## Gmailリフレッシュトークン暗号化封筒（2026-11-05、オフライン）

`gmail-oauth-token-vault-offline.ts` と専用テストを追加。実トークンではなく合成文字列だけを用い、AES-256-GCMでrefresh tokenを暗号化・復号する純粋関数を実装。AADに管理者IDを結びつけて他アカウントへの誤用を拒否し、version・keyId・ランダムIV・暗号文だけを封筒として返す。鍵はランタイムの秘密設定から与える前提で、GitHub・UI・ログ・テストに本物の資格情報は入れない。

**暗号化封筒と保管は別物。** 保存先テーブル、限定アクセス権、キーのローテーションと失効、トークン取り出しの認可・監査、Google交換の実通信、サーバ管理者認証の実接続はまだ未実装。今回も本番SupabaseのSecretsやDBは変更していない。現行OAuthコールバックは未公開で、Gmail送信・cron・旧PC停止・PRマージも未実施。


## 暗号化トークン保管テーブルとアダプター（2026-11-05、未接続）

レビュー用SQL `supabase/migrations/20261105074500_jaspic_gmail_token_vault.sql` と `supabase/functions/_shared/jaspic/gmail-oauth-vault-store.ts` を追加。ownerIdを主キーとする専用テーブルに暗号化済みenvelope（鍵識別子、ランダムIV、暗号文）のみ保持する。anon/authenticated/publicからの読み書きは禁止し、service_role経由でサーバ側だけ利用する。アダプターは暗号化封筒以外を受け付けず、失効済みレコードを通常取得から除外し、DBエラーを外部へ詳細表示しない。モックDBとの専用テストを追加。

**本番適用・API接続はまだ許可されていないため未実施。** 実Supabase Auth・管理者用ログインUI・refresh token発行/取り込み・Googleコード交換・トークンの失効/ローテーション・暗号鍵の安全な設定・実DB integration testも未完了。専用データを読むサーバコードは必ず本人照合後にのみ呼ぶこと。モデル内のコードは単独では外部からの認証を行えない。PR #155 はDraftを維持し、メール実送信・cron・旧Windows停止・DB migration適用・Vercel本番公開は行わない。


## iPhone認証画面とHTTPルート（2026-11-05、停止状態で追加）

`app/jaspic/oauth/page.tsx` を追加し、Safari向けのJASPIC認証準備画面を作成した。管理者しか利用できない認証開始は現在無効であることを明示し、実資格情報の入力欄やGoogleへのリンクは設けていない。

`app/jaspic/oauth/start/route.ts` は常にHTTP 503・no-storeを返し、Googleへリダイレクトしない。`app/jaspic/oauth/callback/route.ts` も常にHTTP 503、no-store、no-referrer、制限CSPを返す。コールバックURLのcode/stateを取得・表示・ログ保存しない。専用テスト `tests/jaspic/gmail-web-http-locked.test.ts` はこの停止状態を検証する。**これは実OAuth認証フロー完成を意味しない。**

本番有効化までの残要件：Supabase Authの管理者本人ログインUI実装（認証開始/完了の両方でサーバ検証）、OAuth stateのDB登録と原子消費、短命暗号化cookie設定/破棄、Google認可コード交換のサーバ実通信、暗号化トークンの永続保存および鍵設定・失効、実DBでの検証、安全な監査、Googleの本番OAuthスコープ制限確認。GoogleのWebクライアントID/Secretは環境変数でのみ使用し、ソースへ書かない。OAuthコールバックでコードをHTTPレスポンスやログ・解析ツールに送らない。

本追加はDraft PR #155内のみ。アメふる本体の本番デプロイ・既存公開JASPIC紹介ページ・Gmail実送信・18時cron・旧Windows送信・PRマージには影響を与えない。
