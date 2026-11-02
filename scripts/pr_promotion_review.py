#!/usr/bin/env python3
"""Classify a PR using trusted main-branch policy and GitHub API metadata. Read-only."""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

try:
    from scripts.pr_promotion_policy import classify
except ModuleNotFoundError:
    from pr_promotion_policy import classify


def fetch_json(path):
    req = urllib.request.Request(
        "https://api.github.com" + path,
        headers={
            "Authorization": "Bearer " + os.environ["GITHUB_TOKEN"],
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "promotion-review-only",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)


def inspect(repo, number):
    root = "/repos/" + urllib.parse.quote(repo, safe="/")
    pr = fetch_json(root + "/pulls/" + str(number))
    if pr.get("base", {}).get("ref") != "main":
        return {"decision": "hold_invalid", "reason": "Target branch is not main"}
    paths = []
    complete = True
    for page in range(1, 12):
        batch = fetch_json(root + "/pulls/" + str(number) + "/files?per_page=100&page=" + str(page))
        if not isinstance(batch, list):
            complete = False
            break
        if any(not isinstance(item, dict) or not isinstance(item.get("filename"), str) for item in batch):
            complete = False
            break
        paths.extend(item["filename"] for item in batch)
        if len(batch) < 100:
            break
    else:
        complete = False
    if pr.get("changed_files") != len(paths):
        complete = False
    result = classify(paths, draft=bool(pr.get("draft", True)), complete=complete)
    return {
        **result, "pr": number, "head_sha": pr.get("head", {}).get("sha"),
        "files_seen": len(paths), "files_complete": complete,
        "auto_merged": False, "approval_granted": False,
    }


def main():
    repo = os.environ["GITHUB_REPOSITORY"]
    number = int(os.environ["PR_NUMBER"])
    try:
        result = inspect(repo, number)
    except (urllib.error.URLError, ValueError, KeyError, TypeError) as error:
        result = {
            "decision": "hold_incomplete", "reason": "GitHub metadata unavailable: " + type(error).__name__,
            "pr": number, "auto_merged": False, "approval_granted": False,
        }
    output = Path("inventory-output/pr-promotion-review.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary = ("### PR promotion review (read-only)\n"
               "- PR: #" + str(number) + "\n"
               "- Decision: **" + result["decision"] + "**\n"
               "- Reason: " + result["reason"] + "\n"
               "- No approval, merge, or deployment performed.\n")
    print(summary)
    with open(os.environ.get("GITHUB_STEP_SUMMARY", os.devnull), "a", encoding="utf-8") as f:
        f.write(summary)


if __name__ == "__main__":
    main()
