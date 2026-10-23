/**
 * Opt-in, local-only PWA resume diagnostics.
 *
 * Research-only module. NOT imported by the production app.
 * No Supabase calls, token reads, user IDs, localStorage writes, or network sends.
 * To test in a future approved build, call installPwaResumeDiagnostics()
 * once from a client component and inspect window.__amefuruResumeDiagnostics.
 */

export type ResumeEvent = {
  at: string;
  type: "install" | "pagehide" | "pageshow" | "visibilitychange" | "focus" |
    "blur" | "freeze" | "resume" | "history-mount" | "history-unmount" |
    "history-refresh-start" | "history-refresh-end" | "history-refresh-error" |
    "error" | "unhandledrejection";
  details?: Record<string, string | number | boolean | null>;
};

type DiagnosticsHandle = {
  events: ResumeEvent[];
  mark: (type: ResumeEvent["type"], details?: ResumeEvent["details"]) => void;
  stop: () => void;
};

declare global {
  interface Window {
    __amefuruResumeDiagnostics?: DiagnosticsHandle;
  }
}

export function installPwaResumeDiagnostics(): DiagnosticsHandle {
  if (typeof window === "undefined") {
    throw new Error("Client-only diagnostic");
  }
  if (window.__amefuruResumeDiagnostics) return window.__amefuruResumeDiagnostics;

  const events: ResumeEvent[] = [];
  const mark: DiagnosticsHandle["mark"] = (type, details) => {
    events.push({ at: new Date().toISOString(), type, details });
    if (events.length > 100) events.shift();
  };
  const onVisibility = () => mark("visibilitychange", {
    visibilityState: document.visibilityState,
    historySectionPresent: !!document.querySelector('[data-amefuru-feedback-history]'),
  });
  const onPageShow = (event: PageTransitionEvent) =>
    mark("pageshow", { persisted: event.persisted });
  const onPageHide = (event: PageTransitionEvent) =>
    mark("pagehide", { persisted: event.persisted });
  const onFocus = () => mark("focus");
  const onBlur = () => mark("blur");
  const onFreeze = () => mark("freeze");
  const onResume = () => mark("resume");
  // Record occurrence only; exception text can contain user-entered values.
  const onError = () => mark("error", { occurred: true });
  const onRejection = () => mark("unhandledrejection", { occurred: true });

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("focus", onFocus);
  window.addEventListener("blur", onBlur);
  document.addEventListener("freeze", onFreeze);
  document.addEventListener("resume", onResume);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  mark("install", {
    navigationType: performance.getEntriesByType("navigation")[0] &&
      "type" in performance.getEntriesByType("navigation")[0]
      ? String((performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming).type)
      : "unknown",
    standalone: window.matchMedia("(display-mode: standalone)").matches,
    historySectionPresent: !!document.querySelector('[data-amefuru-feedback-history]'),
  });

  const handle: DiagnosticsHandle = {
    events,
    mark,
    stop: () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("freeze", onFreeze);
      document.removeEventListener("resume", onResume);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      delete window.__amefuruResumeDiagnostics;
    },
  };
  window.__amefuruResumeDiagnostics = handle;
  return handle;
}
