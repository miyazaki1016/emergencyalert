#!/usr/bin/env python3
"""Generate a review-only reconciliation report for the canonical operations index."""
import json
import re
from pathlib import Path

def render(index, report):
    snapshot = report.get("snapshot")
    if not isinstance(snapshot, dict):
        raise ValueError("Missing snapshot")
    branches = snapshot.get("branches")
    prs = snapshot.get("prs")
    issues = snapshot.get("issues")
    if not all(isinstance(item, dict) for item in (branches, prs, issues)):
        raise ValueError("Incomplete snapshot")
    cases = re.findall(r"^\| ([MA]-[0-9]+) \|", index, flags=re.M)
    candidates = report.get("review_candidates")
    if not cases or not isinstance(candidates, list):
        raise ValueError("Missing canonical cases or candidates")
    lines = ["# Index reconciliation (review only)", "",
             "This report does not edit the canonical index or ledger.", "",
             f"Indexed cases: {len(cases)}",
             f"Branches including main: {len(branches)}",
             f"Historical PRs: {len(prs)}",
             f"Open issues: {len(issues)}", "",
             "## Branches needing main and ledger comparison", "",
             "| Branch | Head SHA | Historical PR |", "|---|---|---|"]
    for item in sorted(candidates, key=lambda x: str(x.get("name", ""))):
        name = item.get("name")
        if not isinstance(name, str) or name not in branches:
            raise ValueError("Invalid branch candidate")
        sha = branches[name]
        if not isinstance(sha, str):
            raise ValueError("Invalid branch SHA")
        name = name.replace("|", "&#124;").replace("\n", " ")
        lines.append(f"| `{name}` | `{sha[:12]}` | {bool(item.get('historical_pr_found'))} |")
    lines += ["", "Compare each candidate with main, historical PRs, and the existing ledger.",
              "Do not infer unfinished work or duplicate code from branch names.", ""]
    return "\n".join(lines)

def main():
    index = Path("docs/DEVELOPMENT_OPERATIONS_INDEX.md").read_text(encoding="utf-8")
    report = json.loads(Path("inventory-output/report.json").read_text(encoding="utf-8"))
    output = Path("inventory-output/index-review.md")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(render(index, report), encoding="utf-8")

if __name__ == "__main__":
    main()
