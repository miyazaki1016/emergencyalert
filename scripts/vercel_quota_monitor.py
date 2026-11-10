#!/usr/bin/env python3
"""Read-only observation of EXACTLY two Vercel projects; never controls deployments.

Deployment history is NOT authoritative quota usage. This program cannot enable a gate.
"""
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = os.getenv("VERCEL_API_BASE", "https://api.vercel.com").rstrip("/")
TOKEN = os.getenv("VERCEL_TOKEN")
EXPECTED_TEAM = "team_VIfp8TXktY4DegRNpPhFb5uT"
EXPECTED_PROJECTS = {
    "prj_71NgSxGkNXkKECXc9jJRrJHdAkDS": "misaki",
    "prj_LDqpPAqNGDaY4Aaix8ulwPc8oXmu": "emergencyalert",
}
TEAM = os.getenv("VERCEL_TEAM_ID")
PROJECTS = {p.strip() for p in os.getenv("VERCEL_PROJECT_IDS", "").split(",") if p.strip()}
PAGE_LIMIT = 100
MAX_PAGES = 100


def request_json(path, params=None):
    url = BASE + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(
        url, headers={"Authorization": "Bearer " + TOKEN, "Accept": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=20) as response:
        data = json.load(response)
    if not isinstance(data, dict) or data.get("error"):
        raise RuntimeError("invalid Vercel API response")
    return data


def fetch(params):
    return request_json("/v6/deployments", params)


def verify_projects():
    """Verify project ID, name, and team individually: no default first-page assumptions."""
    for project_id, name in EXPECTED_PROJECTS.items():
        data = request_json("/v9/projects/" + project_id)
        if (data.get("id") != project_id or data.get("name") != name
                or data.get("accountId") != EXPECTED_TEAM):
            raise RuntimeError("project membership not verified: " + project_id)


def record_time(record):
    value = record.get("created")
    if value is None:
        value = record.get("createdAt")
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value < 0:
        raise RuntimeError("deployment record has invalid created timestamp")
    return int(value)


def gather(cutoff):
    """Request each project separately and reject ambiguous/truncated pages."""
    seen = set()
    deployments = []
    for project_id in EXPECTED_PROJECTS:
        before = None
        for _ in range(MAX_PAGES):
            params = {"limit": PAGE_LIMIT, "since": cutoff, "projectId": project_id}
            if TEAM:
                params["teamId"] = TEAM
            if before is not None:
                params["until"] = before
            page = fetch(params)
            items = page.get("deployments")
            if not isinstance(items, list) or len(items) > PAGE_LIMIT:
                raise RuntimeError("invalid deployments response; monitoring incomplete")
            if not items:
                break
            times = []
            for item in items:
                if not isinstance(item, dict):
                    raise RuntimeError("invalid deployment item")
                key = item.get("uid") or item.get("id")
                if not isinstance(key, str) or not key:
                    raise RuntimeError("missing deployment identifier")
                created = record_time(item)
                times.append(created)
                # The API can include other projects despite a request filter.
                if item.get("projectId") != project_id:
                    raise RuntimeError("API returned foreign/unknown project")
                if before is not None and created > before:
                    raise RuntimeError("pagination boundary violated")
                if key not in seen and created >= cutoff:
                    seen.add(key)
                    deployments.append(item)
            oldest = min(times)
            if len(items) < PAGE_LIMIT or oldest < cutoff:
                break
            # Cannot safely use oldest-1 if an entire full page shares its timestamp.
            if times.count(oldest) > 1:
                raise RuntimeError("ambiguous page boundary; monitoring incomplete")
            next_before = oldest - 1
            if before is not None and next_before >= before:
                raise RuntimeError("pagination did not advance")
            before = next_before
        else:
            raise RuntimeError("pagination safety limit reached; count incomplete")
    return deployments


def quota_alert(usage, limit, authoritative=False):
    """Pure advisory classifier, never an authorization to deploy."""
    if not authoritative or not isinstance(usage, int) or isinstance(usage, bool) or usage < 0:
        return "unknown"
    if not isinstance(limit, int) or isinstance(limit, bool) or limit <= 0:
        return "unknown"
    ratio = usage / limit
    if ratio >= .95:
        return "critical"
    if ratio >= .85:
        return "high"
    if ratio >= .70:
        return "warning"
    return "normal"


def main():
    if not TOKEN:
        print("VERCEL_TOKEN is required", file=sys.stderr)
        return 2
    if TEAM and TEAM != EXPECTED_TEAM:
        raise RuntimeError("unexpected team ID")
    if PROJECTS and PROJECTS != set(EXPECTED_PROJECTS):
        raise RuntimeError("project IDs must be exactly the two approved IDs")
    verify_projects()
    now = dt.datetime.now(dt.timezone.utc)
    cutoff = int((now - dt.timedelta(hours=24)).timestamp() * 1000)
    hour = int((now - dt.timedelta(hours=1)).timestamp() * 1000)
    deployments = gather(cutoff)
    print(json.dumps({
        "team_id": EXPECTED_TEAM,
        "projects_filter": sorted(EXPECTED_PROJECTS),
        "observed_at": now.isoformat(),
        "window": "rolling",
        "deployment_records_24h": len(deployments),
        "deployment_records_1h": sum(record_time(d) >= hour for d in deployments),
        "status": "unknown",
        "status_basis": "authoritative_quota_unavailable",
        "quota_alert": quota_alert(None, 100),
        "safe_to_gate": False,
        "quota_verified": False,
        "note": "History only; NOT quota used/remaining. No automatic pause/resume.",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (urllib.error.URLError, ValueError, RuntimeError, KeyError) as exc:
        print(json.dumps({"status": "unknown", "error": str(exc), "safe_to_gate": False}), file=sys.stderr)
        sys.exit(1)
