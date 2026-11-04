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
