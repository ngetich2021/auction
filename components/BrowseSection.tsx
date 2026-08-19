"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "next-auth";
import { LocationPicker } from "@/components/LocationPicker";
import { ItemGrid } from "@/components/ItemGrid";
import { ItemDetailModal } from "@/components/ItemDetailModal";
import { CATEGORY_LABELS, LISTING_CATEGORIES } from "@/lib/validations/listing";
import type { ClientListing, ListingCategory } from "@/types/listing";
import type { LatLng } from "@/components/map/LeafletMap";

export function BrowseSection({
  initialListings,
  initialTotal,
  session,
}: {
  initialListings: ClientListing[];
  initialTotal: number;
  session: Session | null;
}) {
  const [listings, setListings] = useState(initialListings);
  const [total, setTotal] = useState(initialTotal);
  const [location, setLocation] = useState<LatLng | null>(null);
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
      params.set("radius", "25");
    }
    try {
      const res = await fetch(`/api/listings?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load listings");
      const data = await res.json();
      setListings(data.listings);
      setTotal(data.total);
    } catch {
      // keep showing the previous results rather than clearing the grid
    } finally {
      setLoading(false);
    }
  }, [category, search, location]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchListings, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchListings]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-zinc-900 dark:border-zinc-100 px-4 py-3">
        <LocationPicker
          location={location}
          onChange={setLocation}
          mapSubtitle="or find items near you"
          allowClear
        />
      </div>

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

      <p className="px-4 py-3 text-xs text-zinc-500">{total.toLocaleString()} available items</p>

      {location ? (
        <ItemGrid listings={listings} onSelect={setSelected} loading={loading} />
      ) : (
        <p className="px-4 py-10 text-center text-sm text-zinc-500">
          Set your location above to browse items near you.
        </p>
      )}

      {selected && <ItemDetailModal listing={selected} session={session} onClose={() => setSelected(null)} />}
    </div>
  );
}
