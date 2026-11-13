# research/jaspic-token-vault-offline-20261106

**目的：** 未確認

**実装状態：** mainとの差分を収録。差分ゼロも記録

**検証の扱い：** 未確認

**PR状態：** ブランチ差分（PR関連あり）

**main統合：** 未確認

**本番反映：** 未確認

**残課題：** 未確認

**次の作業：** 関連PR・mainとの同等実装を照合。ブランチの存在だけで未完成扱いしない

関連PR：[#171](https://github.com/miyazaki1016/emergencyalert/pull/171)

根拠取得日時 (UTC)：2026-11-13T03:37:57.868129+00:00


## 実際の変更処理（コードから抽出）

差分・ソースを参照

- [app/jaspic/oauth/callback/route.ts](https://github.com/miyazaki1016/emergencyalert/blob/e48e8a60568f0e5ee8ab1bffb120864091e431de/app/jaspic/oauth/callback/route.ts)：同一HEADのPR案件に原文収録
- [app/jaspic/oauth/login-client.tsx](https://github.com/miyazaki1016/emergencyalert/blob/e48e8a60568f0e5ee8ab1bffb120864091e431de/app/jaspic/oauth/login-client.tsx)：同一HEADのPR案件に原文収録
- [app/jaspic/oauth/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/e48e8a60568f0e5ee8ab1bffb120864091e431de/app/jaspic/oauth/page.tsx)：同一HEADのPR案件に原文収録
- [app/jaspic/oauth/result/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/e48e8a60568f0e5ee8ab1bffb120864091e431de/app/jaspic/oauth/result/page.tsx)：同一HEADのPR案件に原文収録
- [app/jaspic/oauth/send-start/route.ts](https://github.com/miyazaki1016/emergencyalert/blob/e48e8a60568f0e5ee8ab1bffb120864091e431de/app/jaspic/oauth/send-start/route.ts)：同一HEADのPR案件に原文収録
- [app/jaspic/oauth/start/route.ts](https://github.com/miyazaki1016/emergencyalert/blob/e48e8a60568f0e5ee8ab1bffb120864091e431de/app/jaspic/oauth/start/route.ts)：同一HEADのPR案件に原文収録
- [app/jaspic/oauth/status/route.ts](https://github.com/miyazaki1016/emergencyalert/blob/e48e8a60568f0e5ee8ab1bffb120864091e431de/app/jaspic/oauth/status/route.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/oauth-gmail-send-callback-server.ts](https://github.com/miyazaki1016/emergencyalert/blob/e48e8a60568f0e5ee8ab1bffb120864091e431de/lib/jaspic/oauth-gmail-send-callback-server.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/oauth-gmail-send-token-validation-offline.ts](https://github.com/miyazaki1016/emergencyalert/blob/e48e8a60568f0e5ee8ab1bffb120864091e431de/lib/jaspic/oauth-gmail-send-token-validation-offline.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/oauth-gmail-token-store-server.ts](https://github.com/miyazaki1016/emergencyalert/blob/e48e8a60568f0e5ee8ab1bffb120864091e431de/lib/jaspic/oauth-gmail-token-store-server.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/oauth-gmail-token-vault-offline.ts](https://github.com/miyazaki1016/emergencyalert/blob/e48e8a60568f0e5ee8ab1bffb120864091e431de/lib/jaspic/oauth-gmail-token-vault-offline.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/oauth-identity-callback.ts](https://github.com/miyazaki1016/emergencyalert/blob/e48e8a60568f0e5ee8ab1bffb120864091e431de/lib/jaspic/oauth-identity-callback.ts)：同一HEADのPR案件に原文収録
- [lib/jaspic/oauth-session-offline.ts](https://github.com/miyazaki1016/emergencyalert/blob/e48e8a60568f0e5ee8ab1bffb120864091e431de/lib/jaspic/oauth-session-offline.ts)：同一HEADのPR案件に原文収録
- [package.json](https://github.com/miyazaki1016/emergencyalert/blob/e48e8a60568f0e5ee8ab1bffb120864091e431de/package.json)：同一HEADのPR案件に原文収録
- [tests/jaspic-gmail-token-vault.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/e48e8a60568f0e5ee8ab1bffb120864091e431de/tests/jaspic-gmail-token-vault.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/oauth-gmail-send-callback.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/e48e8a60568f0e5ee8ab1bffb120864091e431de/tests/jaspic/oauth-gmail-send-callback.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/oauth-gmail-token-store.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/e48e8a60568f0e5ee8ab1bffb120864091e431de/tests/jaspic/oauth-gmail-token-store.test.ts)：同一HEADのPR案件に原文収録
- [tests/jaspic/oauth-identity-callback.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/e48e8a60568f0e5ee8ab1bffb120864091e431de/tests/jaspic/oauth-identity-callback.test.ts)：同一HEADのPR案件に原文収録

## 検証実行の事実

| ワークフロー | 結果 | 対象SHA |
| --- | --- | --- |
| 実行証拠未取得 | 未確認 | — |

## 当時の説明・結論（原文。作者の主張と実測を区別）

```text

```

## ソース・テスト・資料の抜粋（実行はしない）

