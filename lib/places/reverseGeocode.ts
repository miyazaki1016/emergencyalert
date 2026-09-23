export interface ReverseGeocodeResult {
  displayName: string | null;
  displayAddress: string;
  latitude: number;
  longitude: number;
}

interface NominatimReverseItem {
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult | null> {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("INVALID_COORDINATES");
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "ja");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "EmergencyAlert/2026 (reverse geocoding)",
      "Accept-Language": "ja",
    },
    cache: "no-store",
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error("REVERSE_GEOCODE_UNAVAILABLE");

  const item = (await response.json()) as NominatimReverseItem;
  const resolvedLat = Number(item.lat);
  const resolvedLon = Number(item.lon);

  return {
    displayName: item.name?.trim() || null,
    displayAddress: item.display_name,
    latitude: Number.isFinite(resolvedLat) ? resolvedLat : latitude,
    longitude: Number.isFinite(resolvedLon) ? resolvedLon : longitude,
  };
}
