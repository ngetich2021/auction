"use client";

import { LocationPicker } from "@/components/LocationPicker";
import { useGlobalLocation, MAX_RADIUS_KM } from "@/components/GlobalLocationProvider";

export function GlobalLocationBar() {
  const { location, setLocation, radiusKm, setRadiusKm } = useGlobalLocation();

  return (
    <div className="border-b border-zinc-900 dark:border-zinc-100 px-4 py-3">
      <LocationPicker location={location} onChange={setLocation} mapSubtitle="or find things near you" allowClear />
      {location && (
        <label className="mt-2 flex items-center gap-2 text-sm">
          Search radius
          <input
            type="number"
            min={1}
            max={MAX_RADIUS_KM}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="w-20 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          />
          km
        </label>
      )}
    </div>
  );
}
