#!/usr/bin/env node
// Offline research utility only; never fetches credentials, Supabase or production data.
// Run: node --experimental-strip-types scripts/audit-ending-radar.mjs local-diagnostics.json
import { readFile } from "node:fs/promises";
import { auditEndingByLeadWindow } from "../lib/weather/rain/auditEndingRadarProxy.ts";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node --experimental-strip-types scripts/audit-ending-radar.mjs <local-json-export>");
  process.exitCode = 2;
} else {
  try {
    const raw = JSON.parse(await readFile(file, "utf8"));
    if (!Array.isArray(raw)) throw new Error("JSON root must be an array of diagnostic rows");
    if (!raw.every(row => row && typeof row === "object" &&
      typeof row.target_id === "string" && typeof row.checked_at === "string" &&
      (row.current_status === null || typeof row.current_status === "string"))) {
      throw new Error("Rows must include target_id, checked_at and current_status");
    }
    const candidateCount = raw.filter(row =>
      row.diagnostic && typeof row.diagnostic === "object" &&
      row.diagnostic.endingNoticeCandidate &&
      typeof row.diagnostic.endingNoticeCandidate === "object").length;
    const withSourceTime = raw.filter(row => typeof row.source_valid_at === "string" && /^\d{14}$/.test(row.source_valid_at)).length;
    const cohorts = auditEndingByLeadWindow(raw);
    const present = Object.fromEntries(Object.entries(cohorts).map(([name, row]) => {
      const verified = row.verifiedDryAtEnding + row.stillRainingAtEnding;
      return [name, {
        ...row,
        dryFractionAmongMatchedRadar: verified > 0
          ? row.verifiedDryAtEnding / verified : null,
        matchedRadarCount: verified,
        // Do not present a made-up precision when data is unavailable.
        evidenceCoverageFraction: row.evaluated > 0 ? verified / row.evaluated : null,
      }];
    }));
    const result = {
      warning: "Radar evidence proxy only, not user-confirmed actual weather. Candidate rows require the new diagnostic worker (not yet deployed).",
      rows: raw.length,
      candidateRowsPresent: candidateCount,
      withSourceValidAt: withSourceTime,
      cohorts: present,
    };
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
