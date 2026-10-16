# アメふる全ブランチ発掘台帳 — 調査中（2026-10-16）

> **重要：これは全ソース読了報告ではない。** 62ブランチ・61PRの存在を確認し、ブランチ差分の一次調査を実施。各ファイルの内容・全テスト・本番状態の精査は継続中。main、本番、PRを勝手にマージ・デプロイしない。

## 調査基準

- 正本: `main` の実装と `docs/PROJECT_OVERVIEW.md`。ただし本番稼働はGitHubだけでは証明できない。
- `ahead_by=0` は「mainから見た独自コミットがない」の意味であり、デプロイ済みの証明ではない。
- `ahead_by>0` の古いブランチも、後続PRで同等実装が取り込まれている可能性がある。独自コミットの存在だけで「未実装」とは断定しない。
- ソース、テスト、実測、設計文書、CI結果、本番確認を別の証拠として扱う。

## 重要な作業系統

| ブランチ / PR | mainとの差分の一次確認 | 現状と注意 |
|---|---|---|
| `feat/national-heavy-rain-preview` / [#59](https://github.com/miyazaki1016/emergencyalert/pull/59) | 533 commits ahead、4 behind（調査時点）。全国雨雲解析・N03・キュー・Worker・多数の検証スクリプト・SQL | **Proof-only / Production未承認**。Worker routeにN03ローダー接続コードあり。ただし本番適用・性能保証とは別。 |
| `feat/live-japan-experience-prototype` / [#61](https://github.com/miyazaki1016/emergencyalert/pull/61) | 31 ahead、0 behind。 `app/live-japan/`、`app/my/page.tsx` | UI・イベントモデル試作。公式地震データ取得・本番通知は未実装。 |
| `docs/misaki-weather-integration-20261016` / [#60](https://github.com/miyazaki1016/emergencyalert/pull/60) | 2 ahead、0 behind | アメふる提供・美咲利用のDraft契約。read-only API未実装。 |
| `codex/verify-jma-png-palette-20260923` | 2 ahead、155 behind。PNG原本・SVG・manifest・色判定テスト | **要発掘**。実画像・パレット根拠が残る。後続mainとの差分と要照合。 |
| `test-jma-early-live-smoke` / [#25](https://github.com/miyazaki1016/emergencyalert/pull/25) | 9 ahead、80 behind | JMA早期降雨タイルのCI実データ検証系。現在のJMA仕様と再照合。 |
| `feat/rain-radar-layer` / [#56](https://github.com/miyazaki1016/emergencyalert/pull/56) | 4 ahead、7 behind | 地図レーダー表示。mainに同等実装があるか検証。 |
| `feat/visual-map-picker` / [#55](https://github.com/miyazaki1016/emergencyalert/pull/55) | 8 ahead、9 behind | 座標選択UI。mainとの機能比較が必要。 |
| `fix/rain-ending-hysteresis` / [#57](https://github.com/miyazaki1016/emergencyalert/pull/57) | 4 ahead、5 behind | 雨の終了通知のヒステリシス。watch-rain実装と照合。 |
| `fix/rain-ending-after-confirmed-rain` / [#58](https://github.com/miyazaki1016/emergencyalert/pull/58) | 1 ahead、7 behind | 降雨確定後の終了通知。上記とmainを照合。 |

## 差分ゼロを確認した作業ブランチ（調査時点）

`design/lighter-blue-result-order`, `design/lighter-rain-blue`, `design/polished-mobile-ui`, `design/restore-visual-contrast`, `design/white-secondary-text`, `docs/update-project-overview-20260928`, `feat/confirmed-rain-facts`, `feat/map-location-picker`, `feat/rain-returning-copy`, `feat/severe-rain-alerts`, `fix/disambiguate-duplicate-notification-labels`, `fix/internal-rain-confirmation-state`, `fix/jma-20-30-palette`, `fix/keep-rain-check-together`, `fix/natural-rain-notifications`, `fix/refresh-alerts-at-tokyo-midnight`, `fix/restore-push-status-on-load`, `fix/restore-rain-ending-decision`, `fix/suppress-rain-confirmed-push`。

## 設計資料で確認できた境界

- [LIVE JAPAN実データ接続設計](https://github.com/miyazaki1016/emergencyalert/blob/feat/live-japan-experience-prototype/docs/LIVE_JAPAN_REAL_DATA_INTEGRATION_PLAN.md): 公式情報の正規化・訂正・取消・震度3以上表示方針は設計済み。**実XML取得・DB・通知は未実装**。
- [美咲連携契約案](https://github.com/miyazaki1016/emergencyalert/blob/docs/misaki-weather-integration-20261016/docs/AMAFURU_MISAKI_INTEGRATION_CONTRACT_20261016.md): 公式情報の頭脳はアメふる、人格・会話は美咲。契約はDraftでAPI未実装。
- [全国解析引き継ぎ](https://github.com/miyazaki1016/emergencyalert/blob/feat/national-heavy-rain-preview/docs/AMAFURU_HANDOFF_2026-10-13.md): 47都道府県N03分割のCI実験証拠あり。CI成功≠Production acceptance。
- [全国最終ゲート](https://github.com/miyazaki1016/emergencyalert/blob/feat/national-heavy-rain-preview/docs/NATIONAL_FINAL_GATE_PROOF.md): 8 ownership bins、分散処理、仮想スケジューラ検証。原子的子ジョブ所有・実Storage HTTP・本番負荷は未確立。

## 残作業（未実施を明記）

1. 全ブランチの個別ファイルを読み、mainとの意味上の重複と未回収成果を判定。
2. PRごとの実際のmerge状態、HEAD SHA、CI・レビュー状況を取得。
3. 全ソース・ドキュメント・テスト・SQL・workflowのファイル単位所在表を作成。
4. 本番DB・Storage・Vercelの実態を別途読み取り専用で確認。
5. 各機能を「設計」「実装」「テスト」「実データ検証」「本番稼働」に分けて完成判定。

## 次のソラへ

**「りょ」＝「どんどん進めて」。** 返事だけで止まらず調査を続け、証拠をこの台帳に追記する。未読のものを「全部読んだ」と報告しない。

## 2026-10-16 ソース実読による追補：回収済み・要再調査の区別

- **雨の終了通知ヒステリシス：mainに実コードが存在。** `supabase/functions/watch-rain/index.ts` のblob SHAはmainと `fix/rain-ending-hysteresis` で完全一致（`b4b5992242bb15d27491eeb3be86c56e46e97e7d`）。`lib/weather/rain/watchNotificationDecision.test.ts` も完全一致（`b0c33525e58904ad04cb58ac837ec5e139c51c23`）。`supabase/functions/watch-rain/notificationDecision.ts` には `nextRainEndingNotified` がある。**この2ファイルについてはブランチの成果がmainに存在する**と確認。実運用デプロイ済みかは未検証。
- **雨の終了通知の別旧ブランチ：差分あり。** `fix/rain-ending-after-confirmed-rain` の `watch-rain/index.ts` はblob SHA `caf4bb74d722cf1522573e85f2cb4fff3c99830b`、mainは `b4b5992242bb15d27491eeb3be86c56e46e97e7d`。旧ブランチは `rain_ending_notified` を `clearStreak>=3` で解除する直接式、mainは `nextRainEndingNotified` に委譲。**違いは確認済みだがmain側が最新の統合形か、全挙動が同等かはテスト追加確認が必要。**
- **JMA PNGパレットの根拠資料はmainにも存在。** `docs/PNG_PALETTE_EVIDENCE.md` はmain 22,742文字、古い `codex/verify-jma-png-palette-20260923` 13,941文字で、同一ファイルではない。mainの冒頭は「2026-09-23時点で7色検証、20–30 mm/h未解決」という当時の結論であり、**文書の後続追補や現在の判定コードを読まずに『未解決のまま』とは断定しない**。`lib/weather/providers/jma/pngPalette.ts` はmainと古いブランチでSHAが異なる。PNG原本群のファイル所在は古いブランチに確認済み。mainに原本が存在するかは未確認。
- 以上は**ファイル単位の照合結果**。全ブランチ全ソース読了、CI実行、本番確認の宣言ではない。

## 2026-10-16 追加ソース照合：地図と全国Worker

- **雨雲レーダーの地図重畳はmainに存在。** `app/page.tsx` のblob SHAがmainと `feat/rain-radar-layer` で完全一致（`5ef6d72018573e6e4410fcf039c02d1d3f128eba`）。Leaflet、JMA `targetTimes_N1.json`、`hrpns` タイルURL、`syncRadarLayer` を実読。**当該ファイルのブランチ成果はmainに回収済み**。本番画面・外部JMAタイルの実表示は未検証。
- **地図地点ピッカーはmainに後続変更がある。** `feat/visual-map-picker` の `app/page.tsx` blob `ba6f82fc394675ce4047455c11a9091d313bfff1`、mainは `5ef6d72018573e6e4410fcf039c02d1d3f128eba`。一方 `app/layout.tsx` は両方 `4250b5aa9ecaa8ad47bdfcbf51027fb366a7800d` で一致。mainにLeafletと地図表示は存在するが、地点登録操作の完全同等性は別途確認。
- **全国Workerはmainに存在しない。** `app/api/rain/national-worker/route.ts` はmainで404（ファイル不在）、`feat/national-heavy-rain-preview` には存在（blob `35e8195837cd53c51d7de08566232510a822930c`）。`processNationalRainRefinementJobs` とN03ローダー接続があり、レスポンスは `NATIONAL_RAIN_REFINEMENT_WORKER_PROOF`。**これはmain未回収のproof実装であり、本番機能とは呼ばない。**

## 2026-10-16 追加ソース照合：降雨判定エンジン・通知判定

- **予報のDRY境界修正はmainに回収済み。** `fix/dry-forecast-boundary` とmainの `lib/weather/rain/RainInterpretationEngine.ts` はblob `2626e02fef9aa5515c63bba051375c70de7d7137` で一致。対応テストもblob `4308c02a0a8b21761a571c320047d9171d3fd246` で一致。
- **弱い雨の持続判定はmainに存在。** mainのテストには「1–5mm/hの雨が30分以内に始まる連続3本の5分フレーム」「単一弱雨では通知しない」「UNKNOWNをまたいで持続扱いしない」「1mm/h未満の霧雨は持続しても通知しない」「30分超の強雨を通知しない」が含まれる。古い `fix/persistent-light-rain-notification` のエンジン・テストとはSHAが異なり、main側に後続変更がある。**テスト名の確認でありテスト実行は未実施。**
- **降雨通知判定ヘルパーはmainで拡張済み。** `supabase/functions/watch-rain/notificationDecision.ts` は旧 `refactor-watch-notification-decision` の544文字からmain 1143文字に変化。mainには `shouldNotifyForRain`（通知許可、actionable化、未送信リトライ、終了通知）、`nextLastNotifiedAt`（配信成功時更新）、`nextRainEndingNotified`（終了通知後の抑制・降雨連続3回で解除）が存在。旧版とSHAは異なる。
- **重要な区別:** ここでの「mainに存在」はソースとテスト定義の確認。本番Edge Functionへのデプロイ、外部予報データによる実際の動作、通知の到達率は別検証。

## 2026-10-16 通知までの呼び出し経路（mainソース実読）

1. `supabase/functions/watch-rain/index.ts` は `Deno.serve` のHTTP入口。リクエストヘッダ `x-watch-token` を `WATCH_CRON_TOKEN` と照合し、違えば401。Supabase URL・service role・VAPID private keyの設定が必要。
2. `watch_targets` から `enabled=true` の対象を **`.limit(100)`** で取得して順次処理。**100件超の対象を1実行で網羅する保証はこのコードにない**。順序・ページング・同時実行安全性は追加設計対象。
3. 各地点で固定のVercel URL `https://emergencyalert-gilt.vercel.app/api/rain` に `lat` / `lon` を付けてfetch。`app/api/rain/route.ts` は観測・予報から `interpretRainSeries` / `toRainSemanticEvent` を使う。
4. 判定できない場合は `watch_states` の最終確認日時を更新してUNKNOWNとして継続。判定できる場合は既存 `watch_states` の `rain_streak`, `clear_streak`, `confirmed_weather`, `rain_ending_notified`, `severe_rain_level` 等を参照。
5. `shouldNotifyForRain` に加え激しい雨への段階的上昇判定を行い、通知対象なら `push_subscriptions` からownerの購読を取得し `web-push` 送信。404/410で失効購読削除、送信成功数・失敗数を計数し `watch_states` をupsert。
6. `supabase/functions/watch-rain/README.md` は2026-09-24時点の本番v8をbaselineと記すが、**これはリポジトリ文書の主張**。現在の本番関数バージョン、Supabase cronの存在・実行頻度、DBスキーマ、配信結果は実環境照合未実施。
7. `.github/workflows/watch-rain.yml` はmainで404。**GitHub Actionsから定期起動している証拠はこのパスでは見つからない**。別workflow、Supabase pg_cron、外部schedulerの可能性を確認する必要がある。
8. **運用上の調査候補:** `.limit(100)` の対象数上限、固定Vercel URL、外部fetch失敗時の扱い、二重実行の排他、push成功とDB記録の間の障害。いずれも直ちに障害と断定せず、実際の負荷・設定・監視と照合する。

> この追補はソースを読み取り専用で調査した結果。秘密値は読み取らず、cron・DB・本番設定は変更していない。

## 2026-10-16 本番Supabase照合：**重要なソース乖離を発見**

**確認対象:** Supabase `EmergencyAlert` プロジェクト（ID `yqyevipvkdwmhcaxywes`）。`misaki` プロジェクトとは別。読み取り専用で確認。

- **実スケジューラ確認済み:** `cron.job` の `watch-rain-every-5-minutes` は `*/5 * * * *` で `active=true`。VaultからURLとtokenを参照し、`net.http_post` でEdge Function `watch-rain` を呼び出す。秘密値は取得・記録していない。
- **cronの実行履歴:** 過去24時間 `cron.job_run_details` で `succeeded` 288件、最終開始 `2026-10-16 08:00:00 UTC`。**cron succeededはHTTP先の業務処理・Push到達成功を保証しない。** 別途 `net._http_response` やEdge logs等を確認する。
- **DB状態:** `enabled=true` の監視地点3件、push購読1件、`watch_states` 3件。直近20分以内の `last_checked_at` が3件、最新 `2026-10-16 08:00:07 UTC`。現状の3件はmainの `.limit(100)` 上限以下だが、将来の拡張リスクは残る。
- **実デプロイ済みEdge Function:** `watch-rain` は `ACTIVE`、**version 29**、`verify_jwt=false`。READMEの「deployed v8」は2026-09-24時点の古いbaselineであり、**現行バージョンではない**。
- **最重要：本番のコードとmainが一致しない。** Supabase `get_edge_function` の実ファイルには `nextRainEndingNotified` のimportがなく、`endingNotified=clearStreak>=3?false:...` という古い式が残る。mainは `nextRainEndingNotified({previousRainEndingNotified,rainStreak,endingDelivered})` に変更済み。さらに本番 `shouldNotifyForRain` 呼び出しは `initialRaining` を渡し、本番の `notificationDecision.ts` は874文字、mainは1143文字。**mainの修正が本番に反映されたとは言えない。** 機能差・事故リスクをテストで評価し、ユーザー承認なしにデプロイしない。
- 本番でも `watch_targets.limit(100)` と固定のVercel雨API URLを確認。cron実行自体と監視地点の状態更新は動作している形跡があるが、Push通知成功はまだ未証明。

**次の優先事項:** 本番v29とmainの正確な差分（特に終了通知・初回雨通知）を整理し、Edge FunctionログとHTTP応答を調査。**現行本番の挙動を壊さず、GitHubを原本とする差分是正計画を別途提示する。**

## 2026-10-16 ユーザー実機確認（通知到達）

- **ユーザーから「実際に監視地点の通知はスマホに届いてるよ」と明示報告あり。** よって「スマホ通知の到達実績なし／未確認」という扱いは修正する。**ユーザー実機での到達実績あり**（端末・日付・通知種別・頻度・全ケース網羅は未採取）。
- cron実行・DB状態更新（本番の読み取り結果）と、スマホ通知到達（ユーザー実機報告）を**異なる根拠として併記**する。すべての通知分岐・全監視地点の配送保証、mainと本番v29の一致を意味しない。
- 既に通知が届いている運用を壊さないことが最優先。mainとの差分は、現行通知の再現条件を保持しながら評価する。ユーザー承認なく本番Edge Functionを変更しない。

## 2026-10-16 本番v29 ↔ main：行単位の正確な差分

Supabaseから取得した本番 `watch-rain/index.ts`（64行）とGitHub main（64行）を行単位で照合。**異なる行は4行**。その他の行は完全一致。

| 論点 | 本番v29 | main | 考えられる影響 |
|---|---|---|---|
| import | `nextLastNotifiedAt, shouldNotifyForRain` | `nextRainEndingNotified` 追加 | 新しい終了通知状態管理を使うかどうか |
| `rainEnding` | `RAIN_ENDING`・前回非終了・未通知 | 上記に加え `previous.confirmed_weather==="RAINING"` 必須 | **本番では未確定の雨に対して終了通知を送る可能性**。mainは確定雨に限定 |
| `shouldNotifyForRain` 呼び出し | `initialRaining, rainEnding` | `rainEnding:rainEnding||confirmedAndEnding` | `initialRaining` は**本番ヘルパーの型定義・判定式にも存在しない**ため、この引数自体はヘルパー内で無視される（他のコードでの使用は別）。mainは「雨確定と終了が同時」の通知判定を明示的に通す |
| `endingNotified` | `clearStreak>=3` でfalseに解除、ほかは通知済みを保持 | `nextRainEndingNotified` を使用、`rainStreak>=3` でfalseに解除 | **終了通知抑制フラグの解除タイミングが異なる**。新しい雨エピソード開始時の再通知に影響する可能性 |

本番 `notificationDecision.ts` はmainにある `nextRainEndingNotified` 関数がないだけで、**既存の `shouldNotifyForRain` と `nextLastNotifiedAt` の行は一致**。本番版874文字、main1143文字。

**結論:** mainと本番の差は限定的で、特に雨の終了通知・抑制フラグに集中している。ただし**4行だけだから安全に即デプロイできるとは言えない**。ユーザー実機で通知到達済みの本番v29を保全し、既存シナリオと変更シナリオを比較した後、明示承認を得てから反映を検討する。現時点でデプロイなし。
