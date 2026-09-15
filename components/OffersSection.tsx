"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "next-auth";
import { OfferCard } from "@/components/OfferCard";
import { OfferForm } from "@/components/OfferForm";
import { MyOffers } from "@/components/MyOffers";
import { Modal } from "@/components/ui/Modal";
import { SignInPrompt } from "@/components/ui/SignInPrompt";
import { useGlobalLocation, DEFAULT_RADIUS_KM, MAX_RADIUS_KM } from "@/components/GlobalLocationProvider";
import type { ClientOffer } from "@/types/offer";

export function OffersSection({
  session,
  initialOffers,
  myOffers,
}: {
  session: Session | null;
  initialOffers: ClientOffer[];
  myOffers: ClientOffer[];
}) {
  const { location, radiusKm } = useGlobalLocation();
  const [offers, setOffers] = useState(initialOffers);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (location) {
      params.set("lat", String(location.latitude));
      params.set("lng", String(location.longitude));
      params.set("radius", String(Math.min(Math.max(radiusKm || DEFAULT_RADIUS_KM, 1), MAX_RADIUS_KM)));
    }
    try {
      const res = await fetch(`/api/offers?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load offers");
      const data = await res.json();
      setOffers(data.offers);
    } catch {
      // keep showing the previous results rather than clearing the grid
    } finally {
      setLoading(false);
    }
  }, [location, radiusKm]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchOffers, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchOffers]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h2 className="text-base font-semibold">Offers</h2>
        <p className="text-sm text-zinc-500">Deals and promotions from shops near you — call or message the shop directly.</p>
      </div>

      {session ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-zinc-400">
            Free listings show to shoppers within 500m of them. Look for the <span className="text-blue-500">★</span> blue
            star badge (KES 25) for shops visible at any distance.
          </p>
          {!formOpen ? (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Announce an offer
            </button>
          ) : (
            <Modal onClose={() => setFormOpen(false)}>
              <OfferForm defaultPhone={session.user.phone ?? ""} />
            </Modal>
          )}
        </div>
      ) : (
        <SignInPrompt message="Sign in to announce an offer for your shop." />
      )}

      {loading ? (
        <p className="py-4 text-center text-sm text-zinc-500">Loading offers…</p>
      ) : offers.length === 0 ? (
        <p className="py-4 text-center text-sm text-zinc-500">No offers announced near you yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      )}

      {session && (
        <div className="flex flex-col gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <h3 className="text-sm font-semibold">My offers</h3>
          <MyOffers offers={myOffers} />
        </div>
      )}
    </div>
  );
}
