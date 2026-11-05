#!/usr/bin/env python3
"""Read-only Vercel deployment activity monitor. Never changes deployments.

Usage: VERCEL_TOKEN=... VERCEL_TEAM_ID=team_... python scripts/vercel_quota_monitor.py
Optional: VERCEL_API_BASE for tests, VERCEL_PROJECT_IDS comma-separated.
Outputs JSON; deployment records are an *estimate*, not authoritative quota usage.
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
TEAM = os.getenv("VERCEL_TEAM_ID")
PROJECTS = {p.strip() for p in os.getenv("VERCEL_PROJECT_IDS", "").split(",") if p.strip()}
PAGE_LIMIT = 100

def fetch(params):
    url = BASE + "/v6/deployments?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + TOKEN, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as response:
        return json.load(response)

def main():
    if not TOKEN or not TEAM:
        print("VERCEL_TOKEN and VERCEL_TEAM_ID are required", file=sys.stderr)
        return 2
    now = dt.datetime.now(dt.timezone.utc)
    cutoff = int((now - dt.timedelta(hours=24)).timestamp() * 1000)
    hour = int((now - dt.timedelta(hours=1)).timestamp() * 1000)
    seen = set()
    deployments = []
    before = None
    for _ in range(100):  # hard stop prevents unbounded API traffic
        params = {"teamId": TEAM, "limit": PAGE_LIMIT, "since": cutoff}
        if before is not None:
            params["until"] = before
        page = fetch(params)
        items = page.get("deployments", [])
        if not items:
            break
        new = 0
        for item in items:
            created = item.get("created") or item.get("createdAt")
            key = item.get("uid") or item.get("id")
            if not isinstance(created, (int, float)) or not key or key in seen:
                continue
            seen.add(key)
            if created >= cutoff and (not PROJECTS or item.get("projectId") in PROJECTS or item.get("name") in PROJECTS):
                deployments.append(item)
            new += 1
        oldest = min((i.get("created") or i.get("createdAt") or 0) for i in items)
        if len(items) < PAGE_LIMIT or oldest < cutoff or new == 0:
            break
        before = oldest - 1
    else:
        raise RuntimeError("pagination safety limit reached; count incomplete")
    count24 = len(deployments)
    count1 = sum(1 for item in deployments if (item.get("created") or item.get("createdAt")) >= hour)
    print(json.dumps({
        "team_id": TEAM, "observed_at": now.isoformat(),
        "window": "rolling", "deployment_records_24h": count24,
        "deployment_records_1h": count1,
        "status": "warning" if count24 >= 70 else "normal",
        "note": "Observed deployment records only. NOT authoritative Vercel build/quota usage; canceled/skipped records may differ. No automated gating.",
        "projects_filter": sorted(PROJECTS),
    }, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except (urllib.error.URLError, ValueError, RuntimeError, KeyError) as exc:
        print(json.dumps({"status": "unknown", "error": str(exc), "safe_to_gate": False}), file=sys.stderr)
        sys.exit(1)
