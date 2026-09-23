export interface PlaceSearchResult {
  id: string;
  displayName: string;
  displayAddress: string;
  latitude: number;
  longitude: number;
}

interface NominatimItem {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
}

export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "jp");
  url.searchParams.set("accept-language", "ja");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "EmergencyAlert/2026 (place search)",
      "Accept-Language": "ja",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("PLACE_SEARCH_UNAVAILABLE");

  const items = (await response.json()) as NominatimItem[];
  return items.flatMap((item) => {
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    return [{
      id: String(item.place_id),
      displayName: item.name?.trim() || item.display_name.split(",")[0]?.trim() || trimmed,
      displayAddress: item.display_name,
      latitude,
      longitude,
    }];
  });
}
