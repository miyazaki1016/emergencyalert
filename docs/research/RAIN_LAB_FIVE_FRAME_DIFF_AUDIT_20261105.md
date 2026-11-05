# 雨の判定ラボ：点・面・併用の差分調査（2026-11-05）

## 実機で確認された集計（過去7日、全地点、降るよ・止むよ、面閾値40%）
- 表示対象48通知、比較45ケース、共通173コマ、実況確認情報なし232コマ。
- 点：一致105、予測雨／実況雨なし38、予測雨なし／実況雨30。
- 面500m：一致110、予測雨／実況雨なし38、予測雨なし／実況雨25。
- 併用：一致110、予測雨／実況雨なし38、予測雨なし／実況雨25。
- 173コマは独立した173事例ではなく、レーダー実況との一致であり地上の雨の正解率ではない。

## コードから確定できること
- `lib/research/rainLab.ts` の `summarize` は3方式すべてが判定できた同一コマだけを `paired` として数える。
- `falseRain` は候補がRAIN、レーダー実況がNO_RAINの場合。 `falseDry` は候補がNO_RAIN、実況がRAINの場合。
- 面と併用の集計値が同一でも、全173コマの判定が同一とは限らない。相殺する違いがあり得る。
- 点と面の一致数の差は純増5コマであって、相違するコマが「ちょうど5コマ」とは限らない。

## 未検証と次の手順（本番に影響させない）
1. 同じ比較グループ・validTimeごとに、点／面／併用の予測状態、実況状態、除外理由を突き合わせ、相違コマを列挙する。通知ID・地点などの個人情報を公開資料に書かない。
2. 面と併用で集計が同じ理由を、各コマ一致か相殺かに分ける。
3. `truthMissing=232` の実況欠測と、`exclusions` の予測画像欠測・粗い解像度・保留を混同せず別集計する。
4. 期間・地点・閾値を固定し、比較結果の変動を再検証する。
5. 地上観測や無通知サンプルがないため、本番の通知閾値・Push・DBは変更しない。

## 状態
GitHub上のロジック確認とユーザー提供iPhone画面からの整理。実データの173コマ明細取得・差分特定は未実施。Vercelビルド不要の資料作業。

## 2026-11-05 コード照合で確認した集計仕様

- `summarize` は `group.point.scores` を走査し、同じ `validTime` の面・併用の状態を照合する。3方式がすべて判定可能なコマだけを分母にする。レーダー実況の状態は `p.actual` を用いる。
- `matched + falseRain + falseDry = paired` が各方式で成立する。画面の 173/105/38 から点の `falseDry=30`、173/110/38 から面・併用の `falseDry=25` と計算できる。
- 面の `falseDry` が5コマ少ないのは集計上の事実だが、相違するコマの総数や位置は未確定。面・併用の総数一致から各コマの判定一致は推論できない。
- `truthMissing` は、レーダー基準の場合 `p.actual === INDETERMINATE` のコマ数。画像未保存や面候補保留の総数ではない。`exclusions` は同一コマの理由を複数回数えるため合計をコマ数として扱わない。
- 実データの各コマ詳細を確認するまでは、面の採用や閾値変更を提案しない。

## 2026-11-05 本番DBの読み取り専用照合（個人情報を含まない集計）

- EmergencyAlertの `rain_notification_evaluations` と `rain_area_shadow_results` を、直近7日・閾値40%・3方式が判定可能な同一時刻で読み取り専用集計。実行時点で **170コマ・44ケース**（iPhone画面の173コマ・45ケースとは時点／対象集合が一致しないため、完全な再現とは扱わない）。
- 点一致105、面一致110、併用一致110。点と面の状態が異なるのは **5コマ**、その5コマはすべて **点が不一致・面が一致**。逆方向（点一致・面不一致）は **0コマ**。
- 面と併用の状態が異なるコマは **0コマ**（この170コマの範囲内）。同じ集計値の相殺ではなく、各コマの判定も一致した。
- 個別地点・通知ID・利用者IDは資料に保存しない。残る課題は、5コマの雨雲形状・予測時刻・画像品質を内部で検証することと、173コマとの3コマ差の時点／対象条件を確認すること。
- 本番DBはSELECTのみ。データ変更・通知変更・Vercelビルドなし。

## 2026-11-05 本番DB読み取り照合（途中結果・個人情報を含めない集計）

- EmergencyAlert Supabaseの `rain_notification_evaluations` と `rain_area_shadow_results` を読み取り専用SQLで照合。研究管理者が有効な所有者の過去7日・最新100通知、閾値40%を対象とした。
- SQLで再現した共通コマは **170**、点一致 **105**、面一致 **110**、併用一致 **110**。点と面の予測状態が異なるのは **5コマ**、面と併用の予測状態が異なるのは **0コマ**（この170コマに限る）。
- iPhone画面の **173コマ** とSQLの **170コマ** に3コマ差がある。SQLの時刻解釈・最新100件の対象・画面更新時刻・所有者条件などが完全一致しているとは未確認。したがって「全173コマで差分5、面と併用は完全一致」とはまだ断定しない。
- SQL集計で個別の通知ID、地点名、座標、所有者IDは出力していない。DBへの書き込み、通知条件・Push・Vercelの変更なし。

## 2026-11-05 18:05 JSTの期限境界：3コマの内訳（読み取り専用確認）

- `created_at=2026-10-29 09:05:14 UTC`（日本時間18:05:14）の通知に、閾値40%で3方式・レーダー実況すべて判定可能な**3コマ**が存在することを確認。
- 予測対象時刻はUTC 09:20、09:25、09:30。3コマとも実況 `NO_RAIN` に対して、点・面・併用の予測はすべて `RAIN`。したがって、3コマは全方式の **falseRain +3** に該当し、**一致数には影響しない**。
- 画面の173コマと後のDB集計170コマで、一致数が点105・面110・併用110のまま変わらないことと整合する。画面側のfalseRain38に対し、境界後の推定falseRainは35。ただし境界後のfalseRain全体の再集計は未実施。
- 過去7日間の境界は2026-11-05 18:05:14 JST頃にこの通知を除外する。iPhoneの表示取得時刻を直接検証できないため、**3コマ差の最有力説明であり最終確定ではない**。
- 本番DBはSELECTのみ。通知・閾値・Vercelへの変更なし。

## 5コマの原因追跡：検証プロトコル（2026-11-05）

- 対象は過去の読み取り専用集計で確認した「点NO_RAIN・面RAIN・実況RAIN」の5コマ。対象時刻・閾値40%・同じ評価IDの比較を固定し、期間移動による脱落と混同しない。
- `rain_area_shadow_results.features[].metrics.circles` の500m圏 `rainFraction`、`usableCoverage`、`missingFraction`、`unknownFraction`、`rainComponentCount`、`centerDryHoleM2` を比較する。雨雲の中心ずれは画像・座標から別途検証し、これらの数値だけで距離を断定しない。
- 同一5コマの20%・40%・60%を横断し、各閾値の判定・保留・レーダー実況との一致を比較する。比較母数が変わるため、率の単純比較を避ける。
- 予測画像の `capturedAt`、`matchesInputPixel`、`imageErrors`、各候補の `reason` を確認し、当時の入力中心と後日回収画像の同一性は推測しない。
- 反例として点RAIN・面NO_RAIN、面の誤報増加、保留増加も同じ期間・地点で検証。レーダー実況は地上の正解ではなく代理指標であり、未通知の見逃しは測定対象外。
- 5コマの具体的な画像形状・数値は未取得。これを取得するまでは『中心からずれた雨雲が原因』と断定しない。本番判定変更は行わない。

## 実測：改善5コマと閾値横断比較（2026-11-05 読取専用）

- 過去7日間のshadow比較から、点NO_RAIN・実況RAIN・面40%RAINは**5コマ**。予測対象時刻（JST）は 10/29 22:30, 22:35, 22:40、10/30 14:35、10/31 21:20。
- 各時刻のFORECAST特徴量（500m雨面積割合 / 最寄り雨画素中心までの距離m / usableCoverage）：80.9%/92.5m/1、25.0%/128.4m/1、20.4%/236.6m/1、45.4%/92.7m/1、63.3%/102.2m/1。OBSERVATION特徴量は別物であり、FORECASTと混ぜない。
- この5コマの面判定：閾値20%=5/5 RAIN、40%=5/5 RAIN、60%=2/5 RAIN・3/5 NO_RAIN。
- 同じ7日間の実況がRAIN/NO_RAINと確定している**288コマ**で、面判定の閾値別集計（正解/空振り/見逃し/判定保留）：20%=113/35/22/118、40%=110/35/25/118、60%=105/33/29/121。20%・40%は判定確定170コマ、60%は167コマ。正解率の母数が変わる点に注意。
- **20%は40%より正解+3・見逃し-3・空振り±0・保留±0**。60%は40%より正解-5・見逃し+4・空振り-2・保留+3。対象期間・対象サンプル限定であり、20%を本番推奨する根拠としては不足。
- 予測画像の雨面積割合が40%未満のコマでも面40%がRAINなので、閾値の意味と計算過程をコードで検証する必要がある。最寄り雨画素距離は画像上の幾何的指標であり、降雨が実際に中心から離れていたと断定しない。
- 本番DBはSELECTのみ。通知・閾値・Vercelへの変更なし。

## 集計定義のコード監査と比較上の注意（2026-11-05）

- `lib/research/rainLab.ts` の `summarize` は、実況が確定していても、点・面・併用のいずれかが `INDETERMINATE` なら `paired` に含めず、3方式すべての一致・空振り・見逃しの集計から除外する。保留は方式別に別途計上する。
- 直前の閾値横断集計（実況確定288コマ、20%=113/35/22/118、40%=110/35/25/118、60%=105/33/29/121）は**面方式単独**の集計であり、画面の「3方式共通母数」170コマとは定義が異なる。閾値別の優劣を画面の正解数と混同しない。
- `loadLab` は管理者本人の `accepted_count>0`、直近指定日数、作成日時降順最大100件で対象を絞る。期間境界の移動や100件上限に注意。
- `source='radar'` は `point.scores[].actual` を実況代理指標に採用し、現地実測ではない。未通知事象の見逃しを含まない。
- 予測画像の `rainFraction` と比較閾値の関係はこのUI集計コードからは確定できない。実際の面判定生成コードの監査が別途必要。
- 日別集計のDBクエリは安全性チェックにより実行できず、**日別安定性は未検証**。代替データが得られるまで「20%が安定して最良」とは判断しない。
- 本番コード・DB・Vercelは無変更。調査用ドキュメントのみ更新。

## UIの閾値仕様確認（2026-11-05）

- `app/dev/rain-lab/RainLab.tsx` の画面ラベルは「**面の開始閾値（未校正）**」であり、20/40/60%は開始判定に関する選択肢。**解除閾値は開始閾値の半分**と画面に明記されている。
- したがって「40%判定がRAINなのに、その予測画像の500m雨面積割合が20.4%」という事象は、開始閾値40%と解除閾値20%を混同すると説明を誤る。状態遷移・時系列を含む生成ロジックを確認するまで異常とも正常とも断定しない。
- UIは期間7/30/90日を選べるが、直近最大100通知という取得上限があり、90日を選べば無条件に十分な検証データになるわけではない。
- 20%への切替は研究UIの未校正シミュレーションであり、本番採用は保留。コード・設定・DBは変更しない。

## 5コマの開始／継続判定：画面実装の制約（2026-11-05）

- `lib/research/rainLab.ts` の `Series` 型には `transitions.rainStartsAt/rainEndsAt` が定義されているが、**値が保存済みであることの証明ではない**。
- `app/dev/rain-lab/RainLab.tsx` の `CaseCard` は、選択時刻の `variant.area.series[].state/reason` を表示する一方、`variant.area.transitions` を直接表示していない。現行画面を見ただけでは開始／継続の判別ができない。
- `lib/research/rainMismatch.ts` の開始／終了時刻の説明は、**レーダー実況の前後5分コマからの遷移**であり、面予測のヒステリシス状態遷移とは別物。混同禁止。
- 5コマが面RAINとなった理由の確定には、同一評価・同一baseTimeの面予測時系列の**直前状態とreason**、可能なら面の`transitions`実値および判定生成実装が必要。実データの読み取りは現在安全性チェックで不可。
- よって「面判定は雨を継続したから40%未満でもRAIN」との説明は**仮説のまま**。研究資料・本番とも確定事実として扱わない。

## 面判定生成コードの確定監査（2026-11-05）

- 実装の所在は `supabase/functions/_shared/areaShadow.ts`。これまで未確認だった `classifyCandidate` と `compareShadow` を直接確認した。
- 面方式（500m）の判定は **rainFraction >= 開始閾値なら RAIN、rainFraction <= 解除閾値（開始の半分）なら NO_RAIN、その中間なら直前状態を引き継ぐ**。これは実装上の確定事実。250m/500m両方の分類可能率が95%以上などの前提が必要。
- 40%設定で5コマの予測500m rainFractionがそれぞれ80.9%、25.0%、20.4%、45.4%、63.3%。**25.0%と20.4%の2コマは20%超40%未満の中間域なので、面RAINである以上、直前状態RAINを引き継いだことがコード上確定**（同じ比較グループで連続5分刻み・有効画像という前提）。80.9%、45.4%、63.3%の3コマは40%以上なので、直前状態によらずRAIN。
- `compareShadow` は比較グループごとに `previous=INDETERMINATE` から始め、5分刻みが途切れると状態をリセット。画像欠測・当時入力中心不一致・予測時刻後回収・30分超の粗い予測などでは保留になり、保留も次コマへ引き継がれる。
- `transitions.rainStartsAt` は単なる1コマのRAINではなく、**直前5分がNO_RAIN、以降5分刻み3コマ連続RAIN**の条件で記録される。したがって「40%以上で新規RAINと判定される」ことと「開始遷移が記録される」ことは同義ではない。
- 2コマが継続判定だったことは生成コードと既存の集計数値から導ける。一方、直前コマの時刻・値、他3コマの開始遷移の有無、保存済み`transitions`の実値は未確認。DBへの追加アクセスなしでこれ以上は断定しない。
- 本番通知ロジックとは別の研究用シャドー判定。閾値・通知・DB・Vercelは変更しない。

## 継続判定の空振りリスク：実装テスト照合（2026-11-05）

- `tests/areaShadow.test.ts` には40%設定・500m雨域30%・直前RAINでRAINを維持するテスト、および雨域10%でNO_RAINに解除するテストがある。実装のヒステリシス仕様と整合。
- 画像の分類可能率が低い場合はRAINを継続せずINDETERMINATEになること、5分間隔が欠けたときに開始遷移を確定しないこともテストで確認。
- 既存288コマの**面方式単独**集計で、20%と40%の空振りはともに35コマ。ただしこれは「20%への変更で個別の空振りが一件も増えない」の証明ではない。異なるコマで増減が相殺し得る。閾値ごとの同一コマ判定差分・日別・独立地上観測は未検証。
- 40%における継続2コマは、点NO_RAIN・面RAIN・実況RAINのため、当該2コマではレーダー基準の見逃しを減らしている。一方、**継続判定が全体で空振りを何コマ増やしたかは未測定**。単なる面vs点の空振り件数比較だけでは「ヒステリシス単独の寄与」を分離できない。
- 実装と既存テストの**静的監査のみ**。テストの新規実行、DB再集計、本番変更、Vercelビルドは行っていない。

## 空振りの「継続判定による増減」を分離する監査設計（2026-11-05）

- 既存の `docs/sql/rain-shadow-monitoring.sql` は、同一発表・対象時刻の3方式比較用だが、`area.series` の直前状態とヒステリシス由来の判定を直接分類しない。空振りの原因分解には別の読み取り専用照合が必要。
- **分類A：閾値到達**：500m雨域割合 `p>=threshold` により現在RAIN。**分類B：継続**：`threshold/2<p<threshold` かつ同じ発表グループの直前5分コマがRAINのため現在RAIN。**分類C：解除**：`p<=threshold/2` でNO_RAIN。**分類D：保留**：入力品質・時刻・連続性・前状態不明など。これらは判定生成コードの順序に沿って分類する。
- 研究用の空振り集計は、分類Bで実況中心NO_RAINのコマ数（継続由来の空振り）と、分類Bで実況中心RAINのコマ数（継続由来の見逃し回避）を別計上する。分類Aの空振りと混ぜない。
- さらに20%と40%の**同一評価ID・同一baseTime・同一validTime**で、RAIN→NO_RAIN、NO_RAIN→RAIN、保留遷移を全件比較する。空振り総数が35対35でも、個別の増減が相殺する可能性がある。
- 期間・最大100通知・閾値・保留・実況欠測を固定し、日別内訳を確認。実況中心の雨色は地上の降雨実測ではないため、これだけで本番閾値を変更しない。
- 現時点でDB追加照合は安全性チェックにより実施できない。**この節は再実行可能な監査手順の記録であり、追加の実測結果ではない**。本番コード・DB・Vercel無変更。

## 再開時に使う読み取り専用SQL案：40%継続判定の空振り内訳（2026-11-05）

以下は**未実行・未検証の調査用SQL案**。個別の通知ID・地点・利用者IDを結果として出力せず、同じ比較グループの時系列と500m予測特徴量を結合して件数だけを返す。安全性チェックが許可する環境で、列・JSON形状を再確認してから実行すること。

```sql
WITH cases AS (
  SELECT s.evaluation_id, g->>'baseTime' AS base_time,
         v->>'threshold' AS threshold,
         v->'area'->'series' AS area_series,
         s.features AS features,
         g->'point'->'scores' AS point_scores
  FROM public.rain_area_shadow_results s
  JOIN public.rain_notification_evaluations e ON e.id=s.evaluation_id
  CROSS JOIN LATERAL jsonb_array_elements(s.comparison->'groups') g
  CROSS JOIN LATERAL jsonb_array_elements(g->'variants') v
  WHERE e.accepted_count>0
    AND e.created_at >= now() - interval '7 days'
    AND s.algorithm_version='area-shadow-v1'
    AND v->>'threshold'='0.4'
), frames AS (
  SELECT c.evaluation_id,c.base_time,c.threshold,
         a->>'validTime' AS valid_time,
         a->>'state' AS area_state,
         a->>'reason' AS area_reason,
         (f->'metrics'->'circles'->'500'->>'rainFraction')::numeric AS fraction,
         p->>'actual' AS radar_actual
  FROM cases c
  CROSS JOIN LATERAL jsonb_array_elements(c.area_series) a
  LEFT JOIN LATERAL jsonb_array_elements(c.features) f
    ON f->>'kind'='FORECAST'
   AND f->>'baseTime'=c.base_time
   AND f->>'validTime'=a->>'validTime'
  LEFT JOIN LATERAL jsonb_array_elements(c.point_scores) p
    ON p->>'validTime'=a->>'validTime'
), ordered AS (
  SELECT *,
         lag(area_state) OVER (
           PARTITION BY evaluation_id,base_time,threshold
           ORDER BY valid_time
         ) AS prev_state,
         lag(valid_time) OVER (
           PARTITION BY evaluation_id,base_time,threshold
           ORDER BY valid_time
         ) AS prev_time
  FROM frames
), classified AS (
  SELECT *,
    CASE
      WHEN area_reason<>'EXPERIMENTAL_RULE' OR fraction IS NULL THEN 'HOLD_OR_INVALID'
      WHEN area_state='RAIN' AND fraction>=0.4 THEN 'THRESHOLD_RAIN'
      WHEN area_state='RAIN' AND fraction>0.2 AND fraction<0.4
       AND prev_state='RAIN'
       AND to_timestamp(valid_time,'YYYYMMDDHH24MISS')
         - to_timestamp(prev_time,'YYYYMMDDHH24MISS')=interval '5 minutes'
       THEN 'CARRIED_RAIN'
      WHEN area_state='NO_RAIN' AND fraction<=0.2 THEN 'RELEASED_DRY'
      ELSE 'OTHER'
    END AS classification
  FROM ordered
)
SELECT classification,radar_actual, count(*) AS frames
FROM classified
GROUP BY classification,radar_actual
ORDER BY classification,radar_actual;
```

**レビュー注意**：`s.features` がJSONB配列であること、`v->>'threshold'` の文字列表現が `0.4` であること、日時をUTCとして扱うこと、同一評価内の発表時刻が複数存在することを実DBで確認する必要がある。さらに、対象集合は画面の最新100件制限を再現していないので、既存170コマと直接比較しない。これは監査案であり実測ではない。

## SQL案のレビュー：画面と170コマに揃えるための修正点（2026-11-05）

- `supabase/migrations/20261029030141_rain_area_shadow.sql` により、`features` はJSONB配列、`comparison` はJSONBオブジェクト、`evaluation_id` と `algorithm_version` が複合主キーと確認。前節のJSON展開自体はスキーマに適合。
- `lib/research/rainLabRepository.ts` の画面取得条件は、**研究管理者本人のowner_id、accepted_count>0、created_at>=画面取得時点から7日、created_at降順、最大100件**。前節SQLにはowner条件と最大100件の適用がなく、画面と同一母集団にはならない。対象評価ID集合を先に確定するCTEが必要。
- **重要なSQL修正**：前節の `to_timestamp(text,'YYYYMMDDHH24MISS')` はタイムゾーン設定の影響を受け得る。JMAの14桁時刻はUTCとしてパースする実装なので、DBのセッションタイムゾーンを固定するか、UTCを明示して5分差を比較する。日時の文字列差やJSTとしての解釈は禁止。
- 前節の`LEFT JOIN LATERAL jsonb_array_elements(... ) ... ON`は、同じvalidTimeにFORECAST featureが重複していると行が増える。データ整合性の検査（評価ID/baseTime/validTimeごとのfeature件数）を先行させ、重複時は結果を保留する。
- 画面の共通170コマと突き合わせるには、**レーダーactualがRAIN/NO_RAIN、点・面・併用がすべて確定**した同一validTimeのみに絞る必要がある。前節SQLは保留を含む全コマを対象としているので、件数を直接比較できない。
- `rainLab.ts` は同じvalidTimeをpoint scoresとarea/combined scoresで照合する。SQL側もbaseTimeとvalidTimeの両方を保持し、閾値40%に固定して一致条件を適用する。
- さらに画面の170コマは**取得時刻が変われば7日境界が動く**。当時の集計と厳密に比較するには画面の基準時刻と評価ID集合のスナップショットが必要。現時点の新しい7日窓で再計算した数と170が異なっても、直ちに異常とは言えない。
- この節はGitHubコード／migrationの**静的レビュー結果**。前節のSQL案はそのまま実行可能な確定版ではなく、上記修正が済むまで未承認とする。本番DB・通知・Vercel変更なし。

## 画面条件に揃えたSQL完成案（未実行、2026-11-05）

下記は**画面と同じ集計条件を再現するためのレビュー済みSQL案**。実DBでの実行・結果照合は未実施。先頭の `owner_id` と `as_of` を実際の研究管理者・比較時刻に置き換えてから使う。個人IDを公開資料へ記録しないこと。出力は分類別の件数のみ。

```sql
WITH params AS (
 SELECT NULL::uuid AS owner_id,
        '2026-11-05 09:05:14+00'::timestamptz AS as_of
), selected AS (
 SELECT e.id,e.snapshot,e.shadow_state
 FROM public.rain_notification_evaluations e
 CROSS JOIN params p
 WHERE e.owner_id=p.owner_id
   AND e.accepted_count>0
   AND e.created_at>=p.as_of-interval '7 days'
   AND e.created_at<=p.as_of
 ORDER BY e.created_at DESC
 LIMIT 100
), raw AS (
 SELECT e.id AS evaluation_id,
        e.snapshot->>'decidedAt' AS decided_at,
        g->>'baseTime' AS base_time,
        g->'point'->'scores' AS point_scores,
        v->'area'->'series' AS area_series,
        v->'combined'->'series' AS combined_series,
        s.features
 FROM selected e
 JOIN public.rain_area_shadow_results s
   ON s.evaluation_id=e.id AND s.algorithm_version='area-shadow-v1'
 CROSS JOIN LATERAL jsonb_array_elements(s.comparison->'groups') g
 CROSS JOIN LATERAL jsonb_array_elements(g->'variants') v
 WHERE e.shadow_state<>'PENDING'
   AND abs((v->>'threshold')::numeric-0.4)<0.0001
), frames AS (
 SELECT r.evaluation_id,r.base_time,r.decided_at,
        a->>'validTime' AS valid_time,
        a->>'state' AS area_state,
        a->>'reason' AS area_reason,
        p->>'predicted' AS point_state,
        p->>'actual' AS radar_actual,
        c->>'state' AS combined_state,
        (f->'metrics'->'circles'->'500'->>'rainFraction')::numeric AS fraction,
        count(f) AS feature_matches
 FROM raw r
 CROSS JOIN LATERAL jsonb_array_elements(r.point_scores) p
 LEFT JOIN LATERAL jsonb_array_elements(r.area_series) a
   ON a->>'validTime'=p->>'validTime'
 LEFT JOIN LATERAL jsonb_array_elements(r.combined_series) c
   ON c->>'validTime'=p->>'validTime'
 LEFT JOIN LATERAL jsonb_array_elements(r.features) f
   ON f->>'kind'='FORECAST'
  AND f->>'baseTime'=r.base_time
  AND f->>'validTime'=p->>'validTime'
 GROUP BY r.evaluation_id,r.base_time,r.decided_at,
          a->>'validTime',a->>'state',a->>'reason',
          p->>'predicted',p->>'actual',c->>'state',
          f->'metrics'->'circles'->'500'->>'rainFraction'
), parsed AS (
 SELECT *,
   (substr(valid_time,1,4)||'-'||substr(valid_time,5,2)||'-'||
    substr(valid_time,7,2)||' '||substr(valid_time,9,2)||':'||
    substr(valid_time,11,2)||':'||substr(valid_time,13,2)||'+00')::timestamptz AS valid_at
 FROM frames
 WHERE valid_time~'^\\d{14}$'
), ordered AS (
 SELECT *,
   lag(area_state) OVER (
     PARTITION BY evaluation_id,base_time ORDER BY valid_at
   ) AS previous_area,
   lag(valid_at) OVER (
     PARTITION BY evaluation_id,base_time ORDER BY valid_at
   ) AS previous_at
 FROM parsed
), common AS (
 SELECT o.*
 FROM ordered o CROSS JOIN params p
 WHERE o.valid_at>o.decided_at::timestamptz
   AND o.valid_at<=p.as_of
   AND o.radar_actual IN ('RAIN','NO_RAIN')
   AND o.point_state IN ('RAIN','NO_RAIN')
   AND o.area_state IN ('RAIN','NO_RAIN')
   AND o.combined_state IN ('RAIN','NO_RAIN')
), classified AS (
 SELECT *,
   CASE
     WHEN feature_matches<>1 THEN 'FEATURE_COUNT_UNVERIFIED'
     WHEN area_reason<>'EXPERIMENTAL_RULE' OR fraction IS NULL
       THEN 'UNVERIFIED_RULE'
     WHEN area_state='RAIN' AND fraction>=0.4
       THEN 'THRESHOLD_RAIN'
     WHEN area_state='RAIN' AND fraction>0.2 AND fraction<0.4
       AND previous_area='RAIN'
       AND valid_at-previous_at=interval '5 minutes'
       THEN 'CARRIED_RAIN'
     WHEN area_state='NO_RAIN' AND fraction<=0.2
       THEN 'RELEASED_DRY'
     ELSE 'OTHER'
   END AS class
 FROM common
)
SELECT class,radar_actual,count(*) AS frame_count
FROM classified
GROUP BY class,radar_actual
ORDER BY class,radar_actual;
```

**重要な残留注意**：`lag` は全判定コマから計算した後に共通判定コマへ絞っているので、保留コマの前後関係を失わない。ただし上記 `frames` は予測特徴量重複があるとGROUP BYで行が分裂し得るため、`feature_matches<>1` だけで全重複を検出できるとは限らない。実行前に `evaluation_id/base_time/valid_time` ごとの行数を別途検査すること。さらに`NULL::uuid`のままでは0件になる設計で、**実IDを明示せず他ユーザーの結果を横断取得しない**。画面の完全再現には`as_of`と対象IDのスナップショット一致が必要。現時点では**未実行の調査案**であり、170コマ再現を保証しない。

## SQL重複対策の確定修正（2026-11-05）

前節のSQL案には、`features` を展開してから `GROUP BY` しているため、同一時刻に異なる`rainFraction`を持つ特徴量が重複した場合に行が分裂し、`lag` の前後関係を壊す欠点がある。**前節のSQLをそのまま実行しないこと**。以下の置換方式を採用する。

```sql
-- 前節SQLの frames CTE の中で、featuresのLEFT JOIN LATERAL展開を
-- 以下の「1時刻1行」の集約LATERALに置換する。
LEFT JOIN LATERAL (
 SELECT count(*) AS feature_matches,
        CASE WHEN count(*)=1
             THEN max((x->'metrics'->'circles'->'500'->>'rainFraction')::numeric)
             ELSE NULL END AS fraction
 FROM jsonb_array_elements(r.features) AS x
 WHERE x->>'kind'='FORECAST'
   AND x->>'baseTime'=r.base_time
   AND x->>'validTime'=p->>'validTime'
) fm ON true
```

この集約は該当featureが0件・1件・複数件でも1行だけ返し、複数件のときは割合をNULLにして判定保留へ分類する。前節`frames`のSELECTでは`fm.feature_matches`と`fm.fraction`を直接採用し、元の`count(f)`、`f->...`、全`GROUP BY`を削除する。これにより特徴量の重複による行増殖を防ぐ。

ただし、`point_scores`・`area_series`・`combined_series`自体の同一時刻重複も独立に監査し、重複があれば評価グループ全体を検証保留にする。さらに、研究画面の集計コードは`find`で最初の同一時刻を採用するため、SQLで厳格に重複排除した結果と一致しない可能性を明記する。前節SQLはまだ**実行可能な確定版ではなく、修正指示付きのレビュー案**である。

現在はDBへの追加照合を実施していない。新しい170コマ再現・空振り実測の結果はない。本番変更・Vercelビルドなし。

## 判定系列の重複検査：実行前ゲート（2026-11-05）

特徴量の重複だけでなく、point/area/combinedの各系列が同一 `evaluation_id/baseTime/validTime` に重複を持つ場合も、`LEFT JOIN LATERAL` の積で件数が増える。**先に次の診断SQLを実行し、重複が0件であることを確認する**。診断は研究管理者本人の対象評価集合に限定し、個人情報を出力しない。以下の `selected` は前節の `params` と `selected` CTEをそのまま使用する。

```sql
, series_rows AS (
 SELECT s.evaluation_id,g->>'baseTime' AS base_time,
        v->>'threshold' AS threshold,
        'point' AS method,p->>'validTime' AS valid_time
 FROM selected e JOIN public.rain_area_shadow_results s
   ON s.evaluation_id=e.id AND s.algorithm_version='area-shadow-v1'
 CROSS JOIN LATERAL jsonb_array_elements(s.comparison->'groups') g
 CROSS JOIN LATERAL jsonb_array_elements(g->'point'->'scores') p
 CROSS JOIN LATERAL jsonb_array_elements(g->'variants') v
 WHERE abs((v->>'threshold')::numeric-0.4)<0.0001
 UNION ALL
 SELECT s.evaluation_id,g->>'baseTime',v->>'threshold',
        'area',a->>'validTime'
 FROM selected e JOIN public.rain_area_shadow_results s
   ON s.evaluation_id=e.id AND s.algorithm_version='area-shadow-v1'
 CROSS JOIN LATERAL jsonb_array_elements(s.comparison->'groups') g
 CROSS JOIN LATERAL jsonb_array_elements(g->'variants') v
 CROSS JOIN LATERAL jsonb_array_elements(v->'area'->'series') a
 WHERE abs((v->>'threshold')::numeric-0.4)<0.0001
 UNION ALL
 SELECT s.evaluation_id,g->>'baseTime',v->>'threshold',
        'combined',c->>'validTime'
 FROM selected e JOIN public.rain_area_shadow_results s
   ON s.evaluation_id=e.id AND s.algorithm_version='area-shadow-v1'
 CROSS JOIN LATERAL jsonb_array_elements(s.comparison->'groups') g
 CROSS JOIN LATERAL jsonb_array_elements(g->'variants') v
 CROSS JOIN LATERAL jsonb_array_elements(v->'combined'->'series') c
 WHERE abs((v->>'threshold')::numeric-0.4)<0.0001
), duplicates AS (
 SELECT evaluation_id,base_time,threshold,method,valid_time,count(*) AS n
 FROM series_rows
 GROUP BY 1,2,3,4,5
 HAVING count(*)>1
)
SELECT method,count(*) AS duplicate_keys,
       coalesce(sum(n-1),0) AS excess_rows
FROM duplicates GROUP BY method ORDER BY method;
```

**検査条件**：このSQLは前節の`params`と`selected`を含めた**単一WITH文**に結合して実行すること。結果が0行なら、抽出した系列について重複キーなし。重複があれば当該比較グループを分析対象から除外して原因を調査する（勝手に先頭1件へ丸めない）。`point`系列にscore欠損がある場合やvariant重複の検査は別途必要。これも**未実行**であり、結果が0件だったと主張しない。
