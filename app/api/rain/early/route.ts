import { NextRequest, NextResponse } from "next/server";
import { JmaEarlyRainForecastProvider } from "@/lib/weather/providers/jma/JmaEarlyRainForecastProvider";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "valid lat and lon are required" }, { status: 400 });
  }

  try {
    const provider = new JmaEarlyRainForecastProvider();
    const forecast = await provider.getForecastFrames(lat, lon);
    const firstRain = forecast.find((frame) => frame.status === "RAIN") ?? null;

    return NextResponse.json({
      source: "JMA precipitation short-range forecast public imagery",
      checkedAt: new Date().toISOString(),
      location: { lat, lon },
      firstRain,
      forecast,
      note: "Prototype only. This endpoint does not send Push notifications.",
    });
  } catch {
    return NextResponse.json(
      { error: "JMA_DATA_UNAVAILABLE", message: "数時間先の雨予報を確認できません。" },
      { status: 503 },
    );
  }
}
