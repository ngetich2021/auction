"use client";

import { useState } from "react";
import type { ClientListing } from "@/types/listing";
import { ItemCard } from "@/components/ItemCard";

const PAGE_STEPS = [5, 10] as const;

export function ItemGrid({
  listings,
  onSelect,
  loading,
}: {
  listings: ClientListing[];
  onSelect: (listing: ClientListing) => void;
  loading?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [trackedListings, setTrackedListings] = useState(listings);

  if (listings !== trackedListings) {
    setTrackedListings(listings);
    setStep(0);
  }

  if (loading) {
    return <p className="px-4 py-10 text-center text-sm text-zinc-500">Loading listings…</p>;
  }
  if (listings.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-zinc-500">No listings match your search yet.</p>;
  }

  const visibleCount = step < PAGE_STEPS.length ? PAGE_STEPS[step] : listings.length;
  const visible = listings.slice(0, visibleCount);
  const hasMore = visibleCount < listings.length;
  const nextLabel = step === 0 ? `Show 10` : "Show all";

  return (
    <div className="flex flex-col gap-3 pb-4">
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
        {visible.map((listing) => (
          <ItemCard key={listing.id} listing={listing} onSelect={() => onSelect(listing)} />
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setStep((s) => s + 1)}
          className="mx-4 rounded-full border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {nextLabel}
        </button>
      )}
    </div>
  );
}
