"use client";

import Image from "next/image";
import type { Session } from "next-auth";
import { CATEGORY_LABELS } from "@/lib/validations/listing";
import type { ClientListing } from "@/types/listing";

export function ItemDetailModal({
  listing,
  session,
  onClose,
}: {
  listing: ClientListing;
  session: Session | null;
  onClose: () => void;
}) {
  const isOwner = session?.user?.id === listing.sellerId;
  const soldOut = listing.status !== "AVAILABLE";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-white dark:bg-zinc-900 sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
          <span className="text-xs uppercase tracking-wide text-zinc-400">{CATEGORY_LABELS[listing.category]}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        {listing.images.length > 0 && (
          <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-800">
            <Image src={listing.images[0]} alt={listing.title} fill sizes="600px" className="object-cover" />
          </div>
        )}

        <div className="flex flex-col gap-3 p-4">
          <h2 className="text-lg font-semibold">{listing.title}</h2>
          <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">{listing.description}</p>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">KES {listing.price.toLocaleString()}</span>
            <span className="text-zinc-400">{listing.quantity} available</span>
          </div>
          {listing.address && <p className="text-xs text-zinc-400">{listing.address}</p>}

          {soldOut && (
            <p className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-500">
              This listing is no longer available.
            </p>
          )}

          {!soldOut && isOwner && (
            <p className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-500">
              This is your own listing.
            </p>
          )}

          {!soldOut && !isOwner && (
            <>
              {listing.phone ? (
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${listing.phone}`}
                    className="flex-1 rounded-full bg-zinc-900 px-4 py-2 text-center text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    Call {listing.phone}
                  </a>
                  <a
                    href={`https://wa.me/${listing.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white"
                  >
                    WhatsApp
                  </a>
                </div>
              ) : (
                <p className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-500">
                  The seller has not shared a contact number for this listing.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
