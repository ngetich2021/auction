"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import type { ClientOffer } from "@/types/offer";
import { CallButton } from "@/components/ui/CallButton";

export function OfferCard({ offer }: { offer: ClientOffer }) {
  const digitsOnly = offer.phone.replace(/\D/g, "");
  const expiresAt = offer.expiresAt ? new Date(offer.expiresAt) : null;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-800">
        <Image
          src={offer.image}
          alt={offer.title}
          fill
          sizes="(min-width: 640px) 33vw, 100vw"
          className="object-cover"
        />
        {offer.discount && (
          <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-1 text-xs font-semibold text-white">
            {offer.discount}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{offer.title}</h3>
          {offer.distanceKm != null && <span className="text-xs text-zinc-400">{offer.distanceKm.toFixed(1)} km</span>}
        </div>
        <p className="flex items-center gap-1 text-xs text-zinc-500">
          {offer.shopName}
          {offer.badge && <Star className="size-3 shrink-0 fill-blue-500 text-blue-500" aria-label="Blue star badge" />}
        </p>
        {offer.description && <p className="line-clamp-2 text-xs text-zinc-500">{offer.description}</p>}
        {offer.address && <p className="text-xs text-zinc-400">{offer.address}</p>}
        {expiresAt && (
          <p className="text-xs text-zinc-400">Ends {expiresAt.toLocaleDateString()}</p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-1">
          <CallButton
            phone={offer.phone}
            className="flex-1 rounded-full bg-zinc-900 px-3 py-1.5 text-center text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          />
          <a
            href={`https://wa.me/${digitsOnly}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
