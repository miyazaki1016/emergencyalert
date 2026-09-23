import { NextRequest, NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/places/reverseGeocode";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));

  if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
      !Number.isFinite(lon) || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "valid lat and lon are required" }, { status: 400 });
  }

  try {
    return NextResponse.json({ result: await reverseGeocode(lat, lon) });
  } catch {
    return NextResponse.json(
      { error: "REVERSE_GEOCODE_UNAVAILABLE", message: "この場所の住所を確認できませんでした。" },
      { status: 503 },
    );
  }
}
