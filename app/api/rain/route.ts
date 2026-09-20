import { NextRequest, NextResponse } from "next/server";
import { JmaPublicImageProvider } from "@/lib/weather/providers/jma/JmaPublicImageProvider";
import { interpretRainSeries } from "@/lib/weather/rain/RainInterpretationEngine";
import { formatRainMessage } from "@/lib/weather/rain/formatRainMessage";
import { toRainSemanticEvent } from "@/lib/weather/rain/toRainSemanticEvent";
import { canPublishRainInterpretation } from "@/lib/weather/rain/canPublishRainInterpretation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "valid lat and lon are required" }, { status: 400 });
  }

  try {
    const provider = new JmaPublicImageProvider();
    const [observation, forecastSeries] = await Promise.all([
      provider.getObservationFrames(lat, lon),
      provider.getForecastSeries(lat, lon),
    ]);
    const forecast = forecastSeries.frames;

    const now = new Date();
    const interpretation = interpretRainSeries({
      now,
      current: observation[0] ?? null,
      forecast,
      expectedForecastFrames: forecastSeries.expectedFrames,
    });

    const interpretationEnabled = canPublishRainInterpretation(
      interpretation,
      observation,
      forecast,
    );

    return NextResponse.json({
      source: "JMA high-resolution precipitation nowcast public imagery",
      checkedAt: now.toISOString(),
      location: { lat, lon },
      observation,
      forecast,
      interpretation: interpretationEnabled ? interpretation : null,
      event: interpretationEnabled ? toRainSemanticEvent(interpretation, now) : null,
      message: interpretationEnabled ? formatRainMessage(interpretation, now) : null,
      interpretationEnabled,
      note: interpretationEnabled
        ? "Interpretation uses only usable frames and currently verified JMA PNG colors."
        : "Interpretation withheld: palette, coverage, fetch, or forecast completeness is not yet sufficient for a safe user-facing claim.",
    });
  } catch {
    return NextResponse.json(
      { error: "JMA_DATA_UNAVAILABLE", message: "最新の雨情報を確認できません。" },
      { status: 503 },
    );
  }
}
