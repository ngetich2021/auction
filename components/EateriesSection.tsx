"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "next-auth";
import { EateryCard } from "@/components/EateryCard";
import { EateryForm } from "@/components/EateryForm";
import { MyEateries } from "@/components/MyEateries";
import { Modal } from "@/components/ui/Modal";
import { SignInPrompt } from "@/components/ui/SignInPrompt";
import { useGlobalLocation, DEFAULT_RADIUS_KM, MAX_RADIUS_KM } from "@/components/GlobalLocationProvider";
import type { ClientEatery } from "@/types/eatery";

export function EateriesSection({
  session,
  initialEateries,
  myEateries,
}: {
  session: Session | null;
  initialEateries: ClientEatery[];
  myEateries: ClientEatery[];
}) {
  const { location, radiusKm } = useGlobalLocation();
  const [eateries, setEateries] = useState(initialEateries);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEateries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (location) {
      params.set("lat", String(location.latitude));
      params.set("lng", String(location.longitude));
      params.set("radius", String(Math.min(Math.max(radiusKm || DEFAULT_RADIUS_KM, 1), MAX_RADIUS_KM)));
    }
    try {
      const res = await fetch(`/api/eateries?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load eateries");
      const data = await res.json();
      setEateries(data.eateries);
    } catch {
      // keep showing the previous results rather than clearing the grid
    } finally {
      setLoading(false);
    }
  }, [location, radiusKm]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchEateries, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchEateries]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h2 className="text-base font-semibold">Eateries</h2>
        <p className="text-sm text-zinc-500">Foodstuff and eateries near you — call or message the seller directly.</p>
      </div>

      {session ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-zinc-400">
            Free listings show to shoppers within 500m of them. Look for the <span className="text-blue-500">★</span> blue
            star badge (KES 25) for eateries visible at any distance.
          </p>
          {!formOpen ? (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              List your eatery
            </button>
          ) : (
            <Modal onClose={() => setFormOpen(false)}>
              <EateryForm defaultPhone={session.user.phone ?? ""} />
            </Modal>
          )}
        </div>
      ) : (
        <SignInPrompt message="Sign in to list your eatery." />
      )}

      {loading ? (
        <p className="py-4 text-center text-sm text-zinc-500">Loading eateries…</p>
      ) : eateries.length === 0 ? (
        <p className="py-4 text-center text-sm text-zinc-500">No eateries listed near you yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {eateries.map((eatery) => (
            <EateryCard key={eatery.id} eatery={eatery} />
          ))}
        </div>
      )}

      {session && (
        <div className="flex flex-col gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <h3 className="text-sm font-semibold">My eateries</h3>
          <MyEateries eateries={myEateries} />
        </div>
      )}
    </div>
  );
}
