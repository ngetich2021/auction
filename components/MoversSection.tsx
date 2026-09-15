"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "next-auth";
import { MoverCard } from "@/components/MoverCard";
import { MoverForm } from "@/components/MoverForm";
import { MyMovers } from "@/components/MyMovers";
import { Modal } from "@/components/ui/Modal";
import { SignInPrompt } from "@/components/ui/SignInPrompt";
import { useGlobalLocation, DEFAULT_RADIUS_KM, MAX_RADIUS_KM } from "@/components/GlobalLocationProvider";
import type { ClientMover } from "@/types/mover";

export function MoversSection({
  session,
  initialMovers,
  myMovers,
}: {
  session: Session | null;
  initialMovers: ClientMover[];
  myMovers: ClientMover[];
}) {
  const { location, radiusKm } = useGlobalLocation();
  const [movers, setMovers] = useState(initialMovers);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMovers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (location) {
      params.set("lat", String(location.latitude));
      params.set("lng", String(location.longitude));
      params.set("radius", String(Math.min(Math.max(radiusKm || DEFAULT_RADIUS_KM, 1), MAX_RADIUS_KM)));
    }
    try {
      const res = await fetch(`/api/movers?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load movers");
      const data = await res.json();
      setMovers(data.movers);
    } catch {
      // keep showing the previous results rather than clearing the grid
    } finally {
      setLoading(false);
    }
  }, [location, radiusKm]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchMovers, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchMovers]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h2 className="text-base font-semibold">Movers</h2>
        <p className="text-sm text-zinc-500">Trucks and vehicles for moving items — call or message the owner directly.</p>
      </div>

      {session ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-zinc-400">
            Free listings show to clients within 500m of them. Look for the <span className="text-blue-500">★</span> blue
            star badge (KES 25) for vehicles visible at any distance.
          </p>
          {!formOpen ? (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              List your vehicle
            </button>
          ) : (
            <Modal onClose={() => setFormOpen(false)}>
              <MoverForm defaultPhone={session.user.phone ?? ""} />
            </Modal>
          )}
        </div>
      ) : (
        <SignInPrompt message="Sign in to list your moving vehicle." />
      )}

      {loading ? (
        <p className="py-4 text-center text-sm text-zinc-500">Loading movers…</p>
      ) : movers.length === 0 ? (
        <p className="py-4 text-center text-sm text-zinc-500">No movers listed near you yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {movers.map((mover) => (
            <MoverCard key={mover.id} mover={mover} />
          ))}
        </div>
      )}

      {session && (
        <div className="flex flex-col gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <h3 className="text-sm font-semibold">My vehicles</h3>
          <MyMovers movers={myMovers} />
        </div>
      )}
    </div>
  );
}
