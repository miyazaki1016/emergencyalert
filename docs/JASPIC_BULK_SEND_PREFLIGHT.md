# JASPIC 20件超の送信: 本番反映前チェック（Issue #235 / PR #236）

> **未適用の設計・検証資料**。このファイルは本番DBの変更や実メール送信を行わない。

## 本番DBで確認した制限

2026-11-13 の読み取り専用調査で、`public.jaspic_prepare_production` 内に
`jsonb_array_length(p_candidates)>20` が残っていることを確認した。
アプリ側の20件制限を外すだけでは、滋賀23件の準備処理は `Invalid plan` で失敗する。

既存のDB関数は、候補の検証、配送台帳への `PREPARED` 登録、
スナップショット更新、revision更新を1トランザクションで実行する。
この原子性、送信元・宛先検証、未解決配送停止、revision照合は変更しない。

## 安全な変更範囲

1. 本番DBの実関数定義をベースに、**候補数 >20 の拒否条件だけ**を除く変更をレビューする。
2. アプリ側とDB側の候補数判定を整合させる。県別の `SOURCE_COUNT_GUARD`（±20%）は維持する。
3. 一度に送信する件数が増えても `maxDuration=300` に達しないことを、Gmail送信時間の上限と安全余裕を含めて検証する。検証できない場合は本番反映を保留する。
4. 処理中断時は `PREPARED` / `SENDING` / `UNKNOWN` を**自動再送しない**。既存配送台帳とGmail側の結果を照合するまで再開禁止とする。
5. 無送信previewで当日の未送信候補・カテゴリ・異常・未解決配送を確認し、最新HEADのCI合格とDB変更検証の証拠を残す。
6. 以上の検証後にのみ本番変更と実送信を判断する。Draft PRのままマージしない。

## 2026-11-13 の読み取り専用観測

- `jaspic_records`: 滋賀716件、広島不審者471件、広島犯罪5742件。
- `jaspic_deliveries`: `SENT` 32件、未解決ステータス0件。
- `jaspic_sources`: 両県 baseline_complete=true、revision=11。
- PR #236 HEAD `12ef4b9012c8b0ebe335eefa9d4a7c456acce464` の通常CI成功:
  https://github.com/miyazaki1016/emergencyalert/actions/runs/43393403736
- 同HEADの着手前照合 REVIEW_RECORDED:
  https://github.com/miyazaki1016/emergencyalert/actions/runs/43393403688

**未確認:** 当日の実候補件数、実Gmail25件超の所要時間、DB関数変更後の動作、途中停止後の手動照合・再開。これらを確認するまでは「送信可能」と表示しない。
