"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { LatLng } from "@/components/map/LeafletMap";

export const DEFAULT_RADIUS_KM = 25;
export const MAX_RADIUS_KM = 500;

type GlobalLocationContextValue = {
  location: LatLng | null;
  setLocation: (location: LatLng | null) => void;
  radiusKm: number;
  setRadiusKm: (radiusKm: number) => void;
};

const GlobalLocationContext = createContext<GlobalLocationContextValue | null>(null);

// Lives in the (shell) layout, above the NavBar, so the chosen location persists as the user
// navigates between Browse/Offers/Movers/Eateries instead of being re-picked on every page.
export function GlobalLocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);

  return (
    <GlobalLocationContext.Provider value={{ location, setLocation, radiusKm, setRadiusKm }}>
      {children}
    </GlobalLocationContext.Provider>
  );
}

export function useGlobalLocation() {
  const ctx = useContext(GlobalLocationContext);
  if (!ctx) {
    throw new Error("useGlobalLocation must be used within a GlobalLocationProvider");
  }
  return ctx;
}
