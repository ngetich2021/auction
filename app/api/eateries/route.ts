import { NextResponse } from "next/server";
import { getEateries } from "@/lib/queries";

export const revalidate = 5;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lng = url.searchParams.get("lng");
  const radius = url.searchParams.get("radius");

  let near: { latitude: number; longitude: number; radiusKm: number } | undefined;
  if (lat && lng) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    const radiusKm = radius ? Number(radius) : 25;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(radiusKm)) {
      return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
    }
    near = { latitude, longitude, radiusKm };
  }

  const eateries = await getEateries({ near });
  return NextResponse.json({ eateries });
}
