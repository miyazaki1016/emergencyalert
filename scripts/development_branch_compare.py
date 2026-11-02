#!/usr/bin/env python3
"""Read-only branch-to-main comparisons. Report evidence, never infer feature completion."""
import json
import os
import urllib.parse
import urllib.request
from pathlib import Path

def compare_rows(report, fetch, evidence=None):
    snapshot = report.get("snapshot") or {}
    branches = snapshot.get("branches") or {}
    default = report.get("default_branch")
    if not isinstance(branches, dict) or default not in branches:
        raise ValueError("Incomplete branch snapshot")
    rows = []
    for name, sha in sorted(branches.items()):
        if name == default:
            continue
        if not isinstance(sha, str) or len(sha) != 40:
            rows.append((name, "inconclusive: missing SHA", "", "", ""))
            continue
        path = "/repos/" + urllib.parse.quote(report["repository"], safe="/") + "/compare/" + urllib.parse.quote(default, safe="") + "..." + urllib.parse.quote(name, safe="")
        try:
            data = fetch(path)
            if not isinstance(data, dict):
                raise ValueError("Unexpected API result")
            status = data.get("status", "unknown")
            ahead = data.get("ahead_by", "?")
            behind = data.get("behind_by", "?")
            files = data.get("files", [])
            if not isinstance(files, list):
                raise ValueError("Missing files list")
            # GitHub compare returns a capped file list. Do not claim coverage at or near the cap.
            coverage = "partial/unknown" if len(files) >= 300 or ahead == "?" else "API-reported"
            if evidence is not None:
                evidence[name] = {
                    "head_sha": sha,
                    "status": status,
                    "files_complete": len(files) < 300 and ahead != "?",
                    "paths": sorted({item["filename"] for item in files
                                     if isinstance(item, dict) and isinstance(item.get("filename"), str)})
                }
            sample = ", ".join(str(f.get("filename", "")) for f in files[:8] if isinstance(f, dict))
            rows.append((name, str(status), str(ahead), str(behind), coverage + ": " + sample))
        except (ValueError, KeyError, OSError) as error:
            rows.append((name, "inconclusive: " + type(error).__name__, "", "", ""))
    return rows

def find_shared_paths(evidence):
    """Potential review leads, not a statement of duplicated implementations."""
    if not isinstance(evidence, dict):
        raise ValueError("Missing evidence")
    by_file = {}
    for branch, info in evidence.items():
        if not isinstance(info, dict):
            continue
        for path in info.get("paths", []):
            # Documentation and CI infrastructure overlap frequently; ignore those paths.
            if path.startswith(("docs/", ".github/", "tests/")) or path.endswith((".md", ".lock")):
                continue
            by_file.setdefault(path, []).append(branch)
    return {path: sorted(names) for path, names in sorted(by_file.items()) if len(names) > 1}


def render_shared_paths(overlaps, evidence):
    lines = ["# Shared changed-file candidates (review only)", "",
             "Multiple branches changing the same path does NOT establish duplicate functionality.",
             "Check actual patches, merged PR history, and the development ledger.", "",
             "| File | Branches | Evidence coverage |", "|---|---|---|"]
    for path, names in overlaps.items():
        coverage = "partial/unknown" if any(
            not evidence[name].get("files_complete", False) for name in names) else "API-reported"
        safe_path = path.replace("|", "&#124;").replace("\n", " ")
        safe_names = ", ".join(name.replace("|", "&#124;").replace("\n", " ") for name in names)
        lines.append(f"| {safe_path} | {safe_names} | {coverage} |")
    if not overlaps:
        lines.extend(["", "No shared changed paths found in the available API evidence; "
                      "this does not prove absence of duplicated work."])
    return "\n".join(lines) + "\n"


def render(rows):
    lines = ["# Branch-to-main evidence (read-only)", "",
             "This is GitHub compare metadata, not proof that a feature is missing, complete, or safe to merge.",
             "Review full diff, closed PRs, and ledger before taking action.", "",
             "| Branch | Compare status | Ahead | Behind | File evidence |",
             "|---|---|---:|---:|---|"]
    for fields in rows:
        escaped = [str(value).replace("|", "&#124;").replace("\n", " ") for value in fields]
        lines.append("| " + " | ".join(escaped) + " |")
    return "\n".join(lines) + "\n"

def main():
    report = json.loads(Path("inventory-output/report.json").read_text(encoding="utf-8"))
    repo = report["repository"]
    token = os.environ["GITHUB_TOKEN"]
    def fetch(path):
        req = urllib.request.Request("https://api.github.com" + path, headers={
            "Authorization": "Bearer " + token,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "branch-to-main-inventory"})
        with urllib.request.urlopen(req, timeout=20) as response:
            return json.load(response)
    evidence = {}
    rows = compare_rows(report, fetch, evidence=evidence)
    Path("inventory-output/branch-comparison.md").write_text(render(rows), encoding="utf-8")
    overlaps = find_shared_paths(evidence)
    Path("inventory-output/branch-file-evidence.json").write_text(
        json.dumps({"branches": evidence, "shared_paths": overlaps}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8")
    Path("inventory-output/shared-file-review.md").write_text(
        render_shared_paths(overlaps, evidence), encoding="utf-8")
    print("Recorded comparisons for " + str(len(rows)) + " branches in " + repo)

if __name__ == "__main__":
    main()
