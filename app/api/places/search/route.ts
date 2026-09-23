import { NextRequest, NextResponse } from "next/server";
import { searchPlaces } from "@/lib/places/searchPlaces";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100) {
    return NextResponse.json({ error: "query must be between 2 and 100 characters" }, { status: 400 });
  }

  try {
    return NextResponse.json({ results: await searchPlaces(query) });
  } catch {
    return NextResponse.json(
      { error: "PLACE_SEARCH_UNAVAILABLE", message: "場所を検索できませんでした。" },
      { status: 503 },
    );
  }
}
