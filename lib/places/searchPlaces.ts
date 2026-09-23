import { normalize } from "@geolonia/normalize-japanese-addresses";

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

function normalizeJapaneseAddress(query: string): string {
  return query
    .normalize("NFKC")
    .replace(/[‐‑‒–—―ー−]/g, "-")
    .replace(/(\d+)丁目(?:[- ]?(\d+))?(?:[- ]?(\d+))?/g, (_match, chome, ban, go) => {
      return [chome, ban, go].filter(Boolean).join("-");
    })
    .replace(/(\d+)番地?(\d+)?号?/g, (_match, ban, go) => [ban, go].filter(Boolean).join("-"))
    .replace(/(\d+)号/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchNominatim(query: string): Promise<NominatimItem[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
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
  return (await response.json()) as NominatimItem[];
}

export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const normalized = normalizeJapaneseAddress(trimmed);

  if (/\d/.test(normalized) && /[都道府県市区町村丁目番]/.test(normalized)) {
    try {
      const address = await normalize(normalized);
      if (address.point && address.level >= 3) {
        const displayAddress = [address.pref, address.city, address.town, address.addr].filter(Boolean).join("");
        return [{
          id: `address:${displayAddress}`,
          displayName: address.town || displayAddress || trimmed,
          displayAddress: displayAddress || trimmed,
          latitude: address.point.lat,
          longitude: address.point.lng,
        }];
      }
    } catch {
      // Keep facility/station search available through Nominatim.
    }
  }

  // Use one explicit Nominatim request for stations/facilities. Avoid rapid
  // retry loops so we stay within the public service usage policy.
  const items = await fetchNominatim(normalized);

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
