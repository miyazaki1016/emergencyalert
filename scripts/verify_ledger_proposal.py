#!/usr/bin/env python3
"""Fail-closed checks before proposing any development ledger change."""
import argparse
import json
from pathlib import Path
from scripts.development_ledger_proposal import START, END, update

def verify(original, proposed, report):
    if not isinstance(report, dict) or not isinstance(report.get("snapshot", {}).get("prs"), dict):
        raise ValueError("Missing PR snapshot")
    if not report["snapshot"]["prs"]:
        raise ValueError("Empty PR snapshot: refuse to replace facts")
    expected = update(original, report)
    if proposed != expected:
        raise ValueError("Proposal differs from deterministic generator")
    if update(proposed, report) != proposed:
        raise ValueError("Proposal is not idempotent")
    if proposed.count(START) != 1 or proposed.count(END) != 1:
        raise ValueError("Invalid managed section")
    if len(proposed.encode("utf-8")) > 2_000_000:
        raise ValueError("Oversized ledger proposal")
    return True

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", default="inventory-output/report.json")
    parser.add_argument("--ledger", default="docs/DEVELOPMENT_LEDGER.md")
    parser.add_argument("--proposal", default="inventory-output/ledger-proposed.md")
    args = parser.parse_args()
    verify(Path(args.ledger).read_text(encoding="utf-8"),
           Path(args.proposal).read_text(encoding="utf-8"),
           json.loads(Path(args.report).read_text(encoding="utf-8")))

if __name__ == "__main__":
    main()
