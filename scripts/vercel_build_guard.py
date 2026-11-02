#!/usr/bin/env python3
"""Build by default. Skip only when baseline and file list can be verified."""
import os
import subprocess

MANAGEMENT_FILES = frozenset({
    "docs/DEVELOPMENT_LEDGER.md",
    "docs/DEVELOPMENT_OPERATIONS_INDEX.md",
    ".github/workflows/development-inventory.yml",
    "scripts/development_inventory.py",
    "scripts/development_inventory_delta.py",
    "scripts/pr_approval_routing.py",
    "scripts/pr_review_handoff.py",
})

def may_skip(previous):
    if not previous or len(previous) != 40 or any(c not in "0123456789abcdefABCDEF" for c in previous):
        return False
    try:
        result = subprocess.run(["git", "diff", "--name-only", previous, "HEAD", "--"], capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.TimeoutExpired):
        return False
    paths = result.stdout.splitlines()
    return result.returncode == 0 and bool(paths) and all(p in MANAGEMENT_FILES for p in paths)

if __name__ == "__main__":
    raise SystemExit(0 if may_skip(os.environ.get("VERCEL_GIT_PREVIOUS_SHA")) else 1)
