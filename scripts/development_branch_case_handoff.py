#!/usr/bin/env python3
"""Link branch overlap evidence to existing PRs and explicit index references only."""
import json
import re
from pathlib import Path

def build(report, overlaps, index_text):
    snap = report.get("snapshot")
    if not isinstance(snap, dict) or not isinstance(snap.get("branches"), dict) or not isinstance(snap.get("prs"), dict):
        raise ValueError("Incomplete snapshot")
    if not isinstance(overlaps, dict) or not isinstance(overlaps.get("branches"), dict) or not isinstance(overlaps.get("shared_paths"), dict):
        raise ValueError("Incomplete file evidence")
    rows = re.findall(r"^\|\s*([AM]-\d+)\s*\|([^\n]+)$", index_text, re.M)
    if not rows:
        raise ValueError("Canonical index rows missing")
    cases = []
    for case, fields in rows:
        # Exact branch names only; do not guess from generic titles.
        cases.append((case, fields))
    assignments = []
    for branch, sha in sorted(snap["branches"].items()):
        if branch == report.get("default_branch"):
            continue
        pr_numbers = sorted(
            [int(num) for num, pr in snap["prs"].items()
             if str(num).isdigit() and isinstance(pr, dict) and pr.get("head_ref") == branch])
        explicit = [case for case, fields in cases
                    if branch in re.findall(r"`([^`]+)`", fields)]
        shared = [path for path, names in overlaps["shared_paths"].items()
                  if isinstance(names, list) and branch in names]
        coverage = overlaps["branches"].get(branch, {})
        assignments.append({
            "branch": branch, "head_sha": sha,
            "pr_numbers": pr_numbers,
            "explicit_case_ids": sorted(set(explicit)),
            "shared_changed_paths": shared,
            "file_evidence_complete": bool(isinstance(coverage, dict) and coverage.get("files_complete")),
            "review_required": True
        })
    return assignments

def render(assignments):
    lines = ["# Branch → PR → existing case review handoff", "",
             "This report contains explicit references and changed-path overlap hints only.",
             "A blank case ID means *unmatched*, not missing from main or unfinished.", "",
             "| Branch | PR history | Explicit index case | Shared-file hints | Evidence |",
             "|---|---|---|---|---|"]
    for entry in assignments:
        esc = lambda x: str(x).replace("|", "&#124;").replace("\n", " ")
        lines.append("| " + " | ".join([
            esc(entry["branch"]), ", ".join("#" + str(x) for x in entry["pr_numbers"]) or "—",
            ", ".join(entry["explicit_case_ids"]) or "要確認",
            ", ".join(esc(x) for x in entry["shared_changed_paths"][:5]) or "—",
            "API partial/unknown" if not entry["file_evidence_complete"] else "API-reported",
        ]) + " |")
    lines += ["", "Before changing the ledger/index: inspect actual code diffs, relevant merged/closed PRs and existing case notes.",
              "Do not auto-create a new case from an unmatched branch. Do not infer completion or delete any branch.", ""]
    return "\n".join(lines)

def main():
    root = Path("inventory-output")
    report = json.loads((root / "report.json").read_text(encoding="utf-8"))
    evidence = json.loads((root / "branch-file-evidence.json").read_text(encoding="utf-8"))
    index = Path("docs/DEVELOPMENT_OPERATIONS_INDEX.md").read_text(encoding="utf-8")
    assignments = build(report, evidence, index)
    (root / "branch-case-handoff.json").write_text(
        json.dumps({"assignments": assignments, "auto_applied": False}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (root / "branch-case-handoff.md").write_text(render(assignments), encoding="utf-8")

if __name__ == "__main__":
    main()
