import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { readNationalForecastSnapshotForDisplay } from "@/lib/weather/rain/nationalForecastSnapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function loadSnapshot(): Promise<unknown> {
  const remote = process.env.NATIONAL_RAIN_SNAPSHOT_URL;
  if (remote) {
    const url = new URL(remote);
    if (url.protocol !== "https:") throw new Error("Forecast snapshot URL must use HTTPS");
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`Forecast source returned ${response.status}`);
    return response.json();
  }

  const path = process.env.NATIONAL_RAIN_SNAPSHOT_PATH;
  if (path) return JSON.parse(await readFile(path, "utf8"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Forecast snapshot is not configured");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.from("national_rain_forecast_snapshot")
    .select("payload").eq("id", 1).abortSignal(AbortSignal.timeout(5_000)).single();
  if (error || !data) throw new Error("Stored forecast snapshot unavailable");
  return data.payload;
}

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const snapshot = readNationalForecastSnapshotForDisplay(await loadSnapshot());
    return NextResponse.json(snapshot, { headers });
  } catch {
    return NextResponse.json({ error: "NATIONAL_FORECAST_UNAVAILABLE" }, { status: 503, headers });
  }
}
