#!/usr/bin/env python3
"""Read-only searchable history from existing development inventory snapshot."""
import json
import re
from pathlib import Path
from urllib.parse import quote

def cell(value):
    return re.sub(r"\s+", " ", str(value or "")).replace("|", "&#124;").replace("<", "&lt;").replace(">", "&gt;")

def excerpt(body):
    for original in (body or "").splitlines():
        line = original.strip().lstrip("-*> ").strip()
        if line and not line.startswith(("#", "|", "[vc]", "![", "<")) and len(line) >= 12:
            return cell(line[:180] + ("…" if len(line)>180 else ""))
    return "説明抜粋なし。PR差分とコメントを確認"

def render(report):
    snap = report.get("snapshot") or {}
    prs, branches = snap.get("prs"), snap.get("branches")
    repo = report.get("repository")
    if not isinstance(prs, dict) or not isinstance(branches, dict) or not repo:
        raise ValueError("Incomplete inventory; cannot generate trustworthy index")
    lines = ["# 作業内容の履歴索引（自動棚卸し）", "",
             "生成日時 (UTC): " + cell(report.get("generated_at", "不明")), "",
             "この一覧は過去に何を試したかを探すための索引。説明はPR本文の抜粋であり、検証済みの結論ではない。",
             "PR状態は実装完了・本番反映を意味しない。PR差分、Actions、開発台帳を確認する。", "",
             "## 全PRの作業内容", "",
             "| PR | タイトル | 作業内容（PR本文の抜粋） | 状態 | ブランチ |",
             "| --- | --- | --- | --- | --- |"]
    for num,pr in sorted(prs.items(),key=lambda item:int(item[0]) if item[0].isdigit() else -1,reverse=True):
        if not num.isdigit() or not isinstance(pr,dict): continue
        link = "[#" + num + "](https://github.com/" + repo + "/pull/" + num + ")"
        lines.append("| " + " | ".join([link,cell(pr.get("title")),excerpt(pr.get("body")),
                                            cell(pr.get("state", "unknown")),cell(pr.get("head_ref"))]) + " |")
    lines += ["", "## 全作業ブランチ（main以外）", "",
              "ブランチの存在だけで未完了と判断しない。関連PRがないものは作業内容未調査。",
              "", "| ブランチ | PR履歴 | HEAD SHA |", "| --- | --- | --- |"]
    for name,sha in sorted(branches.items()):
        if name == report.get("default_branch"): continue
        prs_for_branch = sorted((n for n,p in prs.items() if n.isdigit() and isinstance(p,dict) and p.get("head_ref")==name),key=int)
        refs = ", ".join("[#"+n+"](https://github.com/"+repo+"/pull/"+n+")" for n in prs_for_branch) or "関連PR未確認"
        lines.append("| ["+cell(name)+"](https://github.com/"+repo+"/tree/"+quote(name,safe="")+") | "+refs+" | "+cell(str(sha or "")[:12])+" |")
    lines += ["", "## 確認先", "",
              "- [製品の恒久方針](https://github.com/"+repo+"/blob/main/docs/SAKIKURU_PRODUCT_CHARTER.md)",
              "- [開発台帳](https://github.com/"+repo+"/blob/main/docs/DEVELOPMENT_LEDGER.md)",
              "- [全PR](https://github.com/"+repo+"/pulls?q=is%3Apr)", "",
              "注意: PRの説明や変更ファイルの存在は、その機能が本番動作中である証拠ではない。", ""]
    return "\n".join(lines)

def main():
    root=Path("inventory-output")
    report=json.loads((root/"report.json").read_text(encoding="utf-8"))
    (root/"work-history.md").write_text(render(report),encoding="utf-8")

if __name__=="__main__": main()
