#!/usr/bin/env python3
"""Enrich the existing PR handoff queue with fail-closed approval routing.

Read-only. Decisions are advisory, never proof of review or approval.
"""
import json
import os
import urllib.error
from pathlib import Path

try:
    from scripts.pr_promotion_review import inspect
except ModuleNotFoundError:
    from pr_promotion_review import inspect

ROUTES = {
    "owner_approval_required": "ユーザー承認が必要（担当ソラが先に内容確認）",
    "maintainer_review_required": "担当ソラの確認が必要",
    "hold_draft": "Draftのため保留",
    "hold_incomplete": "情報不足のため保留",
    "hold_invalid": "判定不可のため保留",
}


def clean(value, limit=120):
    return " ".join(str(value).split()).replace("|", "/").replace("[", "(").replace("]", ")")[:limit]


def build(report, inspect_pr=inspect):
    repo = report.get("repository")
    snapshot = report.get("snapshot")
    prs = snapshot.get("prs") if isinstance(snapshot, dict) else None
    if not isinstance(repo, str) or not repo or not isinstance(prs, dict):
        raise ValueError("Missing repository or PR snapshot")
    rows = []
    for number, pr in sorted(prs.items(), key=lambda pair: int(pair[0]) if str(pair[0]).isdigit() else -1):
        if not str(number).isdigit() or not isinstance(pr, dict) or pr.get("state") != "open":
            continue
        try:
            classification = inspect_pr(repo, int(number))
            decision = classification.get("decision")
            if decision not in ROUTES:
                decision = "hold_invalid"
                reason = "Unknown classifier result"
            elif classification.get("head_sha") != pr.get("head"):
                decision = "hold_incomplete"
                reason = "PR changed during inventory; recheck required"
            else:
                reason = classification.get("reason", "")
        except (urllib.error.URLError, ValueError, KeyError, TypeError, TimeoutError) as error:
            decision = "hold_incomplete"
            reason = "PR classification unavailable: " + type(error).__name__
        rows.append({"number": int(number), "title": clean(pr.get("title", "")),
                     "updated_at": clean(pr.get("updated_at", ""), 35),
                     "decision": decision, "route": ROUTES[decision], "reason": clean(reason, 180),
                     "head_sha": pr.get("head")})
    return rows


def render(repo, rows):
    lines = [
        "# PR確認待ち・承認経路（読み取り専用）", "",
        "これは担当ソラ向けの確認キューです。判定はファイル名等に基づく保守的な一次分類で、承認・実機確認・本番反映を意味しません。",
        "ユーザー承認が必要なPRは、担当ソラが変更内容・CI・本番影響を確認してからユーザーへ相談してください。", "",
        "| PR | タイトル | 次の確認者 | 判定 | 更新日時 |",
        "| --- | --- | --- | --- | --- |",
    ]
    for row in rows:
        lines.append(
            f"| [#{row['number']}](https://github.com/{repo}/pull/{row['number']})"
            f" | {row['title']} | {row['route']} | \`{row['decision']}\` | {row['updated_at']} |"
        )
    if not rows:
        lines.append("| — | Open PRなし | — | — | — |")
    lines.extend(["", f"Open PR: {len(rows)}", "",
                  "自動承認・自動マージ・自動通知は行いません。保留も担当ソラが原因を確認してください。"])
    return "\n".join(lines) + "\n"


def main():
    report = json.loads(Path("inventory-output/report.json").read_text(encoding="utf-8"))
    rows = build(report)
    root = Path("inventory-output")
    (root / "pr-approval-routing.json").write_text(
        json.dumps({"repository": report["repository"], "items": rows}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8")
    markdown = render(report["repository"], rows)
    (root / "pr-approval-routing.md").write_text(markdown, encoding="utf-8")
    print(markdown)
    with open(os.environ.get("GITHUB_STEP_SUMMARY", os.devnull), "a", encoding="utf-8") as output:
        output.write(markdown)


if __name__ == "__main__":
    main()
