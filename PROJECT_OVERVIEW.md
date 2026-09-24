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
