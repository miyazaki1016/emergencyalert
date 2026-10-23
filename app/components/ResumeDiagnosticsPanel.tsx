"use client";

import { useEffect, useState } from "react";
import { installPwaResumeDiagnostics, type ResumeEvent } from "../../lib/diagnostics/pwaResumeDiagnostics";

/** Research-only. Shown only with ?resume_debug=1; never sends diagnostic events. */
export default function ResumeDiagnosticsPanel() {
  const [enabled, setEnabled] = useState(false);
  const [events, setEvents] = useState<ResumeEvent[]>([]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("resume_debug") !== "1") return;
    setEnabled(true);
    const handle = installPwaResumeDiagnostics();
    const update = () => setEvents([...handle.events]);
    update();
    const timer = window.setInterval(update, 700);
    return () => window.clearInterval(timer);
  }, []);

  if (!enabled) return null;
  return (
    <aside aria-label="復帰診断（研究用）" style={{
      position: "fixed", bottom: 8, right: 8, zIndex: 2147483647,
      width: "min(94vw, 380px)", maxHeight: "38vh", overflow: "auto",
      padding: 12, background: "#111827", color: "#fff", border: "2px solid #fbbf24",
      borderRadius: 12, fontSize: 12, boxShadow: "0 4px 24px #0008"
    }}>
      <strong>🔍 復帰診断（研究用・端末内のみ）</strong>
      <div>履歴枠: {typeof document !== "undefined" && document.querySelector('[data-amefuru-feedback-history]') ? "あり" : "なし"} ／ 記録: {events.length}件</div>
      <details>
        <summary>直近イベントを表示</summary>
        <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: "24vh", overflow: "auto" }}>
          {events.slice(-18).map(e => `${e.at.slice(11, 19)} ${e.type} ${JSON.stringify(e.details ?? {})}`).join("\n")}
        </pre>
      </details>
      <small>画面撮影時は位置情報などが映らないよう注意。再読み込みで記録は消えます。</small>
    </aside>
  );
}
