import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { readNationalForecastSnapshot } from "@/lib/weather/rain/nationalForecastSnapshot";

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
  if (!path) throw new Error("Forecast snapshot is not configured");
  return JSON.parse(await readFile(path, "utf8"));
}

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const snapshot = readNationalForecastSnapshot(await loadSnapshot());
    return NextResponse.json(snapshot, { headers });
  } catch {
    return NextResponse.json({ error: "NATIONAL_FORECAST_UNAVAILABLE" }, { status: 503, headers });
  }
}
