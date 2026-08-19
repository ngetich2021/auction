"use client";

import Image from "next/image";
import type { ClientMover } from "@/types/mover";

export function MoverCard({ mover }: { mover: ClientMover }) {
  const digitsOnly = mover.phone.replace(/\D/g, "");

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-800">
        <Image
          src={mover.image}
          alt={mover.vehicleType}
          fill
          sizes="(min-width: 640px) 33vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{mover.vehicleType}</h3>
          {mover.distanceKm != null && <span className="text-xs text-zinc-400">{mover.distanceKm.toFixed(1)} km</span>}
        </div>
        <p className="text-xs text-zinc-500">{mover.owner.name ?? "Mover"}</p>
        {mover.description && <p className="line-clamp-2 text-xs text-zinc-500">{mover.description}</p>}
        {mover.address && <p className="text-xs text-zinc-400">{mover.address}</p>}
        <div className="mt-auto flex items-center gap-2 pt-1">
          <a
            href={`tel:${mover.phone}`}
            className="flex-1 rounded-full bg-zinc-900 px-3 py-1.5 text-center text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Call {mover.phone}
          </a>
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
