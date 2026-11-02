#!/usr/bin/env python3
"""Conservative PR promotion classifier. Never merges, approves, or deploys."""
import argparse
import json
from pathlib import PurePosixPath

HIGH_RISK_PREFIXES = (
    "src/", "app/", "pages/", "api/", "supabase/", "database/",
    "migrations/", "functions/", "lib/", "server/", "public/",
)
HIGH_RISK_EXACT = {
    "package.json", "package-lock.json", "pnpm-lock.yaml",
    "vercel.json", "next.config.js", "next.config.ts",
    ".env", ".env.production",
}
POLICY_PREFIXES = (".github/", "scripts/",)
FACTS_LEDGER = "docs/DEVELOPMENT_LEDGER.md"

def classify(paths, *, draft=False, complete=True):
    """Fail closed: file names are insufficient proof of safe content."""
    paths = list(paths)
    if draft:
        return {"decision": "hold_draft", "reason": "Draft PR; never promote"}
    if not complete or not paths:
        return {"decision": "hold_incomplete", "reason": "Missing/incomplete file evidence"}
    for path in paths:
        if not isinstance(path, str) or not path or path.startswith("/") or "\\" in path:
            return {"decision": "hold_invalid", "reason": "Invalid changed path"}
        if ".." in PurePosixPath(path).parts:
            return {"decision": "hold_invalid", "reason": "Traversal in changed path"}
    if any(p.startswith(HIGH_RISK_PREFIXES) or p in HIGH_RISK_EXACT
           or p.startswith(".env") for p in paths):
        return {"decision": "owner_approval_required", "reason": "Production or app behavior may change"}
    if any(p.startswith(POLICY_PREFIXES) for p in paths):
        return {"decision": "maintainer_review_required", "reason": "Automation or policy changes cannot self-approve"}
    if FACTS_LEDGER in paths:
        return {"decision": "maintainer_review_required", "reason": "Ledger changes require managed-section diff verification"}
    return {"decision": "maintainer_review_required", "reason": "No content-level allow rule has been verified"}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--files-json", required=True, help="JSON list of all changed paths")
    parser.add_argument("--draft", action="store_true")
    parser.add_argument("--incomplete", action="store_true")
    args = parser.parse_args()
    with open(args.files_json, encoding="utf-8") as f:
        paths = json.load(f)
    if not isinstance(paths, list):
        raise ValueError("Expected JSON list of paths")
    print(json.dumps(classify(paths, draft=args.draft, complete=not args.incomplete), ensure_ascii=False))

if __name__ == "__main__":
    main()
