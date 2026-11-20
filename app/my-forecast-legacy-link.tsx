"use client";

import { useEffect } from "react";

export default function MyForecastLegacyLink() {
  useEffect(() => {
    const openMyPage = () => {
      const { search, hash } = window.location;
      const query = new URLSearchParams(search);
      const standalone = window.matchMedia("(display-mode: standalone)").matches
        || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (hash === "#my-amefuru" || hash.startsWith("#rain-feedback-")
        || query.get("resume_debug") === "1" || (standalone && query.get("view") !== "forecast")) {
        window.location.replace("/my-amefuru" + search + hash);
      }
    };
    openMyPage();
    window.addEventListener("hashchange", openMyPage);
    return () => window.removeEventListener("hashchange", openMyPage);
  }, []);
  return null;
}
