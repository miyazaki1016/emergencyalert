import { NextRequest, NextResponse } from "next/server";
import { JmaPublicImageProvider } from "@/lib/weather/providers/jma/JmaPublicImageProvider";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  try {
    const provider = new JmaPublicImageProvider();
    const [observation, forecast] = await Promise.all([
      provider.getObservationFrames(lat, lon),
      provider.getForecastFrames(lat, lon),
    ]);

    return NextResponse.json({
      source: "JMA high-resolution precipitation nowcast public imagery",
      location: { lat, lon },
      observation,
      forecast,
      interpretationEnabled: false,
      note:
        "Numeric/actionable interpretation stays disabled until the public PNG palette mapping is verified.",
    });
  } catch {
    return NextResponse.json(
      {
        error: "JMA_DATA_UNAVAILABLE",
        message: "最新の雨情報を確認できません。",
      },
      { status: 503 },
    );
  }
}
