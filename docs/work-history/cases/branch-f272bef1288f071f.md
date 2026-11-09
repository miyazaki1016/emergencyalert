# automation/ledger-facts-41476277269

**目的：** 未確認

**実装状態：** mainとの差分を収録。差分ゼロも記録

**検証の扱い：** 未確認

**PR状態：** PR未関連のブランチ差分

**main統合：** 未確認

**本番反映：** 未確認

**残課題：** 未確認

**次の作業：** 関連PR・mainとの同等実装を照合。ブランチの存在だけで未完成扱いしない

根拠取得日時 (UTC)：2026-11-09T09:51:42.691298+00:00


## 実際の変更処理（コードから抽出）

差分・ソースを参照

- [docs/DEVELOPMENT_LEDGER.md](https://github.com/miyazaki1016/emergencyalert/blob/277a7eed7d666bc895020d7b823b6bd6fd1ac15a/docs/DEVELOPMENT_LEDGER.md)：先頭18000文字・原本リンク参照

## 検証実行の事実

| ワークフロー | 結果 | 対象SHA |
| --- | --- | --- |
| 実行証拠未取得 | 未確認 | — |

## 当時の説明・結論（原文。作者の主張と実測を区別）

```text

```

## ソース・テスト・資料の抜粋（実行はしない）

### docs/DEVELOPMENT_LEDGER.md

```text
diff --git a/docs/DEVELOPMENT_LEDGER.md b/docs/DEVELOPMENT_LEDGER.md
index d6f5ef0..7a7aea8 100644
--- a/docs/DEVELOPMENT_LEDGER.md
+++ b/docs/DEVELOPMENT_LEDGER.md
@@ -146,3 +146,150 @@
 
 ## 2026-11-01 現行処理経路の追加確認
 - [現行コード経路の静的調査](audits/FORECAST_HORIZON_20261101.md)。コード・DB・本番環境は無変更。
+
+<!-- INVENTORY_FACTS_START -->
+## GitHub自動取得の事実（確認用）
+
+> この欄はPRメタデータの記録であり、開発完了・本番反映の認定ではありません。
+
+| PR | タイトル | 状態 | head SHA | 更新日時 |
+| --- | --- | --- | --- | --- |
+| #1 | Verify seven JMA PNG bands; withdraw unsupported yellow mapping | merged | `891318d7026f1c90209341a48c38ec8df0d879e8` | 2026-09-23T10:42:16Z |
+| #2 | feat: add PWA foundation for iPhone and Android | merged | `3618081f7307ad4690021a345e72411bb41c9cbc` | 2026-09-23T17:05:04Z |
+| #3 | fix: add PWA install icons | merged | `bb6c7ae27a4bf1cbb6e1e0d60f9c1630f9f6080f` | 2026-09-23T22:41:40Z |
+| #4 | fix: improve Japanese address search normalization | merged | `9f6b368065bd575bb4c9de753b40bad8cd1ae2d3` | 2026-09-23T23:13:48Z |
+| #5 | feat: support Japanese street address search | merged | `48f712e77622b5a4969fb8eb6ad8629e4e7b9a13` | 2026-09-23T23:36:16Z |
+| #6 | feat: allow deleting watch targets | merged | `a2c4c5970436745d8fef1ce2cefe64b2984e2d3a` | 2026-09-23T23:26:27Z |
+| #7 | fix: route Japanese numeric addresses to address normalizer | merged | `1896f541792a3bffa860d66cc02413e27b50346d` | 2026-09-23T23:43:07Z |
+| #8 | feat: add web push subscription flow | merged | `8b845d1d4cd51dec313abf5d27c21ac501a66a9c` | 2026-09-24T04:36:50Z |
+| #9 | feat: make watch ON/OFF state visually clear | merged | `1b5649b6d7a57d501b2d4f57f600f6ab45d69c27` | 2026-09-24T04:17:19Z |
+| #10 | chore: add authenticated push test button | merged | `9ea4e2e986a4864a25f8d713593ce685483b148b` | 2026-09-24T05:25:17Z |
+| #11 | fix: avoid false push test failure status | merged | `55c57d4d2a83d53ec341bc176a2638ad826abd10` | 2026-09-24T05:34:35Z |
+| #12 | test: cover actionable rain notification boundary | merged | `2f7c0aa1109a5a81cc404d8bb69c3a98ff3fd2de` | 2026-09-24T06:03:16Z |
+| #13 | test: cover watch-rain notification decision | merged | `9ef39b430206d362852116d7cab9c2daa9f8c897` | 2026-09-24T07:07:35Z |
+| #14 | chore: remove temporary push test UI | merged | `604eeeab1ef39e701a7c133613bb8ff10b7224b5` | 2026-09-24T07:11:00Z |
+| #15 | fix: resubscribe when VAPID key changes | merged | `9f182608fb0dfe8dc56129f8938bb745cb893ec2` | 2026-09-24T07:29:39Z |
+| #16 | chore: source-control production watch-rain | merged | `0aac1241eb6852512f6a03b788f4d85df14e9881` | 2026-09-24T11:13:14Z |
+| #17 | refactor: test production watch notification decision | merged | `d1146ef7a2a82685f519d7f69d60cebac325db9f` | 2026-09-24T11:20:04Z |
+| #18 | fix: clear place search after registration | merged | `e5408f5823004ab67f4d0a191d052d8131fe2a0a` | 2026-09-24T11:45:21Z |
+| #19 | docs: define living emergency and laundry alert direction | merged | `80d09c1bcd31ff5c5c3fb82daead0bd92220cde5` | 2026-09-24T13:58:46Z |
+| #20 | feat: add early rain forecast provider | merged | `03e4d17c5ed6660517b7c970ff0bceeb4ab42c31` | 2026-09-24T14:27:03Z |
+| #21 | feat: expose early rain forecast prototype API | closed | `6dca8cedc99d2e468cc1d1bbf86a03f1f82bb739` | 2026-09-24T15:51:44Z |
+| #22 | fix: clear place search UI after registration | merged | `0c6e8e182d78c9dda143ce4dfed807a0b0291aea` | 2026-09-24T15:44:45Z |
+| #23 | feat: expose early rain forecast prototype API | merged | `99df471a5c30908e4925def8a2463ff37af6dff2` | 2026-09-24T15:53:27Z |
+| #24 | test: cover early rain prototype API | merged | `0d9bea1c83478b525faddc73628e320bb430f1ae` | 2026-09-24T16:04:30Z |
+| #25 | test: verify live JMA early rain data in CI | open | `55174d5c0de802fa06ada23b6ce77aab8840bf6a` | 2026-09-24T23:49:53Z |
+| #26 | Use targetTimes member in JMA early forecast tile URL | merged | `3e21ed4d4dacb2cc4827a9560f407a81fee8e273` | 2026-09-24T23:09:13Z |
+| #27 | Restore push notification status after reopening app | merged | `c4559c3d7037081cf468f0a34ac6f1e3b7d87ab1` | 2026-09-25T13:42:40Z |
+| #28 | Refine persistent light-rain notification boundary | merged | `46b2540bcc07f94909554598857c04a77b7e5d4f` | 2026-09-25T18:52:50Z |
+| #29 | Prevent duplicate watch target registration | merged | `9e6fbd0bb0f4f7d2a09777029d4ae9df2c6d3126` | 2026-09-25T19:07:58Z |
+| #30 | Deduplicate place search results | merged | `c4182df79a20538e5671d4c6f5ee82172657cbec` | 2026-09-25T19:15:01Z |
+| #31 | Add rain interpretation diagnostics | merged | `b16284fe889f2d89b4db03922544cec661b041a0` | 2026-09-25T21:22:00Z |
+| #32 | Log withheld rain diagnostics | merged | `43e869da7fb4d1199fb1074d39b0648cc8a28115` | 2026-09-25T21:36:49Z |
+| #33 | Fix transparent JMA pixels blocking dry/ending states | merged | `abbc724ff4cf8f4a1ac91b9451e4a2c92390f241` | 2026-09-27T07:25:34Z |
+| #34 | Add forecast-frame rain diagnostics | merged | `b3aa42f4af3e71177c980c28d8fed6888449fe81` | 2026-09-27T08:26:27Z |
+| #35 | Fix dry forecast boundary at cron tick | merged | `cce27a99441eda5c4e365e6a43e1d73f5c29042a` | 2026-09-27T09:29:08Z |
+| #36 | Add today's latest delivered alerts | merged | `169687f70bba6751ebcb1275d0fc22025bca3fc4` | 2026-09-27T10:23:25Z |
+| #37 | Confirm observed rain facts after three checks | merged | `bdd80a9fcacf9a52e669637ba154ca3d2665a43e` | 2026-09-27T14:01:20Z |
+| #38 | Add severe rain forecast alert layer | merged | `0209250144e4823828a21e383d3e16f0779c3a8f` | 2026-09-27T14:17:23Z |
+| #39 | Make rain notifications context-aware | merged | `5546d14114b325dbf08f1a56bf704eb3563b95fa` | 2026-09-27T14:39:48Z |
+| #40 | Keep short rain gaps in the same episode | merged | `f313a57807625e7d52b8327b24c9b42affeb510b` | 2026-09-28T00:42:46Z |
+| #41 | Keep rain check prompt and button together | merged | `541fb0efee0c012d1278b79427a07c2f63fa607f` | 2026-09-28T00:46:45Z |
+| #42 | Refresh EmergencyAlert mobile design | merged | `8f089270f4b7129dc26191fcbda0e2c09b2ea924` | 2026-09-28T01:18:11Z |
+| #43 | Lighten rain-blue visual theme | merged | `e2f1953e5c79150a4194051c6bf075dac9aa4634` | 2026-09-28T01:25:27Z |
+| #44 | Lighten blue theme and move rain result above alerts | merged | `ec1a36d0e845a3325cdd3f214016e850f2217db3` | 2026-09-28T01:56:13Z |
+| #45 | Restore visual hierarchy on light blue theme | merged | `fd3e947e8cfbf2a9ae321fa609880fe280145b89` | 2026-09-28T02:37:41Z |
+| #46 | Brighten secondary text for clearer hierarchy | merged | `33dd975c25f1349cdddb9f74544ea0178208d08a` | 2026-09-28T02:46:49Z |
+| #47 | Recognize verified JMA 20–30 mm/h PNG color | merged | `d5b55236272f7e66991085807097d42e19fa86bd` | 2026-09-28T03:14:44Z |
+| #48 | Disambiguate duplicate notification labels with place names | merged | `52679eb38b4c2b7d66099fba4c1b96ae353cd873` | 2026-09-28T03:43:16Z |
+| #49 | Refresh latest alerts at Tokyo midnight | merged | `016ae329333a3a823e5ac978bbdf82a116b6ddf6` | 2026-09-28T03:55:06Z |
+| #50 | Keep confirmed rain internal instead of pushing it | merged | `5bc1fef04789de21dbc72845497cb72131baeabd` | 2026-09-28T04:02:51Z |
+| #51 | Update project overview from code, DB, and production state | merged | `fb9cb07f113cbf261f18668a3c6378e38f7782ba` | 2026-09-28T04:22:33Z |
+| #52 | Track rain confirmation independently of push delivery | merged | `e6ca196570dff62d67060e9b543cd550ebe13b03` | 2026-09-28T04:29:39Z |
+| #53 | Restore rain-ending notification decision | merged | `aaddee5d3f3c1c4584c5914bfea95669b5ad17d5` | 2026-09-28T04:51:06Z |
+| #54 | Add coordinate-based map location registration | merged | `d89eae23df95c39b04e71c6d88ef7746f6661d0d` | 2026-09-28T05:15:26Z |
+| #55 | Show map preview for coordinate picker | merged | `49982078e21a9b630b4a7c60fffe4370f3df48de` | 2026-09-28T05:52:20Z |
+| #56 | Overlay current JMA rain radar on map picker | merged | `3f128221d0721ebf2af3d3823506135dfe6839f0` | 2026-09-28T07:41:12Z |
+| #57 | Suppress duplicate rain-ending alerts after transient rain | merged | `a1717e0f68ca8b926ae725195d7cb65643d9256d` | 2026-09-28T09:02:02Z |
+| #58 | Reduce repeated rain-ending notifications | merged | `b79e743ed449d8c42d6ada42b04c9e551c6c7ba6` | 2026-09-28T22:11:24Z |
+| #59 | Add nationwide heavy-rain scan proof | open | `0f5ec30e20bf53f470cdff621f31436a6d52a992` | 2026-10-16T00:48:24Z |
+| #60 | docs: 美咲との気象・防災連携契約案（未実装） | open | `6d86d7a83ef17911abb5ebd57e190c690d08709d` | 2026-10-16T00:12:21Z |
+| #61 | feat: LIVE JAPAN 生きている日本列島の体験試作 | open | `19fc21c247b934490dbc6f7c104dfc2cea233eb4` | 2026-10-16T06:51:44Z |
+| #62 | test: measure real JMA Z4 stride-2 missed rain regions (read-only) | open | `e746d022179a99daa2d16b2d31542aaa41f95698` | 2026-10-16T21:13:32Z |
+| #63 | WIP: MYアメふる通知履歴・実天気フィードバック・判定根拠（検証用） | open | `784173985f676dc7f06d7a81275750e0ad07464e` | 2026-10-21T06:54:15Z |
+| #65 | Draft: MYアメふる通知フィードバック第1段階（既存Push変更なし） | merged | `3d214ffe6efde4b4a3a29baab93875acddedaf3f` | 2026-10-21T11:29:56Z |
+| #66 | fix: iPhone通知履歴を最新2件だけ表示し、古い通知は展開式に | merged | `52e10294c2f10f14368ba31545c0362ad4f85c35` | 2026-10-21T11:37:41Z |
+| #68 | feat: 通知履歴をタップで開く短いカードに改善 | merged | `0fb67d23199810a3b1634c964118d88a82b456ce` | 2026-10-21T22:54:25Z |
+| #69 | feat: feedback observation summary | merged | `82afd04f7bfa636f7a1a3d70e37d5567d917d712` | 2026-10-22T00:02:00Z |
+| #71 | feat: optional eyewitness observation time for rain notification feedback | merged | `d7efe03e23f4b8bbb0e95f1de701a08f8fb38223` | 2026-10-22T05:39:34Z |
+| #72 | feat: reversible notification history screen reset without deleting DB rows | merged | `cec25ea8a0b7a596f91722b5b7b5c93d7630b15e` | 2026-10-22T08:25:49Z |
+| #73 | fix: retained notification history stays viewable beyond seven days | open | `fb1d1a3f9f0cee3985fffa1831dc52b187c182b3` | 2026-10-22T23:31:22Z |
+| #74 | fix: empty notification history guidance after archive | merged | `f95768b0ce31cfaa3d4c1da1d5a20b0a4d937507` | 2026-10-22T23:33:20Z |
+| #75 | docs: アメふる全経緯・現状・次チャット向け総覧引継ぎ（2026-10-23） | merged | `cbd475b426a0cab75c325b29fa928048c374cb97` | 2026-10-22T23:51:33Z |
+| #76 | [Research/Draft] Diagnose iPhone PWA feedback disappearance on resume | merged | `b641fb38a6341b56fa72af5abafb41634a04a1fb` | 2026-10-23T17:00:21Z |
+| #77 | feat: enable PWA diagnostics from in-app toggle | merged | `c4521382847b9df0effcced360d3748dea7de533` | 2026-10-23T17:29:06Z |
+| #78 | feat: read-only check of PWA push registration ownership | merged | `14294fbf960c5dd0bc38e81c96904faa194ab38f` | 2026-10-23T18:01:37Z |
+| #79 | feat: safe opt-in repair of existing push subscription ownership | merged | `017d3f893e29c8fa0f3655716f9ef33d8fa32b77` | 2026-10-23T18:08:38Z |
+| #80 | fix: stabilize anonymous auth client across PWA resume | merged | `cc49a7c789f2bb32642ce77e198df2b1b9d35cc2` | 2026-10-23T18:37:22Z |
+| #81 | diagnostics: show presence of PWA auth storage key safely | merged | `61d9a8303b0004c77b13327ca1c759e20b5bf9ae` | 2026-10-23T18:49:47Z |
+| #82 | diagnostics: distinguish missing Supabase key from storage-key mismatch | merged | `dc4aad7fb2332816d5c90c58b9cd4eaac77bc161` | 2026-10-23T18:54:37Z |
+| #83 | diagnostics: compare Safari authenticated ID prefix without exposing tokens | merged | `1d2775ab26e9491b75488fa9589ced55c3b2af52` | 2026-10-23T19:13:43Z |
+| #84 | docs: preserve PWA auth-loss code audit and investigation boundaries | merged | `730af73ecd9e8d15a03d39a54d0cdb5194671e12` | 2026-10-23T19:41:39Z |
+| #85 | feat: opt-in local auth storage transition journal for iPhone PWA | merged | `1374fdb3c6f9fdce9778ca8bd3a271ddea57de31` | 2026-10-23T19:45:00Z |
+| #86 | Add read-only storage key diagnostics | merged | `019cbbf62bb167f667e1cd5ac43903508864180f` | 2026-10-23T21:08:06Z |
+| #87 | Persist opt-in auth key journal across PWA restarts | merged | `6beef3d20e7153ea212848fa57b75d6257cc4c07` | 2026-10-23T21:18:59Z |
+| #88 | docs: 通常雨通知の見直し仕様と検証条件 | open | `7b4eddab9380af6b855fbfd654a6ae510517e779` | 2026-10-26T01:38:15Z |
+| #89 | fix: 通常雨通知の重複抑制と5〜10mm連続予測判定 | merged | `0b057730aaf055b3a25f467e60f3d413b7f1290f` | 2026-10-26T01:45:26Z |
+| #90 | docs: 通知過多対策の本番反映結果と残課題を総覧に追記 | merged | `e014009d9a669ef57c4c76185d27d490e10260c4` | 2026-10-26T01:49:09Z |
+| #91 | feat: 30mm/h大雨通知を単一閾値に統一・通知アイコン導入 | merged | `926022d4d8fb849c6dd0e9c909499d87195831f9` | 2026-10-26T04:30:52Z |
+| #92 | docs: アメふる精度最優先の開発順序を総覧へ登録 | merged | `210d708d31fe940afbccf0f82cf55ad02057daf0` | 2026-10-26T04:52:00Z |
+| #93 | WIP: 通知重複防止・配信整合性の第1優先監査 | open | `a0a4cc891065a52333c7aaca8b93193d8cb7c2d9` | 2026-10-27T19:02:36Z |
+| #94 | docs: 降るよ最優先の製品方針と研究所在を総覧へ | open | `9657b86fc02a76946dd2f5e2db1a3c8cdf658d77` | 2026-10-27T19:03:12Z |
+| #95 | 設計: 前回通知を踏まえた雨接近メッセージ | open | `1e39976d58c78f287020956c800b356774209752` | 2026-10-27T19:08:37Z |
+| #96 | 外部AIレビュー用の安全な静的ページ（プレビュー専用） | open | `f9fe24bf2f74c82096017b809c02e2d925b5db3f` | 2026-10-28T13:04:49Z |
+| #97 | Preview only: 外部AIレビュー用の公開総覧 | open | `713eca9ebee4587f8653ac8a80a8ef99e07210cd` | 2026-10-28T13:14:12Z |
+| #98 | 研究: 通知予測と実況の自動答え合わせ基盤 設計 | open | `79b4bae479f9b39f48d9fbf0d1745944a3442804` | 2026-10-28T16:57:35Z |
+| #99 | 通知予測の本番記録とレーダー実況の自動照合を追加 | merged | `626c66338dbb81f8ea1b4ccc1bb7487b89a31cf8` | 2026-10-29T02:29:53Z |
+| #100 | 通知地点の半径1km予測・実況画像を独立保存 | merged | `4b0cd60ba63b77bd7241520d2024cda7e1f15792` | 2026-10-29T02:51:11Z |
+| #101 | 点・面・併用の雨判定をシャドー比較 | merged | `87320a16e3f9f04884a3cc2591ab47b43a3c230b` | 2026-10-29T03:28:30Z |
+| #102 | 開発者専用の雨判定比較ラボを追加 | merged | `128791dc03bb3e3d8bd7f4698fc275a1017e7a14` | 2026-10-29T04:06:58Z |
+| #103 | 実通知538・539の監査と、不一致パターン・具体的理由の表示 | merged | `c23715472dfe8733adddbdcac91d6aa9d7d0b58a` | 2026-10-29T07:34:10Z |
+| #104 | 雨なし現況で継続中の接近予測を再通知しない・購読別の送信権を永続化 | merged | `03ba9cc8d5209ea281b7d5409d91d6dd79606a9d` | 2026-10-29T08:07:51Z |
+| #105 | 予測通知の初期移行で直前の解消確認を正しく引き継ぐ | merged | `326f6d92485e0e158afcd62db5b37131e11dfc51` | 2026-10-29T08:23:10Z |
+| #107 | chore: 読み取り専用の開発忘れ物検出（両プロジェクト共通方式） | merged | `bd03ccc3b96855cfbba2b74409668ce206964f5c` | 2026-10-31T20:12:51Z |
+| #108 | 大雨通知をエピソード1回に制限し、30mm/h自動評価を追加 | merged | `9970fad666c6d863c8a9cf17044e141b85bb2596` | 2026-10-31T10:01:58Z |
+| #109 | 研究用: 大雨予測の継続性判定（通知ロジック非接続） | open | `0730bfbbee5c5d8a86410bb13f6e44b5afa3f0ae` | 2026-11-02T15:55:05Z |
+| #110 | docs: 2026-11-01棚卸し・調査結果を台帳へ保存 | merged | `b2ddc796abf2834b549f2c1056d204747e818535` | 2026-10-31T21:24:23Z |
+| #111 | docs: 旧監査ブランチの追加調査を台帳へ記録 | merged | `5b1d48d44666ccee5e845bb5cf0689379c42bd8d` | 2026-10-31T21:28:05Z |
+| #112 | docs: 未整理ブランチの保全・照合・整理候補を分類 | merged | `aee1b209c7f9dcc1e5803ec912ac72960d8fa237` | 2026-10-31T21:31:02Z |
+| #113 | docs: 旧ブランチとmainの機能単位照合を記録 | merged | `566a02c5d5232ab4d47d310e8866de71c142074d` | 2026-10-31T21:40:21Z |
+| #114 | docs: 旧実験コードのmain照合記録 | merged | `35727866365a69ce55aaa26313accdf019691ad8` | 2026-10-31T23:06:44Z |
+| #115 | docs: 旧テスト・計測コードのmain照合を記録 | merged | `56cccb600dff30c43bc362140c28b31e5272c047` | 2026-10-31T23:11:15Z |
+| #116 | docs: 開発台帳に旧テスト照合記録を追加 | merged | `8854cb0c96d77d6c1d7a26378ad7be24c22bf585` | 2026-10-31T23:13:55Z |
+| #117 | docs: 現行処理経路と旧実験の追加照合 | merged | `aebac8a57a5dd0202ff4e5780d397d91c090cee3` | 2026-10-31T23:33:38Z |
+| #118 | Run read-only development inventory daily at 10:17 JST | merged | `fed609ad6778c8214a7a7bdd43fb84cce4e73298` | 2026-10-31T23:45:29Z |
+| #119 | Correct main overview inventory status and daily schedule | merged | `a0fa21fa71c7ef2ae19dbc201a121445470afebc` | 2026-10-31T23:49:08Z |
+| #120 | Add concise development operations index linked from ledger | merged | `3eb68f2de6e08348f4896548b9ead204f4a02a74` | 2026-10-31T23:57:47Z |
+| #121 | Document inventory delta review and ledger update procedure | merged | `f692324806ded5ce7945f3630be70e083df08b88` | 2026-11-01T00:01:32Z |
+| #122 | Generate daily read-only inventory delta and ledger update candidates | merged | `d1e2f50c677432a42852e0c03ccd05d4f3353f31` | 2026-11-01T00:04:39Z |
+| #123 | Allow read-only access to previous inventory Actions artifacts | merged | `ba96859f6486975e40e4ee9eb67e48b5210e5280` | 2026-11-01T04:57:32Z |
+| #124 | Preserve daily inventory when prior artifact returns HTTP 401 | merged | `d1a53b526f16c838c6a72ee24ffa7d8b3c495459` | 2026-11-01T05:01:47Z |
+| #125 | Diagnose HTTP 401 during inventory artifact comparison | merged | `112eb50002512097281e59fca830caf1b7ec651b` | 2026-11-01T05:18:58Z |
+| #126 | Inventory phase 2: read-only triage and ledger review proposals | merged | `ae828fb24b911bfa22e84fc057b0cb6b17902020` | 2026-11-01T05:35:43Z |
+| #127 | Fix malformed JSON and markdown in inventory triage artifacts | merged | `0cb3954f8558cab23ab0dcf2d9c29c77dcd46acc` | 2026-11-01T09:46:15Z |
+| #128 | Inventory phase 3: use PR metadata for review-only case hints | merged | `44d3fc79beb82518fb70917603214aa51aa39323` | 2026-11-01T12:59:25Z |
+| #129 | Inventory phase 3: bounded PR file evidence and maintenance triage | merged | `93caab4a85c511a9793d5720beb8164c92e5fe68` | 2026-11-01T13:07:40Z |
+| #130 | Phase 4: establish safe ledger automation boundaries | merged | `55f2f23cb622f4f23d9239b6297bda54b8aa5948` | 2026-11-01T14:51:31Z |
+| #131 | Phase 4: scheduled review-only ledger update PRs | merged | `aa4937ca3b0dbf48aa7aff13642113b11fffa386` | 2026-11-01T14:54:28Z |
+| #132 | Fix ledger facts table columns before first scheduled run | merged | `072ddf684b21c2a9e4f10fc0aefd93a75f7c70b3` | 2026-11-01T14:57:31Z |
+| #133 | Event-driven factual ledger proposals on PR changes and main updates | merged | `6d1d873258c7d8a964b6f6aada2aac2c5fbfe26e` | 2026-11-01T15:12:22Z |
+| #134 | Add fail-closed checks before ledger automation writes | merged | `ca36d09279b46518c1b4f97868927e4b4b2dad2f` | 2026-11-01T22:46:24Z |
+| #135 | Add diagnostic artifact and explicit permission error for ledger automation | merged | `55403d4a586f4da5af06eab9732551d171f1550b` | 2026-11-01T23:22:08Z |
+| #136 | Fix inventory CI AttributeError when branch SHA is a string | merged | `19177b8c39ffc8d007b066e175be0d71afd6e760` | 2026-11-02T01:57:31Z |
+| #137 | Add fail-close
```

