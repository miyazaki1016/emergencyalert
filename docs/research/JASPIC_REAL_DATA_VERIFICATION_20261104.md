# 実データと旧実メールの照合（対象日2026-11-04、無送信）

既存Draft PR #155 / Issue #154を継続。既存collect.ts、generateMail、generateEmlを再利用し、生成器の再実装・仕様変更はしていない。実メール本文、管理番号、住所、位置情報、原本、認証情報はGitへ保存していない。

## 結果

Gmailコネクタで対象日の旧個別メールを読み取り、include_raw_mimeで取得したRFC822 base64urlをデコード。通常のbody表示や転送メールはバイト比較に使わない。公開JSONの同じ種別・IDを検索し、現在の値とcollectorが解決した市区町村名・警察署名から再生成した。

| 種別 | 旧原本 | 同じIDを公開JSONで確認 | 新規本文UTF-8全バイト一致 | CRLF一致 | Subjectヘッダー全バイト一致 |
|---|---:|---:|---:|---:|---:|
| 広島犯罪 | 69 | 69 | 69 | 69 | 69 |
| 広島不審者 | 19 | 19 | 19 | 19 | 19 |
| 滋賀不審者 | 9 | 9 | 9 | 9 | 9 |

**判定：確認した新規97通の本文・SubjectヘッダーはPASS。メール全体の配送互換は認定しない。**

全本文バイト一致は全項目の値・順序・注釈、市町名、署名、全角空白、各URLの文字列とパラメーター順、末尾改行を含む。滋賀のGoogle Maps URLも対象。97通ともtext/plain・UTF-8・8bit。件名の論理値には従来どおり先頭半角スペースがあるが、旧配送原本の復号Subjectでは除かれている。既存generateEmlのMimeKit互換シリアライズ結果とは97通すべてヘッダーバイトまで一致した。論理件名の一致と混同せず、mail.tsの定数は変更しない。

公開JSON読取りでは広島不審者454・犯罪5,635（計6,089）、滋賀708を取得。広島はcities_master.json / police.json / suspicious_person3.json / criminals.json、滋賀はcities.json / suspicious_person_full.jsonを既存collectorで取得した。現在の取得成功は、以前の別環境での404やDNS失敗を否定せず、将来のEdge実行での成功を保証しない。

## 更新メール

対象日の広島88通・滋賀9通はいずれも新規通知だった。対象日・JASPIC件名に加えて「更新」「●更新」で検索しても追加の該当メールは得られなかった。この検索は存在しないことの一般的証明ではない。

そのため**実更新通知の現在値、見出し、マーカー位置、項目順序の照合は未検証**。旧SQL Server更新前DBの復元は要求しない。追加した検証器は、更新原本が得られれば現在値の投影（行末マーカーだけを除いた比較）を実施できるが、更新前値やマーカー付与判断の正しさは証明しない。合成更新テストでは正位置のマーカーと位置異常を区別し、previousValuesVerifiedは常にfalseとする。既存81パターンの旧C#比較は維持。

## Supabase読取り

プロジェクトyqyevipvkdwmhcaxywesのpublicを読取りのみ照会。jaspic_recordsは広島6,101・滋賀708（消えた公開IDも履歴として保持する設計なので現在公開件数と同一ではない）。確認したメールのIDは広島88・滋賀9すべて既存recordsにも存在した。ただし今回はDBのpayload値の全バイト一致までは検証していない。両県baseline_complete=true、revision=3。checked_atは滋賀2026-11-04 19:54 JST、広島20:03 JST。deliveriesの集計は広島DRY_RUN 20件。これらは旧SQL Server更新前状態の代用ではない。本番DB変更なし。

## 再現と保護

`scripts/jaspic-verify-real-mail.ts`はネットワーク・SMTP・DBクライアントを持たないオフライン比較器。入力はGit管理外の権限制限した一時ファイルのみ。Gmail原本JSON配列（raw_mime_base64url）と既存collectorのItem配列を与える。出力は種別ごとの件数・一致数のみ。失敗時も本文や個別IDを出力せず、未知MIME/不正UTF-8/ID不明・重複/空入力を失敗とする。

```bash
node scripts/jaspic-verify-real-mail.ts /private/old-mail.json /private/collected-items.json
npx vitest run tests/jaspic tests/jaspicShigaMail.test.ts
```

合成テストのみをコミットする。生原本、公開JSON、再生成本文、個別ハッシュ等をCI artifactやGitHubへ置かない。

## 切替前に残ること

- 実更新メールの現在値・見出し・更新マーカー位置の照合。更新前DBがない範囲は引き続き未検証。
- 旧生成FromとGmail配送Fromの差、SMTP envelope、センター側最終受信原本・解析互換。
- quoted-printable等の既存未対応MIME入力、実送信キューと送信処理、切替境界と二重配信防止。
- 本番送信、cron有効化、Edge deploy、本番DB変更、旧PC停止、PRマージは今回すべて未実施。追加承認前に実施しない。

## ローカル回帰検証

JASPIC関連7ファイル125テスト成功（追加7件）。既存の本文82テスト（81パターン＋入力拒否）・MIME19テストを含む。新規比較器と追加テストのstrict TypeScript単独チェック成功。リポジトリ全体のtscは、今回未変更のhandler.test.ts / mail.test.ts / mime.test.ts / state.test.tsにある合成JSON型とRecordDataの不整合で失敗した。全体型チェック成功とは報告しない。生成器本体の変更なし。
