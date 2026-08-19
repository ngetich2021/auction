import { NextResponse } from "next/server";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = process.env.NOMINATIM_USER_AGENT ?? "disposals-app/1.0";

type NominatimResult = { display_name: string; lat: string; lon: string };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");

  try {
    if (lat && lon) {
      const latitude = Number(lat);
      const longitude = Number(lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
      }
      const res = await fetch(
        `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=0`,
        { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) return NextResponse.json({ label: null });
      const data = (await res.json()) as { display_name?: string };
      return NextResponse.json({ label: data.display_name ?? null });
    }

    if (query && query.length >= 3) {
      const res = await fetch(
        `${NOMINATIM_BASE}/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=5&addressdetails=0`,
        { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) return NextResponse.json({ results: [] });
      const data = (await res.json()) as NominatimResult[];
      const results = (Array.isArray(data) ? data : []).map((item) => ({
        label: item.display_name,
        latitude: Number(item.lat),
        longitude: Number(item.lon),
      }));
      return NextResponse.json({ results });
    }

    return NextResponse.json({ results: [] });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
