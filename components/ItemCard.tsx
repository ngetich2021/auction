"use client";

import Image from "next/image";
import { CATEGORY_LABELS } from "@/lib/validations/listing";
import type { ClientListing } from "@/types/listing";

export function ItemCard({ listing, onSelect }: { listing: ClientListing; onSelect: () => void }) {
  const cover = listing.images[0];

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-left transition hover:shadow-md"
    >
      <div className="relative aspect-square w-full bg-zinc-100 dark:bg-zinc-800">
        {cover ? (
          <Image
            src={cover}
            alt={listing.title}
            fill
            sizes="(min-width: 1536px) 10vw, (min-width: 1280px) 12vw, (min-width: 1024px) 16vw, (min-width: 768px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-400">No photo</div>
        )}
        {listing.isBoosted && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            Featured
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-[10px] uppercase tracking-wide text-zinc-400">{CATEGORY_LABELS[listing.category]}</span>
        <h3 className="line-clamp-2 text-sm font-medium">{listing.title}</h3>
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-sm font-semibold">KES {listing.price.toLocaleString()}</span>
          {listing.distanceKm != null && (
            <span className="text-xs text-zinc-400">{listing.distanceKm.toFixed(1)} km</span>
          )}
        </div>
      </div>
    </button>
  );
}
