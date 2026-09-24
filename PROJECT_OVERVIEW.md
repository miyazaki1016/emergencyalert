# EmergencyAlert 総覧

最終更新: 2026-09-24

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

## 現在のPushテスト方針

- 本番の `watch-rain` をテストのために崩さない。
- 一時的な `test-push-once` を使い、認証済みクライアント経由でテストする。
- テスト用経路を恒久的に公開したままにしない。
- Push確認後はテストUI/テスト関数を撤去または無効化する。
