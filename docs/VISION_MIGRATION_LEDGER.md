# 旧総覧移行照合台帳（作業案）

Issue #327。原本は変更しない。以下は見出し単位の全行範囲索引であり、分類は仮。各範囲内の個別決定・根拠・例外を確認して移行先を確定するまで未照合とする。見出し単位の網羅は意味内容の移行完了を意味しない。

原本: https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md

| ID | 原本範囲 | 見出し | 仮分類 | 状態 |
|---|---|---|---|---|
| M-001 | [L1–23](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L1-L23) | > [!IMPORTANT] | 開発履歴・運用候補 | 未照合 |
| M-002 | [L24–49](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L24-L49) | # 🚨🚨🚨 最重要・永久運用ルール：main総覧は「索引」、詳細は各ブランチ！絶対に忘れるな！ 🚨🚨🚨 | 開発履歴・運用候補 | 未照合 |
| M-003 | [L50–60](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L50-L60) | ## 2026-10-31 ユーザー確定：自動答え合わせ優先・30mm/h以上の独立重要通知 | 仕様候補 | 部分照合： 自動評価・独立大雨通知 → 旧原本の確定要求、[通常評価記録](NOTIFICATION_REPLAY_PRODUCTION_20261029.md) は強雨対象外。大雨仕様の最新正本未確認 |
| M-004 | [L61–66](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L61-L66) | ## 2026-10-29 開発者専用「雨の判定ラボ」 | 開発履歴・運用候補 | 部分照合： [判定ラボ](RAIN_RESEARCH_DASHBOARD_20261029.md) #102、実機未確認の歴史記録 |
| M-005 | [L67–80](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L67-L80) | ## 2026-10-29 最新の再開地点：通知予測・実況の答え合わせと半径1km画像保存 | 仕様候補 | 部分照合： [点評価](NOTIFICATION_REPLAY_PRODUCTION_20261029.md)・[画像](RAIN_AREA_EVIDENCE_20261029.md)・[面比較](RAIN_AREA_SHADOW_20261029.md) #99〜101、当時の実測と現状を区別 |
| M-006 | [L81–91](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L81-L91) | ## 🎯 2026-10-26 — ユーザー確定：通知数より予測の正確さを優先 | 仕様候補 | 部分照合： 精度優先 → 憲章 §6、[面比較](RAIN_AREA_SHADOW_20261029.md)・[判定ラボ](RAIN_RESEARCH_DASHBOARD_20261029.md)。優先順・2km研究の移行先未確定 |
| M-007 | [L92–103](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L92-L103) | # 🚨🚨🚨 ソラへの最重要指示：「りょ」＝「どんどん進めて！」 🚨🚨🚨 | 開発履歴・運用候補 | 部分照合： りょの原義と安全承認の区別 → 原本保持、WORK_RESUME/AGENTSとの照合待ち |
| M-008 | [L104–113](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L104-L113) | ## ✅ 2026-10-23 黄色20〜30mm/h判定・現行コード照合【確認済み／コード側クローズ】 | 開発履歴・運用候補 | 部分照合： 黄色20–30の静的確認 → PNG_PALETTE_EVIDENCE.md・当時のコード/テスト、現行未確認 |
| M-009 | [L114–127](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L114-L127) | ## ☔ 2026-10-23 重要・未統合研究の所在：雨域密度・歯抜け解析 | 研究・検証候補 | 部分照合： 雨域密度・歯抜け研究 → research/rain-field-morphology-20261023 の計画、原本記載の初版SHA保持 |
| M-010 | [L128–135](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L128-L135) | # ☔ 最優先・新チャット引継ぎ正本 — アメふる／サキクル（2026-10-23） | 開発履歴・運用候補 | 部分照合： 引継ぎ手順 → WORK_RESUME候補、旧本番情報は歴史 |
| M-011 | [L136–151](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L136-L151) | ## A. 現在地（2026-10-23確認） | 開発履歴・運用候補 | 部分照合： 2026-10-23の現在地 → 開発台帳照合候補、旧環境を現行としない |
| M-012 | [L152–162](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L152-L162) | ## B. アメふる／サキクルの思想（絶対に残す） | 思想・原点候補 | 部分照合： 基本思想 → 憲章 §6、半径選択・移動方向・浸水情報は構想台帳追記候補 |
| M-013 | [L163–164](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L163-L164) | ## C. 2026-10-19〜23：実装・本番公開・iPhone実機の確定した開発史 | 開発履歴・運用候補 | 部分照合： 開発史の区分 → 原本保持 |
| M-014 | [L165–171](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L165-L171) | ### 第1段階：届いた通知に「実際はどうだった？」（PR #65） | 仕様候補 | 部分照合： PR #65・Issue #67の回答実機証拠 → 開発台帳照合候補 |
| M-015 | [L172–175](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L172-L175) | ### UIを小さく改善（PR #66 / #68） | 開発履歴・運用候補 | 部分照合： PR #66/#68 UI折りたたみ → 開発台帳照合候補 |
| M-016 | [L176–180](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L176-L180) | ### 回答の内訳表示（PR #69） | 開発履歴・運用候補 | 部分照合： PR #69 回答内訳≠的中率 → 開発台帳照合候補 |
| M-017 | [L181–187](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L181-L187) | ### 観測日時の区別（PR #71、Issue #70の一部達成） | 開発履歴・運用候補 | 部分照合： PR #71 観測時刻と根拠・実機 → 開発台帳照合候補 |
| M-018 | [L188–195](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L188-L195) | ### 古い通知の「削除せず画面だけリセット」（PR #72） | 仕様候補 | 部分照合： PR #72 画面整理とDB非削除・#73残課題 → 開発台帳照合候補 |
| M-019 | [L196–202](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L196-L202) | ## D. 検証の定義：何が成功し、何が未検証か | 研究・検証候補 | 部分照合： 検証定義・履歴保全 → WORK_RESUME/仕様照合候補 |
| M-020 | [L203–212](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L203-L212) | ## E. 重要な技術ファイルと境界 | 開発履歴・運用候補 | 部分照合： 技術ファイル・RLS・環境境界 → 原本保持、現行コード未確認 |
| M-021 | [L213–214](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L213-L214) | ## F. 別件として保留、混ぜない | 開発履歴・運用候補 | 部分照合： 別件の分離 → 原本保持 |
| M-022 | [L215–219](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L215-L219) | ### Issue #64／PR #63 — 配信障害対応は後日の必須作業 | 開発履歴・運用候補 | 部分照合： #64/#63 配信安全性 → 開発台帳照合候補、現状未確認 |
| M-023 | [L220–225](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L220-L225) | ### 気象観測・レーダー・夢の機能 | 開発履歴・運用候補 | 部分照合： レーダー・夢の機能 → 憲章/構想台帳候補 |
| M-024 | [L226–233](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L226-L233) | ## G. 次のソラの推奨順序（2026-10-23） | 開発履歴・運用候補 | 部分照合： 当時の推奨順 → 歴史記録、現行優先順位ではない |
| M-025 | [L234–243](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L234-L243) | ## H. 引継ぎでの表現ルール | 開発履歴・運用候補 | 部分照合： 証拠別の報告・りょ・復帰句 → 憲章 §6/WORK_RESUME候補 |
| M-026 | [L244–248](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L244-L248) | # EmergencyAlert 2026 — Project Overview | 開発履歴・運用候補 | 部分照合： 旧総覧の存在理由 → 憲章 §6 |
| M-027 | [L249–263](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L249-L263) | ## Origin | 思想・原点候補 | 部分照合： 原点の両エピソード・生活行動の目的 → [憲章 §6](SAKIKURU_PRODUCT_CHARTER.md#6-原点基本思想の継承2026-11-28-復元案) |
| M-028 | [L264–273](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L264-L273) | ## Constitution | 思想・原点候補 | 部分照合： 憲章の三文・タグライン → 憲章 §6 |
| M-029 | [L274–285](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L274-L285) | ## Meteorological boundary | 思想・原点候補 | 部分照合： 公式情報・独自予測禁止 → 憲章 §6（補足確認あり） |
| M-030 | [L286–293](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L286-L293) | ## Missing-data rule | 思想・原点候補 | 部分照合： 欠測を安全としない → 憲章 §6 |
| M-031 | [L294–321](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L294-L321) | ## 2023 archaeology | 研究・検証候補 | 未照合 |
| M-032 | [L322–347](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L322-L347) | ## 2026 rain product | 仕様候補 | 部分照合： 初期閾値・終了条件は歴史的仕様として原本保持、現行仕様未確認 |
| M-033 | [L348–355](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L348-L355) | ## Cost constraint | 思想・原点候補 | 部分照合： 固定気象データ費ゼロ・有料GRIB2は将来候補、憲章追記候補 |
| M-034 | [L356–379](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L356-L379) | ## Current implementation / checkpoint (2026-09-20) | 開発履歴・運用候補 | 未照合 |
| M-035 | [L380–401](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L380-L401) | ### Rain interpretation safety now locked by tests | 開発履歴・運用候補 | 未照合 |
| M-036 | [L402–419](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L402-L419) | ### Current user-facing behavior | 仕様候補 | 未照合 |
| M-037 | [L420–444](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L420-L444) | ### Current blocker | 開発履歴・運用候補 | 未照合 |
| M-038 | [L445–459](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L445-L459) | ## Immediate work from this checkpoint | 開発履歴・運用候補 | 未照合 |
| M-039 | [L460–468](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L460-L468) | ## Must not break | 思想・原点候補 | 未照合 |
| M-040 | [L469–481](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L469-L481) | ## Recovery phrases | 思想・原点候補 | 部分照合： 復帰の二つの言葉 → 憲章 §6 |
| M-041 | [L482–501](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L482-L501) | ## 2023 design intent recovered from operation history | 思想・原点候補 | 部分照合： GIFの目的・MP4変換 → 憲章 §2-B・§5・§6（旧実装詳細は原本参照） |
| M-042 | [L502–535](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L502-L535) | ## Output boundary — facts first, expression later | 思想・原点候補 | 部分照合： 構造化事実と表現の分離 → [製品憲章](SAKIKURU_PRODUCT_CHARTER.md) §6 |
| M-043 | [L536–568](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L536-L568) | ### Consumer simplicity is part of the EmergencyAlert contract | 思想・原点候補 | 部分照合： 利用側に気象ロジックを再実装させない・イベント候補項目 → 憲章 §6、PR #60詳細未確認 |
| M-044 | [L569–590](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L569-L590) | ### Keep each consumer's experience distinct | 思想・原点候補 | 部分照合： 各サービス固有の体験 → 憲章 §6 |
| M-045 | [L591–610](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L591-L610) | ### Current trust metadata checkpoint (2026-09-23) | 仕様候補 | 部分照合： checkedAt/sourceValidAt・不正時刻・予報なし → 憲章 §6、現行実装未確認 |
| M-046 | [L611–625](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L611-L625) | ### Transparent hrpns pixels fail closed until coverage semantics are proven | 開発履歴・運用候補 | 部分照合： 透過ピクセルの歴史的判定と緩和条件 → 憲章 §6、現行判定未確認 |
| M-047 | [L626–657](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L626-L657) | ## First production-device milestone and next product phase (2026-09-23) | 開発履歴・運用候補 | 未照合 |
| M-048 | [L658–661](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L658-L661) | ## Handoff checkpoint — 2026-09-24 | 開発履歴・運用候補 | 未照合 |
| M-049 | [L662–679](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L662-L679) | ### Production / verified on real devices | 開発履歴・運用候補 | 未照合 |
| M-050 | [L680–698](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L680-L698) | ### Push — current starting point | 開発履歴・運用候補 | 未照合 |
| M-051 | [L699–708](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L699-L708) | ### Watch-target UI decision waiting for implementation | 開発履歴・運用候補 | 未照合 |
| M-052 | [L709–717](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L709-L717) | ### Current DB / worker model | 開発履歴・運用候補 | 未照合 |
| M-053 | [L718–730](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L718-L730) | ### Product/engineering invariants for the next Sora | 開発履歴・運用候補 | 未照合 |
| M-054 | [L731–772](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L731-L772) | ### Current implementation status and immediate next work (updated 2026-09-25) | 開発履歴・運用候補 | 未照合 |
| M-055 | [L773–803](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L773-L803) | ## JMA rasrf target member checkpoint — 2026-09-25 | 研究・検証候補 | 未照合 |
| M-056 | [L804–811](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L804-L811) | ## 2026-10-24 — Push registration ownership recovery (PR #79) | 開発履歴・運用候補 | 未照合 |
| M-057 | [L812–822](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L812-L822) | ## 2026-10-24 — Anonymous auth loss: code-level audit checkpoint | 開発履歴・運用候補 | 未照合 |
| M-058 | [L823–828](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L823-L828) | ### 2026-10-24 — iPhone PWA unknown localStorage key investigation | 開発履歴・運用候補 | 未照合 |
| M-059 | [L829–834](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L829-L834) | ### 2026-10-24 — Persistent opt-in auth-key presence journal (reproduction preparation) | 開発履歴・運用候補 | 未照合 |
| M-060 | [L835–844](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L835-L844) | ## 2026-10-26 通知過多抑制・実装PR | 仕様候補 | 部分照合： 旧通知抑制仕様 #89、現行コード未確認 |
| M-061 | [L845–857](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L845-L857) | ### 2026-10-26 — 通知過多対策の本番反映確認・残課題（追記） | 仕様候補 | 部分照合： #89の当時の本番・CI証拠は原本保持、開発台帳との詳細照合待ち |
| M-062 | [L858–864](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L858-L864) | ### 2026-10-26 — 大雨通知と履歴の新仕様（実装進行中） | 仕様候補 | 部分照合： 独立大雨通知・履歴グラフの歴史的要求、最新正本未確認 |
| M-063 | [L865–873](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L865-L873) | ### 2026-10-29 — 通常通知の予測・実況答え合わせを本番追加 | 仕様候補 | 部分照合： [通常評価記録](NOTIFICATION_REPLAY_PRODUCTION_20261029.md) #99、後続画像保存とは時点を区別 |
| M-064 | [L874–876](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md#L874-L876) | ## 2026-11-01 棚卸し・ブランチ差分調査 | 開発履歴・運用候補 | 未照合 |

## 完了条件
- 全範囲の個別記述を確認し、既存正本への具体的なリンク、追記先、歴史保存のみ、または未解決を記録する。
- 現行仕様と歴史的仕様、確定思想と未確定案を区別する。
- 原本の削除・上書き禁止。既存製品憲章・研究・開発台帳を再利用する。
- 未照合が残る限り移行完了としない。

## 2026-11-28 照合記録
6範囲について原本と追記済み憲章を比較し、保存先を記録した。逐語・例外・技術詳細までの完全性は未認定。残り58範囲は未照合。全64範囲の完了判定は保留。

### 追加照合記録
M-042〜046の5範囲を追加。累計部分照合11、未照合53、完全照合0。旧記録の6範囲は当時の進捗。

### 雨仕様・研究の追加照合
10範囲を部分照合。4つの既存詳細資料の所在と主要記述を確認。特に2026-09-23の透過UNKNOWN方針と10-29の研究資料の取得済み透明画素の分類差は時点・用途を区別し、現行コードの判断を未確認のまま変更しない。累計部分照合21、未照合43、完全照合0。

### 10月23日引継ぎ・開発史の確認
M-007〜026の20範囲の原文を確認し、保存先候補と歴史扱いを記録。候補先の個別PR・現行コードは未確認。累計部分照合41、未照合23、完全照合0。移行先候補の存在・内容確認を別途行う。
