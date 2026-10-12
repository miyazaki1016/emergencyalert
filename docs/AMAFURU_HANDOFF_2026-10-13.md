# アメふる 最新引き継ぎ — 2026-10-13

> この文書を、2026-10-13時点の作業開始点として使用する。PR #59 の最新ソースとCI実物を確認した。
> **PRはOPEN・未merge。Production migration / Storage書込 / scheduler / Push・watch接続 / deployは未承認・未実施。**

## 正本・コード位置

- Repository: `miyazaki1016/emergencyalert`
- Branch: `feat/national-heavy-rain-preview`
- PR: [#59 — Add nationwide heavy-rain scan proof](https://github.com/miyazaki1016/emergencyalert/pull/59)
- 総覧: `docs/PROJECT_OVERVIEW.md`
- Readiness: `docs/NATIONAL_RAIN_READINESS_PROOF.md`
- Production readiness: **NO**

## 2026-10-13 に確認した最新CI

CI run **38191403174 / #782**（commit `b8598105b1a5d03828355844efa838db15b35c89`）を再照会。Job `verify` は **completed / success**。npm test、z4全国フレーム走査、z4→z8子孫検証、候補zoom可用性、空タイルの調査、実JMA 404再現、10分遅延再取得、予算・throughput、bounded worker、N03分割・readback、HTTP感度、cache、scheduler replay、queue lease fencing、npm buildがすべて成功ステップとして記録されている。

関連する同コミットのワークフローも成功:
- JMA z4 to z10 screening proof #274 / run 38191403150
- National rain proof #486 / run 38191403068
- N03 national prefecture index proof #406 / run 38191403123
- All47 ownership proof #280 / run 38191403134
- N03 all47 real conversion proof #98 / run 38191403168

この成功は、定義されたCI・証明スクリプトが成功したという意味であり、Production acceptanceを意味しない。

## 404と候補スキャンの扱い

- 全国z8の無差別全走査へ戻さず、z4で候補を絞ってから候補に対応する高zoomタイルを取得する。
- z4の低い値だけで、下位zoomに強雨が絶対にないと断定しない。低zoomスクリーニングの再現率は測定条件・データ範囲付きで報告する。
- 404は「雨なし」に変換しない。取得不能・不明として区別する。
- 実JMA URLと座標を保存し、10分後の再取得も別証拠として扱う。再試行だけで恒久的な欠落原因を確定しない。
- 予算・throughput・workerの証明は実行環境・入力・負荷条件付き。Production runtimeのdeadline/memory/Storage IOが証明済みとは扱わない。

## N03 全国47都道府県の分割実験

CI成果物で確認済み:
- 47都道府県 / 47 manifests / 351 chunks
- SHA/readback検証済みバイト数: 472,804,611
- 1.5 MiB目標で実験用パッケージ化成功
- 巨大Polygonを含む19自治体について、canonical JS判定との直接比較446ケースで不一致0
- chunk resolverを通した比較97ケースで不一致0

制約: これらは限定したサンプル・ローカル/メモリ内chunkの実験であり、全雨域・全境界の数学的同値性、Production Supabase Storage HTTP、Production worker性能の保証ではない。実験採用ステータスは **EXPERIMENT_ONLY_NOT_ADOPTED** のまま。

## 依存パッケージ監査 — CI #782 artifact実読結果

artifact `npm-dependency-audit-report` を取得し、JSONを展開して内容を確認した。集計は **Critical 2 / High 1 / Moderate 2 / Total 5**。

検出された主な依存:
- `vitest` — Critical（直接依存、現行指定は3系、監査時に修正候補としてvitest 5.0.3が提示。メジャー更新）
- `tinypool` — Critical（間接依存）
- `postcss` — High（間接依存、複数advisory）
- `next` — Moderate（直接依存として報告。修正候補next 16.4.0はメジャー更新）
- `@vitest/mocker` — Moderate（間接依存）

監査の `fixAvailable` はメジャーバージョン更新を含むため、無条件の自動適用を意味しない。**`npm audit fix --force` は実行しない。** 直接/間接依存の解決ツリーを確定し、再現可能なlockfileを導入し、互換性を段階的に検証する必要がある。現在のソースで追跡対象 `package-lock.json` と `vercel.json` が存在しないことも未解決。実際のVercel runtime設定はソースから推測しない。

## Queue lease fencing / Production gate

Readiness文書の2026-10-12追記とproof branchのソース契約によると、claim時にUUID lease tokenを更新し、complete/finish/deferで現在のtokenを検証する構成がある。隔離されたPostgreSQL CI proofでは、AからBへ再claimした後のAの古い操作を拒否するケースを検証している。

ただしこれはproof branch上の契約・隔離CI検証であり、Production migration適用や実環境DBの同時実行・遅延・失敗復旧の証明ではない。canonical schemaを直接再設計せず、Production migrationを適用せず、アラート接続を行わない。

## 次の作業順

1. このCI成功結果とaudit artifactの実内容を総覧へ反映する。
2. JMA z4→z10の実測結果・404証拠・候補再現率・処理予算を条件付きで再確認し、測定値と設計上の仮説を分離する。
3. lockfileと依存更新計画を、メジャー更新を避けた安全な選択肢も含めて設計する。変更後はtest/build/auditを再実行する。
4. N03実験は引き続き採用ゲート外。本番データへの反映前に、Storage HTTP、worker同時実行、runtime deadline/memory、実雨域境界の一致を別途検証する。
5. PR #59のmerge、Production migration、Storage書込、scheduler、Push/watch接続、deployは明示的な承認まで行わない。

## 完了扱いにしない項目

- 全国のすべての強雨をz4で漏れなく拾えるという保証
- 404原因の全面解明
- Production環境での実Storage IO・runtime負荷・全国backlog drain
- N03実験分割の本番採用
- 依存脆弱性の修正とlockfile導入
- Production readiness / merge / deploy


## 2026-10-13 追補 — CI #784 の依存監査artifact実読

CI run `38310431611`（commit `c0ba2f55485e8551c9982824b9caf75b8fb5ad06`）が生成した `npm-dependency-audit-report` artifact ID `11774227824` を実際にダウンロードし、`npm-audit-report.json` を解析した。これは監査artifact生成時点の結果であり、CI本体はまだ実行中。

- 集計: Critical 2 / High 1 / Moderate 2 / Total 5。依存ツリー176件（prod 31 / dev 107 / optional 92）。
- `vitest`: Critical、直接依存。現行range `^3.2.0`、報告range `0.0.95 - 4.1.10`。監査が提示する修正候補は `vitest@5.0.4` で、major update。
- `tinypool`: Critical、間接依存。修正候補はVitest 5系への更新経由。
- `postcss`: High、間接依存、複数advisory。報告された影響rangeは `<=8.5.22`。auditの修正候補は `next@16.4.0` 経由で、major update。
- `next`: Moderate、直接依存、現行range `^15.5.0`。audit候補 `next@16.4.0` はmajor update。
- `@vitest/mocker`: Moderate、間接依存。修正候補はVitest 5系への更新経由。

前の本文に記載したVitest候補 `5.0.3` は古い監査結果。**このartifact時点の候補は `5.0.4`** として扱う。いずれも候補であり、互換性検証済みの修正ではない。npm公式説明でも `npm audit fix --force` は依存範囲外やmajor更新を許可するため、実行しない。urlnpm audit documentationhttps://docs.npmjs.com/cli/npm-audit/

### 次の依存作業
1. 現行main/featureのCI実行結果を確定し、監査artifactの結果とbuild/testを別々に記録する。
2. package manager / Node version / deploy環境を確定し、`package-lock.json` を正規のnpm installで生成・追跡して、CIを `npm ci` に移行する案を検証する。
3. lockfile導入後の固定ツリーでauditを再実行し、Next 15系の範囲内で解消できるPostCSS修正と、Vitestのmajor更新を分離して検討する。無関係なメジャー更新をまとめて実施しない。
4. 変更ごとにtest/build/auditとPR CIを確認。Production設定変更、merge、deployは引き続き行わない。
