#!/usr/bin/env python3
"""Prioritize human review of branch evidence without deciding implementation status."""
import json
from pathlib import Path

def prioritize(handoff, evidence):
    items = handoff.get("assignments")
    shared = evidence.get("shared_paths")
    equal = evidence.get("equal_patches")
    if not isinstance(items, list) or not isinstance(shared, dict) or not isinstance(equal, dict):
        raise ValueError("Incomplete handoff or patch evidence")
    result = []
    for row in items:
        if not isinstance(row, dict) or not isinstance(row.get("branch"), str):
            raise ValueError("Malformed handoff entry")
        branch = row["branch"]
        exact_paths = sorted(path for path, groups in equal.items()
                             if isinstance(groups, list) and any(
                                 isinstance(group, dict) and branch in group.get("branches", [])
                                 for group in groups))
        reasons = []
        if exact_paths:
            reasons.append("identical_api_patch_hints")
        if not row.get("file_evidence_complete"):
            reasons.append("file_evidence_incomplete")
        if not row.get("explicit_case_ids"):
            reasons.append("no_explicit_case_reference")
        if not row.get("pr_numbers"):
            reasons.append("no_historical_pr_reference")
        overlap = sorted(path for path, branches in shared.items()
                         if isinstance(branches, list) and branch in branches)
        if overlap:
            reasons.append("shared_file_paths")
        priority = ("P1_review" if exact_paths or not row.get("file_evidence_complete")
                    else "P2_review" if overlap or not row.get("explicit_case_ids") or not row.get("pr_numbers")
                    else "P3_review")
        result.append({
            "branch": branch, "priority": priority, "reasons": reasons,
            "explicit_case_ids": row.get("explicit_case_ids", []),
            "historical_pr_numbers": row.get("pr_numbers", []),
            "equal_patch_paths": exact_paths[:10],
            "shared_file_paths": overlap[:10],
            "next_action": "Review actual main diff, closed/merged PRs, and existing case notes",
            "auto_applied": False
        })
    return sorted(result, key=lambda x: (x["priority"], x["branch"]))

def render(rows):
    lines = ["# Branch inventory human review queue", "",
             "P1/P2/P3 rank *review urgency*, NOT feature completeness, duplicate status, or merge readiness.",
             "An exact API patch match is only a lead. Unknown API coverage is not a no-change result.", "",
             "| Priority | Branch | Existing case | PR history | Evidence hints |",
             "|---|---|---|---|---|"]
    for item in rows:
        safe = lambda value: str(value).replace("|", "&#124;").replace("\n", " ")
        lines.append("| " + " | ".join([
            item["priority"], safe(item["branch"]),
            ", ".join(item["explicit_case_ids"]) or "unmatched",
            ", ".join("#" + str(n) for n in item["historical_pr_numbers"]) or "unmatched",
            ", ".join(item["reasons"]) or "routine review",
        ]) + " |")
    lines += ["", "Do not create or close cases, alter ledger status, merge, or delete based on this queue.", ""]
    return "\n".join(lines)

def main():
    output = Path("inventory-output")
    handoff = json.loads((output / "branch-case-handoff.json").read_text(encoding="utf-8"))
    evidence = json.loads((output / "branch-file-evidence.json").read_text(encoding="utf-8"))
    rows = prioritize(handoff, evidence)
    (output / "branch-review-queue.json").write_text(
        json.dumps({"candidates": rows, "auto_applied": False}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8")
    (output / "branch-review-queue.md").write_text(render(rows), encoding="utf-8")

if __name__ == "__main__":
    main()
