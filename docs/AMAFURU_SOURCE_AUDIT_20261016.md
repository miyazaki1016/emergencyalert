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

## 2026-10-16 終了通知の具体的シナリオ（コードからの静的判定）

| 状態・入力（他の通知理由なし、通知ON、購読・送信成功を仮定） | 本番v29 | main |
|---|---|---|
| `confirmed_weather=UNKNOWN`, 前回イベント非終了、`rain_ending_notified=false`, 今回 `RAIN_ENDING` | 終了通知を試みる | 終了通知を試みない（確定雨が必要）。ただし同時 `rainConfirmed` の場合は例外 |
| `confirmed_weather=RAINING`, 前回イベント非終了、未通知、今回 `RAIN_ENDING` | 終了通知を試みる | 終了通知を試みる |
| 終了通知済み、`NO_RAIN` 3回連続 | `rain_ending_notified=false` に解除 | `rain_ending_notified=true` を保持 |
| 終了通知済み、`RAIN` 3回連続 | `rain_ending_notified=true` を保持 | `rain_ending_notified=false` に解除 |
| `rainStreak` が今回3に達し、`rainConfirmed=true` かつ今回 `RAIN_ENDING` | `rainEnding` 条件が偽でも `confirmedAndEnding` を本文生成に利用。ただし通知の決定には渡さず、他の通知理由がなければ送信しない | `confirmedAndEnding` を通知決定に渡すので送信を試みる |

**注意:** 上表はmainと実デプロイv29のコード分岐を手動評価したもので、端末にPushを送信するテストは実施していない。 `shouldNotifyForRain` の `becameActionable` / `retryPending` や `severeEscalation` が真なら、表の「試みない」でも別の理由で送信しうる。通知OFF・購読なし・Push失敗なら到達しない。

**既存テストのカバー範囲:** mainの `lib/weather/rain/watchNotificationDecision.test.ts` には「終了通知後の乾燥中は抑制を保持」「連続3回の降雨で再武装」「終了通知が届いたら抑制セット」の3件がある。**テストコード存在の確認のみ、実行は未実施。** 本番v29の旧式とのA/B自動比較は今後の検証候補。

**運用上の優先度:** 誤った終了通知・新しい雨エピソードでの再通知の有無をユーザー実機で確認する際も、現在到達しているPushを保護。いきなりmainを本番デプロイしない。

## 2026-10-16 既存通知テストの棚卸しと不足ケース

`package.json` の `npm test` は `vitest run`。main `lib/weather/rain/watchNotificationDecision.test.ts` を全件実読（**実行は未実施**）。

**存在するテスト:** `shouldNotifyForRain` 11ケース（actionable遷移、未送信再試行、送信済み重複防止、地点通知OFF、INFO、エピソード更新、UNKNOWNを挟むケースなど）、`nextLastNotifiedAt` 3ケース、`nextRainEndingNotified` 3ケース。合計**17個の `it`**。

**現状の不足（このファイルのテストに存在しない）:**
1. `index.ts` の `rainEnding` 判定で `confirmed_weather=UNKNOWN/DRY/RAINING` の各組み合わせを比較する統合テスト。
2. `rainConfirmed && RAIN_ENDING` が同時成立したとき、通知判断・本文・イベント種別が整合するかのテスト。
3. 本番v29とmainを同一入力にかける**差分回帰テスト**。特に終了通知後の乾燥3回→再降雨3回→終了という複数サイクル。
4. `push_subscriptions` 0件・送信失敗・部分成功・404/410削除・`notification_deliveries` 記録失敗などのDB/Push連携テスト。
5. cronの二重起動・途中失敗・100件上限・地点追加削除・外部雨API失敗時の状態維持を含む運用テスト。

**注意:** これは**当該テストファイル**にないケースの指摘。リポジトリの別ファイルに存在する可能性は全テスト横断調査で確認する。現行本番でユーザーが実機Push到達を確認している事実は維持し、既存通知の挙動を壊さないようにする。

**推奨順:** (A) 読み取り専用の本番ログ確認、(B) 既存テスト横断探索、(C) 本番v29を基準にしたオフラインの差分テスト追加、(D) 実行結果レビュー、(E) 別途承認後に限り本番更新を検討。

## 2026-10-16 本番配送記録の追加確認（読み取り専用）

本番 `EmergencyAlert` の `public.notification_deliveries` を個人情報・本文を取得せず集計。

- **配送成功として記録された行数:** 累計120件、直近7日12件。最新 `2026-10-15 15:00:05 UTC`（JST 10/16 00:00頃）。
- **種別:** `RAIN_ENDING` 75件、`ACTIONABLE_RAIN_APPROACHING` 27件、`RAIN_RETURNING` 16件、`RAIN_CONFIRMED_ENDING` 2件。合計120件。
- **cron直近7日:** `cron.job_run_details` の `succeeded` 2016回（5分間隔×7日と一致）。ただしcron成功はEdge内部全件成功と同義ではない。
- ユーザーによる実機スマホ通知到達報告と、DB上の配送成功記録は**独立した根拠**。DBの1行は `delivered_count` に複数配送を含み得るため、**120行を120端末への到達件数と断定しない**。
- **調査上の注目点:** `RAIN_ENDING` が75/120行と最多。誤通知と断定せず、mainと本番v29で異なる終了通知条件・抑制解除条件を最優先の回帰検証対象にする。実際の天候・端末表示・イベント時系列との照合が必要。
- **安全:** 本番テーブルはSELECTのみ、Edge Functionやcron、通知配信には変更・テスト送信なし。

## 2026-10-16 実機フィードバック：近傍雨雲通過で「終了」のみ届く

ユーザーの実観測：**監視地点では雨を感じなかった**が、後でレーダーを見ると**近くを雨雲が通過していた**。その際「雨が降る」通知はなく、「もうすぐ止む」通知が届いた。**同一雨雲の通過につき終了通知はおそらく1回**（記憶に基づく暫定情報、重複が絶対にないと確定していない）。

**切り分け:** 同一雨雲について多数の終了通知が連発する問題よりも、**地点での降雨未成立／近傍通過だけで終了通知の資格が生じる**ことが優先仮説。ユーザーの地上観測とレーダー推定は必ずしも一致せず、どちらが誤りと決めつけない。

**検証すべきシナリオ:** (1) 雨域が地点をかすめる、(2) 近傍のみ通過、(3) 地点に実際に雨が降る、(4) 地点での確定降雨がないまま `RAIN_ENDING`、(5) 雨雲が再接近、(6) 予報・観測のUNKNOWN混在。接近通知（将来予測）と終了通知（地点で成立した降雨）で根拠を分離する。**単純な「接近通知がなければ終了通知禁止」は採用しない**：突然の雨でも終了情報が有用なため。

**設計候補（未決定）:** 地点降雨の根拠（観測時刻・地点サンプル・連続性・強度）と近傍雨域の根拠を別フィールドで保持し、終了通知に地点降雨の成立を要求。具体的な閾値・時間窓はデータ再現後に決定し、既存の有用な通知を抑えすぎないこと。

**状態:** 実機フィードバックを記録したのみ。コード・本番設定・通知は変更していない。

## 2026-10-16 ユーザー決定：雨の判定は登録地点とLIVE・JAPANで共通化

**正式な方向性:** アメふるは (1) 登録地点にこれから雨が降ることを知らせ、洗濯物を守る機能、(2) LIVE・JAPANで全国の30mm/h以上の大雨域を表示する機能、の2本柱。**雨そのものの解析・判定は共通エンジン**とする。先に記した「目的別の判定エンジン」は、雨の物理的判定を重複実装する意味ではない。共通判定結果を受け取る**利用目的別の通知／表示ポリシー**として整理し直す。

提案する責務境界：
1. **共通データ取得・品質検証:** JMAの観測・予測フレーム、時刻、座標、強度区分、欠測、ソース更新時刻、信頼度・不確実性。全国と地点で入力表現・分類を統一。
2. **共通雨判定エンジン:** 地点での雨の有無（推定）、雨域の移動、降り始め／継続／弱まり／終了、強度(mm/h相当)、連続性、観測と予報の区別、近傍通過と地点への到達の区別。閾値はエンジンの入力・評価条件として扱い、通知や地図固有のif分岐を混入させない。
3. **登録地点ポリシー:** 共通結果から「洗濯物を取り込むべきリスク」「通知タイミング」「重複抑制」「終了通知」を決定。弱雨も考慮し、降る前の通知を優先。
4. **LIVE・JAPAN表示ポリシー:** 共通結果から**30mm/h以上**の雨域を全国地図に表示。全国処理はタイル／メッシュ／バッチのスケール要件を別途満たす。現況と予測の表示区別は仕様検討。
5. **将来の美咲連携:** 同じ共通判定結果の読み取り専用スナップショットを提供。美咲側でJMA取得や雨判定を重複実装しない。

**実装前の調査事項:** 既存 `RainInterpretationEngine`（地点の時系列解釈）とPR #59の全国判定／メッシュ処理の入出力・強度境界・時刻整合・欠測処理を対照し、共通化可能な純粋関数と全国固有のスケーリング処理を分離。既存本番Pushを壊さず、仕様・テスト→段階的移行。**現時点は設計方針の記録のみ、コード変更・本番適用なし。**

## 2026-10-16 LIVE・JAPAN：未来の大雨予測表示（ユーザー要望）

ユーザーは**LIVE・JAPANで現在だけでなく未来の大雨も見たい**と明示。全国30mm/h以上の雨域表示を、**現況＋予測**の時系列として設計する。予測対象時間の長さ（30分・60分など）は未決定。

**設計原則:**
- 共通雨判定エンジンは、各地点・メッシュの `validTime`、`baseTime`、観測／予測区分、強度クラス、欠測・不確実性を統一して返す。
- LIVE・JAPANはタイムライン操作（現在・未来の時刻選択・再生）で30mm/h以上の雨域を表示。**予測は予測として明確に区別**し、未来を実測として扱わない。
- 全国30mm/h閾値は表示ポリシー。登録地点の弱雨接近通知の基準に流用しない。
- 時刻の新しさ・予測有効範囲・欠測・表示の更新遅延を画面に明示。予測データの提供時間幅と粒度は、実際のJMAデータ仕様とPR #59の既存実装を照合して決める。
- 将来の大雨を可視化する機能と、全国へプッシュ通知を配信する機能は別。**全国一斉Pushは今回の要望に含まない**。
- 現時点は要件記録のみ。既存本番Push、LIVE・JAPANの現行実装、本番DBは変更しない。

## 2026-10-16 洗い出し再開：登録地点の雨判定から終了通知まで（main静的追跡）

**確認したソース:** `app/api/rain/route.ts`、`JmaPublicImageProvider.ts`、`targetTimes.ts`、`observationTargetTimes.ts`、`webMercator.ts`、`classifyPixel.ts`、`RainInterpretationEngine.ts`、`canPublishRainInterpretation.ts`、`toRainSemanticEvent.ts`、`supabase/functions/watch-rain/index.ts`。実行テストではなくソース追跡。

1. **取得**: 登録緯度経度→ズーム10のWebMercatorタイル・**単一ピクセル**に変換。JMA `targetTimes_N1.json` の最新観測1フレームと `targetTimes_N2.json` の予報時系列から `hrpns` PNG同一ピクセルRGBAを読み取る。取得エラーは `FETCH_ERROR`。
2. **雨の有無**: `classifyRainPixel` は透明（alpha=0）→`NO_RAIN`、既知パレットの有色ピクセル→`RAIN`＋強度区分、未知色→`UNKNOWN_PIXEL`。**RAIN判定そのものには5mm/h下限なし**。レーダー画素であり現地地上の実測雨量ではない。
3. **予報解釈**: 現況`RAIN`なら予報中の3連続`NO_RAIN`から`ENDING`、または`EASING`／`RAINING`。現況`NO_RAIN`なら5mm/h以上の将来雨フレーム、または1〜5mm/hが5分刻み3連続のフレームで、30分以内なら`ACTIONABLE_RAIN`、それ以外は`RAIN_AHEAD`等。現況の時刻鮮度は-5〜15分。
4. **公開可否**: `canPublishRainInterpretation` は`ENDING`時、終了時刻から3連続`NO_RAIN`が使用可能であることを確認。ただし**現況の雨が地上で実際に降ったことを独立検証する仕組みではない**。
5. **イベント化**: `ENDING`→`RAIN_ENDING`、`ACTIONABLE_RAIN`→`ACTIONABLE_RAIN_APPROACHING`（`LIFESTYLE_ACTION`）。`ENDING`は`INFO`。公開可否を満たした場合のみAPIがイベントを返す。
6. **通知worker**: 5分毎のcronが登録地点ごとに`/api/rain`取得。現況`RAIN`を3回連続で`rain_streak>=3`、`confirmed_weather=RAINING`とするが、**3回連続レーダー画素RAIN＝現地での地上降雨確証ではない**。`RAIN_ENDING`の通知可否はworkerでさらに決定。
7. **重要な本番差分**: 本番v29は`RAIN_ENDING`の通知条件に`confirmed_weather=RAINING`が**ない**。mainにはこの条件があるが、`confirmedAndEnding`経路が別にある。既存の`RAIN_ENDING`通知75/120件とユーザーの「近くを雨雲が通過、現地では降らず、終了通知だけ来た」報告と整合する可能性はあるが、**特定の通知の因果関係は未確定**。
8. **精度上の論点**: ズーム10・単一ピクセルの点判定で近傍通過・地上降雨・画素境界・パレット変換を区別できるか未検証。観測フレームの`validTime`と5分cronの連続回数が、必ずしも独立した3観測時刻を意味するかも未確認（同じ観測フレームを複数回読んだ可能性）。`rain_streak`を3回増やす際にsourceValidAtの変化を要求する処理はworker内に見当たらない。

**未確認／次の調査**: `pngPalette.ts`の強度色境界と試験、`watch-rain`の通知本文と`shouldNotifyForRain`の具体条件、productionのイベント時系列（プライバシー保護した集計のみ）、PR #59全国処理との強度分類共通化。**修正・本番適用なし。**

## 2026-10-16 追加洗い出し：色パレット／通知条件の実装確認

- `lib/weather/providers/jma/pngPalette.ts`: JMA hrpns PNGの**8色だけ**をRGBA完全一致（alpha=255含む）で分類：`LT_1`, `1_TO_5`, `5_TO_10`, `10_TO_20`, `20_TO_30`, `30_TO_50`, `50_TO_80`, `GTE_80`。透明alpha=0は別関数で`NO_RAIN`、未知の非透明色は`UNKNOWN_PIXEL`。30mm/h以上の境界は`30_TO_50`から。実データと凡例の根拠は`docs/PNG_PALETTE_EVIDENCE.md`。
- `classifyPixel.test.ts`: 5件（透明2、30〜50色、20〜30色、未知色）。`pngPalette.test.ts`: 8色の表引き、未対応色、保存された実PNGの色検証。**テストの存在を確認、今回の実行は未実施**。
- `supabase/functions/watch-rain/notificationDecision.ts`: 通知条件は (a) `rainEnding` true、(b) urgencyがINFO→LIFESTYLE_ACTIONへ変化、(c) actionableかつ`lastNotifiedAt`なし。すべて通知設定ONが前提。`nextLastNotifiedAt`は成功配信で時刻更新、actionable未配信時は前回時刻維持、それ以外でnullへ。
- `watch-rain/index.ts` main: `RAIN_ENDING`は通常`INFO`なので(b)(c)ではなく(a)から通知される。通知文は「雨、もうすぐ止みそうだよ」。本番v29ではmainと異なり`rainEnding`の`confirmed_weather=RAINING`制約がない（先述）。`confirmedAndEnding`は`rainStreak>=3`とENDINGが同時に成立した場合の別経路。
- **実装上の重要点**: `RAIN_ENDING`の成立は現況`RAIN`画素＋予報の3連続`NO_RAIN`。これは**現在降雨と将来終了のレーダー解釈**であって、地上で実際に降ったことの証明ではない。終了通知の誤認原因候補は「近傍雨域の単一画素判定」「同一観測フレームを5分cronで再カウント」「本番v29の終了通知条件」であり、特定通知の原因は未確定。
- **注意**: `severeFrame`は30mm/h以上の未来フレームを別経路で判定し、`severeEscalation`が真なら優先通知。これはLIVE・JAPAN全国表示ではなく、**登録地点workerの通知**処理。
- 次はPR #59全国workerの入力・強度分類・時間軸を対照し、共通化できる部分と未実装部分を棚卸しする。設計改善案の実装には進まない。

## 2026-10-16 PR #59 全国30mm/h以上の未来予測処理：第一回ソース棚卸し

**対象:** `feat/national-heavy-rain-preview`（OPEN PR #59）、mainとの差分比較。比較時点で**ahead 533 / behind 5**、多数の全国用API・worker・地理データ・テスト・proof・3件のDB migration。**未merge／本番稼働とは区別**。

- **判定共通性は一部すでに実装済み**: `lib/weather/rain/nationalHeavyRain.ts` は登録地点と同じ `lib/weather/providers/jma/classifyPixel.ts` を直接import。したがってRGBA→雨強度8クラスは現時点ですでに**共通の実装**。30mm/h以上は`heavyRainLevel`で `30_TO_50`=`HEAVY`、`50_TO_80`=`VERY_HEAVY`、`GTE_80`=`TORRENTIAL`。
- **違い**: 登録地点はズーム10の1ピクセル＋時系列を `RainInterpretationEngine` で解釈。全国はPNG全体を走査（`scanHeavyRainTile`）、強いピクセルを抽出して位置・形状・市区町村へ集約。全国側は雨量の色分類は共有しているが、登録地点の `RainInterpretationEngine` にある弱雨持続・降り始め・終了等の**時系列意味判定は再利用していない**。これは機能目的の違いであり、即不具合とは断定しない。
- **未来予測は既にプロトタイプ実装あり**: `app/api/rain/national-preview/route.ts` はJMA観測N1と未来予測N2を取得し、ズーム4の日本周辺6タイルで、**現況で30mm/h未満・予測で30mm/h以上**の画素を時刻別に抽出する。応答は `baseTime` / `validTime`、強度別counts、候補上限200を返す。**Proof endpointのみで全国Pushはしない**。
- **全国本処理の段階的詳細化**: `nationalRainWorker.ts` はキューjobをlease token付きでclaim、JMA PNGを取得、zoom6→8→10へ候補領域を絞って細分化、zoom10では強雨画素のポリゴン化・自治体解決を行い結果を保存。deadline / defer / stale leaseへの対処あり。ここで使う `scanHeavyRainTile` も同じ色判定関数。
- **時間軸**: `nationalRainCycle.ts` は最新予測`basetime`を使って新規サイクル／未完了再試行／完了済みskipを判定。処理完了は必要フレーム数が揃うことが条件。**予測の全時間帯がUIで見えるか、実際に全国で完走できるかはこの調査だけでは未確認**。
- **要注意の具体点**: `national-preview/route.ts` の`scanFrame`はタイル取得失敗時に空配列を返すため、欠測と雨なしの区別が応答countsに現れない可能性がある（コード上の事実）。登録地点は取得失敗を`FETCH_ERROR`として保持。全国proofと登録地点で欠測意味論の扱いに差がある。実際の影響は要検証。
- **現段階の結論**: 「雨量の色判定をこれから共通化」は不正確。**色判定はすでに共通**。未整理なのは予測時間・欠測品質・雨域追跡・通知/表示に渡す共通結果契約、および全国workerの本番準備状況。次は全国queue/worker API、テスト・proofと本番DB適用有無を対照する。

今回も読み取りとdocs-only更新だけ。本番コード・DB・pushには変更なし。

## 2026-10-16 PR #59 全国queue/worker API・本番DB照合（read-only）

**ブランチコード:**
- `app/api/rain/national-queue/route.ts`: `POST`、`NATIONAL_RAIN_WORKER_SECRET` bearer認証必須。JMA最新予測basetimeごとにz4の6タイルを走査、現況30mm/h以上と同じ画素を除外、候補から詳細化jobを作成、`national_rain_scan_cycles`へ必要フレーム数と利用可能フレーム数を記録。タイル欠損時は該当予報フレームを未完了として扱い、雨なしにはしない。
- `app/api/rain/national-worker/route.ts`: 同認証必須、`POST`。上限50ジョブ/呼び出し、N03行政区域データを使う市区町村解決。 `NATIONAL_RAIN_N03_PARTITIONS_ENABLED=true`時だけ分割済みデータを使用し、データ不足時に旧方式へ自動フォールバックしない。
- `nationalRainWorker.ts`: lease tokenによるジョブ所有権・期限・延期、z6→z8→z10の細分化、強雨ポリゴンと自治体情報の保存を実装。これはコードの確認であり実運用の成功を意味しない。
- ブランチmigration 3本：`20260929_create_national_rain_refinement_jobs.sql`（queue/results/RPC）、`20260930_create_national_rain_proof_cron.sql`（5分ごとscan＋worker2系統）、`20261006_create_national_rain_scan_cycles.sql`（予報basetime完了状態）。いずれもコメントでProduction適用前の明示的レビューを要求。登録地点のwatch-rain/pushとは分離。

**本番Supabase EmergencyAlert `yqyevipvkdwmhcaxywes`（2026-10-16、SELECTのみ）:**
- `information_schema.tables` の `public.national_rain%` **0件**。
- `cron.job` の名前 `%national%` **0件**。
- `information_schema.routines` の `public.%national_rain%` **0件**。
- **結論: PR #59全国処理の必要テーブル・RPC・スケジュールは現本番DBに存在せず、全国queue/workerは本番DB基盤として未適用。** プロトタイプのAPIソースが存在することと、本番で全国処理が稼働することを区別する。
- 前回の `national-preview` proof APIが失敗時に空扱いするのに対し、**queue APIは欠測フレームを未完了扱い**に改善されている。API別に品質扱いが異なるため、同一仕様と決めつけない。

**残る調査:** ブランチ上のqueue/workerテストの網羅範囲、readiness proofの証拠と未達条件、LIVE・JAPAN UI接続、全国の未来表示時刻と地震等の表示契約。今回は実行・本番変更・mergeなし。

## 2026-10-16 全国大雨検知の現在地（追加確認）

- PR #59の `nationalRainWorker.ts` は、強雨候補をズーム6→8→10に細分化し、ズーム10で雨域ポリゴンを作成する。`nationalRainMunicipalities.ts` はそのポリゴンと行政区域の交差から **都道府県・市区町村・行政コード**を返す。全国の町丁目確定ではない。
- `nationalRainQueue.ts` は時刻・タイル・画素窓を単位としてジョブを登録し、claim時のlease tokenを完了・延期RPCへ渡す。`national-worker/route.ts` は認証付きの**proof worker**で、レスポンスに通知や登録地点pushを行わないことを明記する。
- 本番DBには全国専用のテーブル・RPC・cronがない（同日のSELECT照合）。従って『検出→詳細化→市区町村候補の算出』は**ブランチ上の実装・検証段階**であり、全国本番サービス完成ではない。
- 過去のCI記録: 2026-10-15 CI #795は全工程成功と総覧に記録。その後のCI run 38688011787はテスト46ファイル238件成功だがJMA外部503で全体失敗。今回CIの現行最終状態を再照会していないので、最新HEADの全工程成功とは断定しない。
- 既存readiness proofの負荷モデルは軽負荷で完走する一方、1536ジョブ/5分条件で滞留を示す。実Supabase Storage/DB通信、Vercelの実メモリ・deadline、全国負荷の持続消化は未検証。**Production readiness NO**。
- LIVE・JAPANは新規試作。全国大雨結果との連携は現段階で実装済みと扱わない。ユーザー要望に従い今は連携設計や実装へ進まず、全国検知の実装到達点を優先して棚卸しする。

## 2026-10-16 市区町村特定処理の詳細確認

- `nationalRainMunicipalityResolver.ts`: 雨域ポリゴンが空なら空配列。雨域bboxと47都道府県索引bboxの重なりで候補県を選び、その県のN03行政区域データを読み、雨域との交差を判定する。**都道府県選別はbboxの粗い絞り込み、最終判定は多角形の交差**。
- `administrativeAreas.ts`: Polygon/MultiPolygonに対応。bboxで粗選別後、辺の交差・包含関係・穴を考慮して雨域と行政区域の交差を判定。雨域と境界が触れるケースも交差判定に含む実装。地図上の交差であって、実地で30mm/hの雨を観測した証明ではない。
- `nationalRainMunicipalities.ts`: 出力は `code`, `prefecture`, `municipality` の3フィールド。**町丁目名は出力しない**。市区町村の内部コードは5桁を想定。
- `n03PreparedStorageLoader.ts`: `national-rain-n03` Storage bucketの版付き `YYYYMMDD/NN.areas.json` を都道府県別に読む。非空配列・基本shape・県名一致・5桁コード・コード重複を検査。欠損・読込失敗・形式不一致は例外。県単位LRU最大4県だが、**バイト量/RSSの上限を保証しない**。
- `national-worker/route.ts`: `NATIONAL_RAIN_N03_PARTITIONS_ENABLED=true` の時のみ分割manifest/chunk読み込みに切り替える。未配備/破損時は自動で旧方式へ戻さない。通常は上記県単位ローダーを使用。
- 検証の証拠: PR #59総覧は全国47県・N03実験分割の読戻し、巨大Polygon比較446件とchunk resolver比較97件の一致を記録。一方、全国町丁目の本番データセット、実Storage読込、47県の実雨域・境界を使った網羅的精度、実ワーカー負荷は未完了。したがって**市区町村特定はソース実装あり・限定検証済み・本番未完成**。
- 今回はコードと既存証拠の読取のみ。テスト新規実行、本番Storage/DB変更、PR merge、通知配信なし。

## 2026-10-16 30mm/h強雨域の見逃し経路：静的ソース確認

- **最重要の未検証点**: `national-queue/route.ts` は全国候補を**zoom4の固定6タイル**から探し、30mm/h以上の画素のみを詳細化ジョブへ渡す。`scanHeavyRainTile` はデフォルト `stride=2`、すなわち粗探索は**横縦1画素おき**（4画素中1画素）で走査。周囲に強雨画素があっても走査対象画素が30mm/h未満なら、その強雨域は候補にならず、z6→z8→z10の精査にも進まない可能性がある。**見逃しが実際に発生した頻度は未測定**。
- z6/z8/z10のworkerは `scanHeavyRainTile(..., 1, scanWindow)` で精査し、**対象窓内は全画素**を走査。ただしz4段階で候補にならなかった領域は精査できない。
- `national-queue/route.ts` は現況で30mm/h以上のz4画素を `currentStrong` として保持し、**同一z4画素が現況でも強雨なら予測候補から除外**する。これは『今は弱く未来に強くなる雨』抽出に近い一方、**現況から継続している強雨、強度上昇、粗画素内で移動した雨域**を全国候補から除外し得る。LIVE・JAPANで現況強雨も扱う要件との適合は別途確認が必要。
- JMA z4→z10の異なる解像度での強雨一致・低ズーム取りこぼしは既存proofでも**未解決ゲート**。粗い画素と詳細画素の強度が一致するとは保証できず、z4が弱雨でもz10に30mm/h以上の小雨域が存在し得る。逆にz4候補がz10で消える可能性もある。数値評価・網羅的実データ検証は未実施。
- 欠測時の扱い: 現況6タイルのいずれかがHTTP失敗するとAPI全体503。予測の6タイルのいずれかが失敗するとその予測時刻は `usableFrames` に入らず、cycle `INCOMPLETE`。欠測を雨なしにしない点は良いが、再試行・未完了のままの時間遅延は別ゲート。
- 結論: 現時点の『全国の30mm/h以上を漏れなく探せる』は**未証明**。①z4低解像度の感度、②stride2の標本抜け、③現況強雨の同一画素除外、④JMAタイル欠測/遅延、⑤詳細化ジョブ滞留を独立した見逃し・遅延候補として管理。今回は原因候補の静的洗い出しのみで、実発生を断定しない。

## 2026-10-16 過去の実証と現行ソースの照合・訂正

- PR #59 `docs/PROJECT_OVERVIEW.md` に記録された2026-09-30 live JMA observation proof: z4全国6タイル配下のz8 1,536タイル、z4親393,216画素、z8強雨6,078画素、**強雨見逃し0、親の最大雨量階級一致100%（当該1 frame）**。この検証成果を未実証扱いしない。ただしz4→z10全時刻・全地域の普遍保証ではない。
- 2026-10-05以降の新規queue本流は `national-queue/route.ts` の `stagedRefinementJobsFromCoarseCandidates(candidates,frame,10)` により **direct z4→z10**。`nationalRainWorker.ts` のz6/z8分岐は旧job互換。前節の『z6→z8→z10精査』という本流説明を訂正する。
- 旧z8→z10大量比較は30分timeoutを反復したため、bounded deterministic sample proofへ変更、当時のCI成功記録あり。タイムアウトを現行direct-z10の失敗と混同しない。
- **残るソース上の照合事項**: `nationalHeavyRain.ts` の `scanHeavyRainTile` はデフォルト `stride=2`。実queueの `scanFrame` はデフォルトで呼ぶ一方、`scripts/national-forecast-z4-screening-proof.ts` の `scan` は全画素走査。親最大階級の検証と**親画素を全件列挙しているか**は別の性質。stride2の採用理由、候補抜けの評価、他proofの走査条件を今後ソースとテストで確認。原因・実被害は未確定。
- この記録は先の静的リスク記述を補足・訂正するもので、Production変更・実装修正・mergeはなし。

## 2026-10-16 Z4 stride=2 のテスト照合（静的確認）

- PR #59 `nationalHeavyRain.ts`: `scanHeavyRainTile(..., stride=2)` がデフォルト。`national-queue/route.ts` の `scanFrame` はstride指定なしで呼び、Z4画素のx/yを2ずつ進める。最大階級の親子一致というJMA画像の性質とは独立した**サンプリングの問題**。
- `scripts/national-forecast-z4-screening-proof.ts`: `scan` はx/y全画素を調べ、>=30候補を集計する。実queueのstride2を再現していない。
- `lib/weather/rain/nationalHeavyRain.test.ts`（139行）は強雨レベル・候補/ポリゴン系テストが中心で、確認した内容にstride2とstride1の検出差を明示する回帰テストなし。`app/api/rain/national-queue/route.test.ts`（189行）は `scanHeavyRainTile` をmock化しており、実PNGのstride挙動を通していない。`nationalRainQueue.test.ts`（146行）は候補からz10 windowへのmappingを検証するが、候補抽出の網羅性を証明しない。
- **採用理由は未特定**。大量比較の30分timeoutは過去記録にあるが、それをstride2採用の直接原因と断定できるcommitは今回特定できていない。見逃しの実測件数も未測定。次は実装履歴と低zoom proofのstride条件を追う。修正・本番変更なし。

## 2026-10-16 stride=2 導入履歴探索の結果

- GitHub commit searchで `stride`, `coarse`, `scan`, `nationalHeavyRain` を検索したが、該当メッセージのcommitを特定できず。検索結果なしは変更履歴が存在しない証拠ではない。全commitのfile history/blameをまだ網羅していないため**導入commit・理由は未特定**。
- 既知commit `f147a80cd9863a1321e2617c3fa5fa151e2bb011` は `nationalRainQueue.ts` のdirect-z10/window改修であり、stride=2の導入根拠ではない。
- `nationalHeavyRain.ts` のデフォルト2とqueue呼び出し側の引数省略はソース上で確定。`nationalHeavyRain.test.ts` は候補/形状系、`national-queue/route.test.ts` はscanをmock化、`nationalRainQueue.test.ts` は座標変換を確認。**現時点ではstride2の正当化・実測見逃し率は証拠なし**。過去のtimeoutと結びつけない。
- 引き続き事実の棚卸しのみ。Production・実装変更なし。

## 2026-10-16 stride=2 の履歴：古い実ファイルを直接照合

- PR #59 の2026-09-30時点HEAD `3fe209ffdb91ee09e4caf780c3fe7b5fb2b63ae8` にある `lib/weather/rain/nationalHeavyRain.ts` を実際に取得。すでに関数宣言が `scanHeavyRainTile(buffer, zoom, tileX, tileY, stride = 2)` であり、x/yとも `+=stride`。**stride2は少なくとも2026-09-30時点で存在**し、10/05 direct-z10変更時の新規導入ではない。
- direct-z10移行commit `f147a80cd9863a1321e2617c3fa5fa151e2bb011` の同ファイルも `stride=2` を保持し、`scanWindow` が追加されている。現在のPR #59でも `stride=2` は継続。
- これで導入時期の上限は絞れたが、9/30以前の初出commit・設計理由は未確定。旧Z8→Z10比較timeout（10/05以前の課題）をstride2導入理由と断定できない。
- 性能・メモリ・検出漏れについての評価は別途必要。ソース/テスト監査のみ、本番・実装変更なし。

## 2026-10-16 stride初出の境界確認（追加）

- 2026-09-30時点のPR #59 commit `3fe209ffdb91ee09e4caf780c3fe7b5fb2b63ae8` では `lib/weather/rain/nationalHeavyRain.ts` が存在し `stride=2`。このファイルは現行mainにも、2026-09-30 main側commit `6e55b1854c2fc72e7a9b0961b8d97c1fb512c19d` にも存在しない（GitHub Contents API 404）。**PR #59の未merge側にある実装**である。
- mainと上記PR HEADの比較はPR側104 commits ahead、5 behind。したがってmain側commitを古い実装履歴として遡っても、このファイルの初出を直接追えない。PR branchの初期commit群が調査対象。
- 初出commitとstride=2の設計理由はまだ未特定。古いソースの存在確認と、理由の確証は分けて記録する。実装/本番変更なし。

## 2026-10-16 初期PR commitの日時確認と追跡限界

- `3fe209ffdb91ee09e4caf780c3fe7b5fb2b63ae8` のGitHub commit metadataは `2026-09-29T17:56:04Z`（JST **2026-09-30 02:56**）、message `Test rain boundary edge cases`。差分は `nationalHeavyRain.test.ts` のポリゴン境界テスト追加のみ。**stride=2の導入commitではない**が、この時点の `nationalHeavyRain.ts` にすでにstride=2がある。
- `f147a80cd9863a1321e2617c3fa5fa151e2bb011` は2026-10-05のqueue mapping変更で、変更ファイルは `nationalRainQueue.ts`。こちらもstride導入commitではない。
- Connectorのcommit検索はPR #59側の古いcommitメッセージを十分に拾えておらず、比較APIも初期104 commitのSHA一覧を返さないため、**最初にstride=2を書いたcommitをまだ断定できない**。次はPR側のコミット一覧またはfile blame取得が必要。設計理由の推測で結論を埋めない。

## 2026-10-16 PR履歴取得制約とZ4→Z10候補の伝播確認

- GitHub connectorでPR branch全コミットのfile history/blame一覧を取得する専用actionは見つからず、`search_commits` はbranchの初期コミットを十分に返さない。作業コンテナからGitHubへ直接gitアクセスもDNS解決失敗。**stride初出commit・理由の確証は引き続き保留**。証拠のない性能最適化説は採用しない。
- 一方、`lib/weather/rain/nationalRainQueue.ts` 36–100行を直接確認。`childTilesForCandidate` は**渡された各Z4候補画素だけ**についてz10の正確な64×64画素windowを生成し、`stagedRefinementJobsFromCoarseCandidates` は候補ごとにwindow付きjobを作る。周辺の未候補Z4画素まで自動拡張する仕組みではない。
- したがって `scanFrame` がstride2で読み飛ばしたZ4画素について、**その画素自身を親とするz10 jobはこの経路からは生成されない**ことはコードから確定。ただし当該画素が実際に30mm/h以上か、他の通知経路で検出されるか、実運用の漏れがあるかは未検証。Z4画像の2×2画素複製などの性質も未確認。
- この発見はソース経路の監査結果であり、修正や本番反映の承認ではない。

## 2026-10-16 Z4画素配置に関する過去Proofの適用範囲

- `scripts/national-forecast-z4-screening-proof.ts` を実読込。PNGの `py=0..height-1`, `px=0..width-1` を**全画素**走査し、30mm/h以上の親候補数とz8候補tile数を数える発見用Proof。出力note自体も「usable forecast frameでのparent/descendant exhaustive validationは別途必要」と明記。**実queueのstride2の妥当性を検証するProofではない**。
- `docs/PROJECT_OVERVIEW.md` にはlive JMA z4→z8最大階級一致Proof、bounded z4→z10 Proof成功が記録されている。ただし今回確認した記述と上記スクリプトからは、**Z4強雨画素が必ず2×2に複製される／stride2で全強雨域を拾える**という直接の実測結果は見つからない。既存Proofの価値は維持しつつ、未検証命題を混同しない。
- 現時点でZ4実画像の偶奇位置別強雨分布を測定したわけではない。stride2が実際に取りこぼすか、どの程度かは**未測定**。コード変更なし、調査のみ。

## 2026-10-16 Z4偶奇画素と公式lowzoom Proof実装の照合

- 正式なCI Proofの実ファイルをcommit `351f7cf8b6e8e00c18b485a9236be3fcb7faa99b` から特定：`scripts/national-lowzoom-max-rank-proof.ts`。関連workflowは `.github/workflows/national-lowzoom-max-rank-proof.yml`（commit `f031819...`）、`JMA_LOWZOOM_SAMPLE_PARENTS=64` 設定は `b6d5497...`。
- 最新Proofのz10 detail scanは各tileのx/y全画素（109行付近）、親Z4比較も各tileのx/y全画素（137行付近）。**親Z4のx/y偶奇別の分布・stride2での候補回収率は集計していない**。テストファイルは親座標対応を検証するもので、stride2の検証ではない。
- Proof出力の `sampling.method="deterministic-even-tile"` は**detail tileの決定論的等間隔抽出**（92–95行）を意味し、Z4の偶数画素抽出を検証したものではない。名称の `even` をstride2の証拠と誤読しない。
- 過去の最大階級一致とzero-missは**全画素比較または選択したdetail tile**に対する実績。実queueのstride2についての直接的な見逃し率・偶奇配置の実測は今回の対象スクリプトにはない。未確認として維持。Production・実装変更なし。
