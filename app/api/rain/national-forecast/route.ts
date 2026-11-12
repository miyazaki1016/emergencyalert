import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { readNationalForecastSnapshot } from "@/lib/weather/rain/nationalForecastSnapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const path = process.env.NATIONAL_RAIN_SNAPSHOT_PATH;
  const headers = { "Cache-Control": "no-store" };
  try {
    if (!path) throw new Error("Forecast snapshot is not configured");
    const snapshot = readNationalForecastSnapshot(JSON.parse(await readFile(path, "utf8")));
    return NextResponse.json(snapshot, { headers });
  } catch {
    return NextResponse.json({ error: "NATIONAL_FORECAST_UNAVAILABLE" }, { status: 503, headers });
  }
}
