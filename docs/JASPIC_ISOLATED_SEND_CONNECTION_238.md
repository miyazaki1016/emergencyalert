# JASPIC Issue #238 — 隔離実送信の接続準備（2026-11-14）

## 現在の実績
- Gmail実送信: **0件**。隔離DB: **PREPARED 34件**（広島31、滋賀3）。
- 専用権限ロール `jaspic_isolated_sender_238`: NOLOGIN、非superuser、BYPASSRLSなし。隔離スキーマのみUSAGE、必要な列SELECT/UPDATEとclaim_batch/finish_claim実行を付与。
- anon/authenticated/service_roleには隔離スキーマUSAGEなし。
- GitHub Draft PR #239の純粋関数・テストはCI成功。ただし実DB/Gmail連携アダプターとPreview環境での実行経路は未実装。

## 接続時の必須条件
1. **ログイン資格情報をGitHub/Issue/チャットへ貼らない**。Vercel Previewの対象ブランチだけに暗号化環境変数として登録する。Production/Developmentへ追加しない。
2. 専用のログインロールは、`jaspic_isolated_sender_238` だけを継承。SUPERUSER/CREATEDB/CREATEROLE/BYPASSRLSを持たず、接続数を制限する。既存の `postgres` / `service_role` 接続を代用しない。
3. DB接続はサーバー側のみ、TLS必須。DBホストは `db.yqyevipvkdwmhcaxywes.supabase.co`、DB名は `postgres`。実行環境からIPv6接続が可能かを先に確認し、不可ならSupabase公式poolerを利用する（接続先を推測しない）。
4. Next.jsの既存OAuth管理者認証・暗号化refresh tokenの読み出しを再利用。テスト専用の明示的POSTだけがGmail送信を行う。Cron・GET・ページ閲覧では送信しない。
5. 宛先は `kishibojim@gmail.com` に固定。送信前に最新のread-only preview、隔離DBの34件、対象source_idを照合する。本番 `getter01@jaspic-nes.net` と本番配送テーブルは参照更新しない。
6. 最初は1件だけclaim→Gmail API→message ID→finishを照合する。結果がUNKNOWN/FAILED、またはDBへの記録が不明なら即停止し、自動再送しない。残り33件の送信は1件目の実結果確認後。
7. **Previewデプロイ成功は実送信成功ではない**。Gmail message ID、DBのSENT状態、実際の受信を区別して記録する。

## 現在のブロッカー
専用ログイン資格情報を安全に生成してVercelへ登録する自動操作は、このチャットの安全性チェックでブロックされた。安全性チェックを迂回せず、接続情報は認証済みの管理画面・安全なシークレット登録経路から設定する必要がある。ログイン情報のない状態で送信アダプターを公開しない。

## 証拠
- Issue: https://github.com/miyazaki1016/emergencyalert/issues/238
- Draft PR: https://github.com/miyazaki1016/emergencyalert/pull/239
- 最新確認済みCI: https://github.com/miyazaki1016/emergencyalert/actions/runs/43479091473
