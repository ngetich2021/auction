import { NextResponse } from "next/server";
import { getListingCount, getListings } from "@/lib/queries";
import { LISTING_CATEGORIES } from "@/lib/validations/listing";
import type { ListingCategory } from "@prisma/client";

function isListingCategory(value: string | null): value is ListingCategory {
  return !!value && (LISTING_CATEGORIES as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const categoryParam = url.searchParams.get("category");
  const category = isListingCategory(categoryParam) ? categoryParam : undefined;
  const search = url.searchParams.get("search")?.trim() || undefined;
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

  const [listings, total] = await Promise.all([getListings({ category, search, near }), getListingCount()]);

  return NextResponse.json({ listings, total });
}
