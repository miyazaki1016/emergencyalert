#!/usr/bin/env python3
"""Generate read-only inventory change candidates from the prior successful artifact."""
import io
import json
import os
import urllib.parse
import urllib.error
import urllib.request
import urllib.error
import zipfile
from pathlib import Path

API = "https://api.github.com"
REPO = os.environ.get("GITHUB_REPOSITORY", "")
TOKEN = os.environ.get("GITHUB_TOKEN", "")
CURRENT_RUN = str(os.environ.get("GITHUB_RUN_ID", ""))

class SafeRedirect(urllib.request.HTTPRedirectHandler):
    """Do not forward GitHub bearer tokens to external artifact storage."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        redirected = super().redirect_request(req, fp, code, msg, headers, newurl)
        if redirected is not None and urllib.parse.urlsplit(newurl).hostname != urllib.parse.urlsplit(req.full_url).hostname:
            redirected.remove_header("Authorization")
            redirected.unredirected_hdrs.pop("Authorization", None)
        return redirected

OPENER = urllib.request.build_opener(SafeRedirect)

def api(path, binary=False):
    req = urllib.request.Request(API + path, headers={
        "Authorization": "Bearer " + TOKEN,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "development-inventory-delta-readonly",
    })
    try:
        response = OPENER.open(req, timeout=30)
    except urllib.error.HTTPError as error:
        # Expose the failed endpoint *path*, never signed query parameters or tokens.
        location = urllib.parse.urlsplit(error.url)
        raise RuntimeError("GitHub artifact lookup HTTP " + str(error.code) +
                           " at " + location.hostname + location.path) from error
    with response:
        return response.read() if binary else json.load(response)

def previous_snapshot():
    repo = urllib.parse.quote(REPO, safe="/")
    runs = api("/repos/" + repo + "/actions/workflows/development-inventory.yml/runs?status=success&per_page=30")
    for run in runs.get("workflow_runs", []):
        if str(run["id"]) == CURRENT_RUN or run["event"] not in ("schedule", "workflow_dispatch"):
            continue
        artifacts = api("/repos/" + repo + "/actions/runs/" + str(run["id"]) + "/artifacts?per_page=100")
        for item in artifacts.get("artifacts", []):
            if item["name"] != "development-inventory" or item.get("expired"):
                continue
            archive = api("/repos/" + repo + "/actions/artifacts/" + str(item["id"]) + "/zip", binary=True)
            with zipfile.ZipFile(io.BytesIO(archive)) as z:
                with z.open("report.json") as f:
                    previous = json.load(f)
            if previous.get("repository") == REPO and "snapshot" in previous:
                return previous, run["id"]
    return None, None

def compare(previous, current):
    changes = []
    for group in ("branches", "prs", "issues"):
        before = previous.get("snapshot", {}).get(group, {})
        after = current["snapshot"][group]
        for key in sorted(set(before) | set(after)):
            if key not in before:
                kind = "added"
            elif key not in after:
                kind = "absent_from_snapshot"
            elif before[key] != after[key]:
                kind = "changed"
            else:
                continue
            changes.append({"type": group, "id": key, "change": kind,
                            "before": before.get(key), "after": after.get(key)})
    return changes

def main():
    output = Path("inventory-output")
    current = json.loads((output / "report.json").read_text(encoding="utf-8"))
    error_note = None
    try:
        previous, run_id = previous_snapshot()
    except (RuntimeError, urllib.error.HTTPError, urllib.error.URLError, zipfile.BadZipFile, KeyError, ValueError) as error:
        # Never discard today's complete inventory because a prior artifact cannot be read.
        # Explicitly report the comparison failure; do NOT claim zero changes.
        previous, run_id = None, None
        error_note = "Previous report unavailable: " + type(error).__name__
        if isinstance(error, urllib.error.HTTPError):
            error_note += " (HTTP " + str(error.code) + ")"
        if isinstance(error, RuntimeError):
            error_note += " (" + str(error) + ")"
    if error_note:
        result = {"status": "comparison_unavailable", "previous_run_id": None, "changes": [],
                  "note": error_note + "; delta NOT checked. Current inventory saved."}
    elif previous is None:
        result = {"status": "baseline_only", "previous_run_id": None, "changes": [],
                  "note": "No prior compatible successful artifact; do not infer no changes."}
    else:
        result = {"status": "compared", "previous_run_id": run_id,
                  "changes": compare(previous, current),
                  "note": "Candidates only. No automatic ledger status or completion decisions."}
    (output / "delta.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = ["# Development inventory change candidates", "",
             "Status: " + result["status"],
             "Previous run: " + str(run_id or "none"),
             "Candidates: " + str(len(result["changes"])), "",
             result["note"], "",
             "**Read-only suggestions; verify main, PR history and ledger before updating.**", ""]
    for c in result["changes"]:
        lines.append("- " + c["type"] + " `" + c["id"].replace("`", "") + "`: " + c["change"])
    (output / "ledger-update-candidates.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))

if __name__ == "__main__":
    main()
