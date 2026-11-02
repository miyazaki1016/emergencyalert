#!/usr/bin/env python3
"""Generate a deterministic review-only proposal for the operations index."""
import json
import re
from pathlib import Path

START = "<!-- OPERATIONS_INVENTORY_START -->"
END = "<!-- OPERATIONS_INVENTORY_END -->"

def update(original, report):
    snapshot = report.get("snapshot")
    if not isinstance(snapshot, dict):
        raise ValueError("Missing inventory")
    branches = snapshot.get("branches")
    prs = snapshot.get("prs")
    issues = snapshot.get("issues")
    if not all(isinstance(item, dict) for item in (branches, prs, issues)):
        raise ValueError("Incomplete inventory")
    if report.get("default_branch") not in branches:
        raise ValueError("Default branch missing")
    if not re.search(r"^\| [MA]-[0-9]+ \|", original, re.M):
        raise ValueError("Canonical case list missing")
    lines = ["## GitHub自動棚卸し（確認用の事実）", "",
             "> これはPRの状態だけを示し、開発完了・本番反映・実装重複を意味しません。",
             "",
             "開発台帳: [DEVELOPMENT_LEDGER.md](DEVELOPMENT_LEDGER.md)",
             "",
             "| Open PR | タイトル | Head branch |",
             "|---|---|---|"]
    count = 0
    for number, pr in sorted(prs.items(), key=lambda item: int(item[0]) if str(item[0]).isdigit() else -1):
        if not str(number).isdigit() or not isinstance(pr, dict) or pr.get("state") != "open":
            continue
        if str(pr.get("head_ref", "")).startswith("automation/ledger-facts-"):
            continue
        title = " ".join(str(pr.get("title", "")).split()).replace("|", "/")[:100]
        branch = " ".join(str(pr.get("head_ref", "")).split()).replace("|", "/")[:100]
        lines.append(f"| #{number} | {title} | {branch} |")
        count += 1
    if not count:
        lines.append("| — | なし | — |")
    lines += ["", "全ブランチのmain差分と滞留候補はGitHub Actionsのdevelopment-inventory成果物を参照。",
              "既存案件ID・判断欄は変更しません。", ""]
    block = START + "\n" + "\n".join(lines) + "\n" + END
    if START in original or END in original:
        if original.count(START) != 1 or original.count(END) != 1 or original.index(START) >= original.index(END):
            raise ValueError("Corrupt section markers")
        proposed = original[:original.index(START)] + block + original[original.index(END) + len(END):]
    else:
        proposed = original.rstrip() + "\n\n" + block + "\n"
    if len(proposed.encode("utf-8")) > 2000000:
        raise ValueError("Proposal too large")
    return proposed

def main():
    report = json.loads(Path("inventory-output/report.json").read_text(encoding="utf-8"))
    original = Path("docs/DEVELOPMENT_OPERATIONS_INDEX.md").read_text(encoding="utf-8")
    proposed = update(original, report)
    if update(proposed, report) != proposed:
        raise ValueError("Not idempotent")
    target = Path("inventory-output/index-proposed.md")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(proposed, encoding="utf-8")

if __name__ == "__main__":
    main()
