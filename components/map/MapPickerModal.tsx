"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { LatLng } from "@/components/map/LeafletMap";

const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-zinc-500">Loading map…</div>
  ),
});

const DEFAULT_CENTER: LatLng = { latitude: -1.2921, longitude: 36.8219 };

export function MapPickerModal({
  open,
  initial,
  subtitle = "Tap the map, then drag the pin to fine-tune",
  onConfirm,
  onClose,
}: {
  open: boolean;
  initial: LatLng | null;
  subtitle?: string;
  onConfirm: (coords: LatLng) => void;
  onClose: () => void;
}) {
  const [wasOpen, setWasOpen] = useState(false);
  const [mapStyle, setMapStyle] = useState<"satellite" | "street">("satellite");
  const [position, setPosition] = useState<LatLng | null>(initial);
  const [center, setCenter] = useState<LatLng>(initial ?? DEFAULT_CENTER);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  if (open && !wasOpen) {
    setWasOpen(true);
    setPosition(initial);
    setCenter(initial ?? DEFAULT_CENTER);
    setLocateError(null);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  if (!open) return null;

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setLocateError("Your browser does not support location detection.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setPosition(next);
        setCenter(next);
        setLocating(false);
      },
      () => {
        setLocateError("Could not detect your location. Tap the map instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="flex h-[85vh] sm:h-[80vh] w-full sm:max-w-2xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-full border border-zinc-300 dark:border-zinc-700 text-xs font-medium">
              <button
                type="button"
                onClick={() => setMapStyle("satellite")}
                className={`px-3 py-1.5 ${
                  mapStyle === "satellite"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-white dark:bg-zinc-900"
                }`}
              >
                Satellite
              </button>
              <button
                type="button"
                onClick={() => setMapStyle("street")}
                className={`px-3 py-1.5 ${
                  mapStyle === "street"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-white dark:bg-zinc-900"
                }`}
              >
                Street
              </button>
            </div>
            <button
              type="button"
              onClick={() => position && onConfirm(position)}
              disabled={!position}
              className="rounded-full bg-zinc-200 dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              Confirm location
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close map"
              className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="relative flex-1">
          <LeafletMap center={center} position={position} mapStyle={mapStyle} onPick={setPosition} />
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={locating}
            className="absolute bottom-4 left-4 z-500 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-medium shadow-md disabled:opacity-50"
          >
            {locating ? "Locating…" : "📍 Use my location"}
          </button>
        </div>

        {locateError && (
          <p role="alert" className="px-4 py-2 text-xs text-red-600 dark:text-red-400">
            {locateError}
          </p>
        )}
        {!position && !locateError && (
          <p className="px-4 py-2 text-xs text-zinc-500">Tap the map to drop a pin before confirming.</p>
        )}
      </div>
    </div>
  );
}
