#!/usr/bin/env python3
"""Read-only GitHub development inventory. No branch/PR/Issue mutations."""
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

REPO = os.environ["GITHUB_REPOSITORY"]
TOKEN = os.environ["GITHUB_TOKEN"]
NOW = dt.datetime.now(dt.timezone.utc)
STALE_DAYS = int(os.environ.get("STALE_DAYS", "14"))
API = "https://api.github.com"

def get(path):
    req = urllib.request.Request(API + path, headers={
        "Authorization": "Bearer " + TOKEN,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "development-inventory-readonly",
    })
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)

def pages(path):
    result = []
    page = 1
    while True:
        separator = "&" if "?" in path else "?"
        batch = get(path + separator + "per_page=100&page=" + str(page))
        if not isinstance(batch, list):
            raise RuntimeError("Unexpected API response")
        result.extend(batch)
        if len(batch) < 100:
            return result
        page += 1

def age(timestamp):
    if not timestamp:
        return None
    updated = dt.datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    return (NOW - updated).days

def main():
    repo = urllib.parse.quote(REPO, safe="/")
    metadata = get("/repos/" + repo)
    default = metadata["default_branch"]
    branches = pages("/repos/" + repo + "/branches")
    all_prs = pages("/repos/" + repo + "/pulls?state=all")
    prs = [p for p in all_prs if p["state"] == "open"]
    issues = [item for item in pages("/repos/" + repo + "/issues?state=open") if "pull_request" not in item]
    pr_heads = {p["head"]["ref"] for p in prs if p["head"]["repo"] and p["head"]["repo"]["full_name"] == REPO}
    historical_heads = {p["head"]["ref"] for p in all_prs if p["head"]["repo"] and p["head"]["repo"]["full_name"] == REPO}
    findings = []
    for branch in branches:
        name = branch["name"]
        if name == default:
            continue
        # No-PR does NOT mean unfinished. Report only as a review candidate.
        if name not in pr_heads:
            findings.append({"type": "branch_without_open_pr", "name": name,
                             "historical_pr_found": name in historical_heads,
                             "url": "https://github.com/" + REPO + "/tree/" + urllib.parse.quote(name, safe="")})
    stale_prs = [{"number": p["number"], "title": p["title"], "days": age(p["updated_at"]),
                  "url": p["html_url"]} for p in prs if age(p["updated_at"]) is not None and age(p["updated_at"]) >= STALE_DAYS]
    stale_issues = [{"number": i["number"], "title": i["title"], "days": age(i["updated_at"]),
                     "url": i["html_url"]} for i in issues if age(i["updated_at"]) is not None and age(i["updated_at"]) >= STALE_DAYS]
    report = {"repository": REPO, "generated_at": NOW.isoformat(), "default_branch": default,
              "branch_count": len(branches), "open_pr_count": len(prs),
              "open_issue_count": len(issues), "historical_pr_count": len(all_prs), "review_candidates": findings,
              "stale_prs": stale_prs, "stale_issues": stale_issues,
              "caveat": "Candidates are NOT proof of unfinished work. Compare main, merged/closed PRs, and canonical ledger before action."}
    os.makedirs("inventory-output", exist_ok=True)
    with open("inventory-output/report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    summary = ["# Development inventory (read-only)", "",
               "Repository: " + REPO, "Generated (UTC): " + NOW.isoformat(), "",
               "| Metric | Count |", "|---|---:|",
               "| Branches including default | " + str(len(branches)) + " |",
               "| Open PRs | " + str(len(prs)) + " |",
               "| Open issues | " + str(len(issues)) + " |",
               "| Branches without open PR (review only) | " + str(len(findings)) + " |",
               "| Stale PRs (>= " + str(STALE_DAYS) + " days) | " + str(len(stale_prs)) + " |",
               "| Stale issues | " + str(len(stale_issues)) + " |", "",
               "**Do not mark branches unfinished or delete them based on this report.**",
               "Consult the project's canonical ledger, closed/merged PRs and main code first.", "",
               "## Stale PRs"]
    summary.extend("- [#" + str(p["number"]) + "](" + p["url"] + ") (" + str(p["days"]) + "d): " + p["title"].replace("\n", " ") for p in stale_prs)
    summary.append("\n## Stale issues")
    summary.extend("- [#" + str(i["number"]) + "](" + i["url"] + ") (" + str(i["days"]) + "d): " + i["title"].replace("\n", " ") for i in stale_issues)
    summary.append("\nBranch candidates are available in report.json artifact.")
    text = "\n".join(summary) + "\n"
    with open("inventory-output/summary.md", "w", encoding="utf-8") as f:
        f.write(text)
    with open(os.environ.get("GITHUB_STEP_SUMMARY", "/dev/null"), "a", encoding="utf-8") as f:
        f.write(text)
    print(text)

if __name__ == "__main__":
    try:
        main()
    except (urllib.error.URLError, KeyError, ValueError, RuntimeError) as error:
        print("Inventory failed: " + str(error), file=sys.stderr)
        sys.exit(1)
