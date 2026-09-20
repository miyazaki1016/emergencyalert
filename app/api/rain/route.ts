import { NextRequest, NextResponse } from "next/server";
import { JmaPublicImageProvider } from "@/lib/weather/providers/jma/JmaPublicImageProvider";
import { interpretRainSeries } from "@/lib/weather/rain/RainInterpretationEngine";
import { formatRainMessage } from "@/lib/weather/rain/formatRainMessage";

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

    const now = new Date();
    const interpretation = interpretRainSeries({
      now,
      current: observation[0] ?? null,
      forecast,
      expectedForecastFrames: forecast.length,
    });

    const hasUnknownPalette = [...observation, ...forecast].some(
      (frame) => frame.status === "UNKNOWN_PIXEL",
    );
    const interpretationEnabled = !hasUnknownPalette;

    return NextResponse.json({
      source: "JMA high-resolution precipitation nowcast public imagery",
      location: { lat, lon },
      observation,
      forecast,
      interpretation: interpretationEnabled ? interpretation : null,
      message: interpretationEnabled ? formatRainMessage(interpretation, now) : null,
      interpretationEnabled,
      note: interpretationEnabled
        ? "Interpretation uses only currently verified JMA PNG colors."
        : "Interpretation withheld because one or more PNG colors are not yet verified.",
    });
  } catch {
    return NextResponse.json(
      { error: "JMA_DATA_UNAVAILABLE", message: "最新の雨情報を確認できません。" },
      { status: 503 },
    );
  }
}
