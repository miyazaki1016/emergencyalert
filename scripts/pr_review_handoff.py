#!/usr/bin/env python3
"""Generate a read-only handoff queue for project maintainers from inventory."""
import json
from pathlib import Path

def render(report):
    repo = report.get("repository", "")
    prs = report.get("snapshot", {}).get("prs", {})
    if not repo or not isinstance(prs, dict):
        raise ValueError("Missing repository or PR snapshot")
    lines = ["# 担当ソラへのPR確認待ち一覧", "",
             "この一覧はGitHubのPR状態を記録したものです。安全性や完了を認定しません。",
             "担当ソラは各PRの変更内容・CI・本番影響を確認してください。",
             "ユーザー承認が必要な変更は承認前にmainへ統合しないでください。", "",
             "| PR | タイトル | 状態 | 最終更新 |",
             "| --- | --- | --- | --- |"]
    count = 0
    for number, pr in sorted(prs.items(), key=lambda item: int(item[0]) if str(item[0]).isdigit() else -1):
        if not str(number).isdigit() or not isinstance(pr, dict) or pr.get("state") != "open":
            continue
        title = " ".join(str(pr.get("title", "")).split()).replace("|", "/").replace("[", "(").replace("]", ")")[:120]
        date = str(pr.get("updated_at", ""))[:35]
        lines.append(f"| [#{number}](https://github.com/{repo}/pull/{number}) | {title} | 確認待ち（Draft含む可能性） | {date} |")
        count += 1
    if not count:
        lines.append("| — | 現時点でopen PRなし | — | — |")
    lines.extend(["", f"Open PR: {count}", "",
                  "この一覧は自動承認・自動マージ・担当ソラへのプッシュ通知を行いません。"])
    return "\n".join(lines) + "\n"

def main():
    report = json.loads(Path("inventory-output/report.json").read_text(encoding="utf-8"))
    output = Path("inventory-output/pr-review-handoff.md")
    output.parent.mkdir(parents=True, exist_ok=True)
    result = render(report)
    output.write_text(result, encoding="utf-8")
    print(result)

if __name__ == "__main__":
    main()
