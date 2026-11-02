#!/usr/bin/env python3
"""Generate a deterministic, review-only GitHub facts section from inventory report."""
import argparse
import json
from pathlib import Path

START = "<!-- INVENTORY_FACTS_START -->"
END = "<!-- INVENTORY_FACTS_END -->"

def render(report):
    prs = report.get("snapshot", {}).get("prs", {})
    lines = ["## GitHub自動取得の事実（確認用）", "",
             "> この欄はPRメタデータの記録であり、開発完了・本番反映の認定ではありません。", "",
             "| PR | タイトル | 状態 | head SHA | 更新日時 |",
             "| --- | --- | --- | --- | --- |"]
    for number, pr in sorted(prs.items(), key=lambda item: int(item[0]) if str(item[0]).isdigit() else -1):
        if not str(number).isdigit() or not isinstance(pr, dict):
            continue
        if str(pr.get("head_ref", "")).startswith("automation/ledger-facts-"):
            continue
        state = str(pr.get("state", "unknown")).replace("|", "/").replace("\n", " ")
        sha = str(pr.get("head", ""))[:40]
        updated = str(pr.get("updated_at", ""))[:35]
        title = " ".join(str(pr.get("title", "")).split()).replace("|", "/")[:120]
        lines.append(f"| #{number} | {title} | {state} | `{sha}` | {updated} |")
    return "\n".join(lines) + "\n"

def update(ledger, report):
    section = START + "\n" + render(report) + END
    if START in ledger or END in ledger:
        if ledger.count(START) != 1 or ledger.count(END) != 1 or ledger.index(START) > ledger.index(END):
            raise ValueError("Invalid managed markers; refuse to change ledger")
        return ledger[:ledger.index(START)] + section + ledger[ledger.index(END) + len(END):]
    return ledger.rstrip() + "\n\n" + section + "\n"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", default="inventory-output/report.json")
    parser.add_argument("--ledger", default="docs/DEVELOPMENT_LEDGER.md")
    parser.add_argument("--output", default="inventory-output/ledger-proposed.md")
    args = parser.parse_args()
    report = json.loads(Path(args.report).read_text(encoding="utf-8"))
    if not isinstance(report.get("snapshot", {}).get("prs"), dict):
        raise ValueError("PR snapshot missing; refuse to propose ledger update")
    proposed = update(Path(args.ledger).read_text(encoding="utf-8"), report)
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(proposed, encoding="utf-8")

if __name__ == "__main__":
    main()
