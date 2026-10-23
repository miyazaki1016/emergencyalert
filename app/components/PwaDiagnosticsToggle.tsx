"use client";

import { useEffect, useState } from "react";

/** Manual, device-local diagnostic opt-in for installed PWAs without a URL bar. */
export default function PwaDiagnosticsToggle() {
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    try {
      setEnabled(window.sessionStorage.getItem("amefuru:resume-debug:enabled:v1") === "1");
    } catch {
      setAvailable(false);
    }
  }, []);

  const toggle = () => {
    try {
      const next = !enabled;
      if (next) window.sessionStorage.setItem("amefuru:resume-debug:enabled:v1", "1");
      else window.sessionStorage.removeItem("amefuru:resume-debug:enabled:v1");
      // Reload the current PWA window only. Never clear auth, caches, or registered places.
      window.location.reload();
    } catch {
      setAvailable(false);
    }
  };

  return (
    <section style={{ marginTop: 28, paddingBottom: 24 }}>
      <button type="button" disabled={!available} onClick={toggle}
        aria-pressed={enabled}
        style={{ background: "transparent", color: "#c8d9ed", border: "1px solid #6585a6",
          borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
        {enabled ? "🔍 開発者診断を終了" : "🔍 開発者診断を開く"}
      </button>
      {!available && <small style={{ display: "block" }}>この環境では診断切替を利用できません。</small>}
    </section>
  );
}
