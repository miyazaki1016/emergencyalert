# 「止みそう」予測：レーダー照合のオフライン検証手順

これは **開発ブランチ限定**の集計道具です。本番 DB、Edge Function、Push、Main を一切変更しません。**まだ実データの成績ではありません**。

## 必要なデータ

`rain_diagnostic_history` から以下だけを JSON **配列**でエクスポートします。

- `target_id` — 同じ地点の予測と後日のレーダー観測を照合するためだけに使用。所有者 ID や位置座標の出力は不要。
- `checked_at` — 取得時刻。判定時刻との前後関係だけに使います。
- `source_valid_at` — **気象庁画像の観測有効時刻**、UTC の14桁 `YYYYMMDDHHmmss`。欠損は予報的中に計上しません。
- `current_status` — レーダーの地点ステータス（`RAIN`, `NO_RAIN`, `NO_DATA` など）。
- `diagnostic` — 新ワーカーの `endingNoticeCandidate` を含む JSON オブジェクト。

開発用の参照 SQL（**本番への書き込みなし**）。エクスポートする期間は、必ず候補から10分以上**後まで**含めてください。最初は合意した安全な検証環境で使用してください。

```sql
SELECT target_id, checked_at, source_valid_at, current_status, diagnostic
FROM public.rain_diagnostic_history
WHERE checked_at >= :start_time AND checked_at < :end_time
ORDER BY target_id, checked_at;
```

実行例（`local-diagnostics.json` はローカル保存のみで GitHub にコミットしない）：

```bash
node --experimental-strip-types scripts/audit-ending-radar.mjs local-diagnostics.json
```

疑似データによる動作確認：

```bash
node --experimental-strip-types scripts/audit-ending-radar.mjs tests/fixtures/ending-radar-sample.json
```

同じ地点・同じ雨の終了予測時刻について、**5〜10分前の最初の有効な通知候補だけ**を分析対象にします。9分前と6分前に同じ終了予測が出ても、両方の時間帯に重複計上しません。これは実際の通知を意味しないシャドー候補です。

結果は `lead5ToUnder7Point5` と `lead7Point5To10` に分離し、`evaluated`, `verifiedDryAtEnding`, `stillRainingAtEnding`, `reRainWithinTenMinutes`, `unknownAtEnding`, `unknownRecurrence` を表示します。

**解釈の注意:** `dryFractionAmongMatchedRadar` は *比較可能な観測がある事例だけ* の割合であり、通知全体の的中率ではありません。`evidenceCoverageFraction` と母数を常に併記します。データが0件なら精度は `null` であり、0%でも100%でもありません。レーダーは現地の地上降水を保証しないため、ユーザー回答とは混同しないでください。

**重要:** PR #63 の新しい診断レコードは本番未展開です。過去データに `endingNoticeCandidate` がなければ候補件数は0となり、通知方式を比較するための実測値は得られません。検証可能な蓄積が始まるまでは通知条件の切り替えを行わないでください。
