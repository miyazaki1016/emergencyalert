#!/usr/bin/env python3
"""Read-only branch-to-main comparisons. Report evidence, never infer feature completion."""
import json
import os
import urllib.parse
import urllib.request
from pathlib import Path

def compare_rows(report, fetch):
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
            sample = ", ".join(str(f.get("filename", "")) for f in files[:8] if isinstance(f, dict))
            rows.append((name, str(status), str(ahead), str(behind), coverage + ": " + sample))
        except (ValueError, KeyError, OSError) as error:
            rows.append((name, "inconclusive: " + type(error).__name__, "", "", ""))
    return rows

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
    rows = compare_rows(report, fetch)
    Path("inventory-output/branch-comparison.md").write_text(render(rows), encoding="utf-8")
    print("Recorded comparisons for " + str(len(rows)) + " branches in " + repo)

if __name__ == "__main__":
    main()
