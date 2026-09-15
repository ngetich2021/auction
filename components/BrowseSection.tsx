"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "next-auth";
import { ItemGrid } from "@/components/ItemGrid";
import { ItemDetailModal } from "@/components/ItemDetailModal";
import { useGlobalLocation, DEFAULT_RADIUS_KM, MAX_RADIUS_KM } from "@/components/GlobalLocationProvider";
import { CATEGORY_LABELS, LISTING_CATEGORIES } from "@/lib/validations/listing";
import type { ClientListing, ListingCategory } from "@/types/listing";

export function BrowseSection({
  initialListings,
  session,
}: {
  initialListings: ClientListing[];
  session: Session | null;
}) {
  const { location, radiusKm } = useGlobalLocation();
  const [listings, setListings] = useState(initialListings);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ListingCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ClientListing | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search.trim()) params.set("search", search.trim());
    if (location) {
      params.set("lat", String(location.latitude));
      params.set("lng", String(location.longitude));
      params.set("radius", String(Math.min(Math.max(radiusKm || DEFAULT_RADIUS_KM, 1), MAX_RADIUS_KM)));
    }
    try {
      const res = await fetch(`/api/listings?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load listings");
      const data = await res.json();
      setListings(data.listings);
    } catch {
      // keep showing the previous results rather than clearing the grid
    } finally {
      setLoading(false);
    }
  }, [category, search, location, radiusKm]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchListings, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchListings]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search auction items, movers…"
          className="w-full flex-1 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
        />
        <select
          value={category ?? ""}
          onChange={(e) => setCategory((e.target.value || null) as ListingCategory | null)}
          aria-label="Filter by category"
          className="w-full shrink-0 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 sm:w-auto"
        >
          <option value="">All categories</option>
          {LISTING_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col items-start gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">Pick a location above and see items and offers around you.</p>
        <Link
          href="/post"
          className="shrink-0 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Post an item
        </Link>
      </div>

      <ItemGrid listings={listings} onSelect={setSelected} loading={loading} />

      {selected && <ItemDetailModal listing={selected} session={session} onClose={() => setSelected(null)} />}
    </div>
  );
}
