"use client";

import { useEffect, useRef, useState } from "react";
import { MapPickerModal } from "@/components/map/MapPickerModal";
import type { LatLng } from "@/components/map/LeafletMap";

type GeocodeResult = { label: string; latitude: number; longitude: number };

export function LocationPicker({
  location,
  onChange,
  mapSubtitle,
  allowClear = false,
  address,
  onAddressChange,
}: {
  location: LatLng | null;
  onChange: (loc: LatLng | null) => void;
  mapSubtitle?: string;
  allowClear?: boolean;
  address?: string;
  onAddressChange?: (address: string) => void;
}) {
  const [mapOpen, setMapOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const skipNextSearch = useRef(false);

  const showAddressField = address !== undefined && !!onAddressChange;

  useEffect(() => {
    if (!showAddressField) return;
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const query = address?.trim() ?? "";
    if (query.length < 3) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: { results?: GeocodeResult[] }) => {
          setSuggestions(data.results ?? []);
          setShowSuggestions(true);
        })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [address, showAddressField]);

  const trimmedAddressLength = address?.trim().length ?? 0;

  async function reverseGeocode(coords: LatLng) {
    if (!onAddressChange) return;
    try {
      const res = await fetch(`/api/geocode?lat=${coords.latitude}&lon=${coords.longitude}`);
      const data: { label?: string | null } = await res.json();
      if (data.label) {
        skipNextSearch.current = true;
        onAddressChange(data.label);
      }
    } catch {
      // keep whatever address text is already there
    }
  }

  function handleSelectSuggestion(result: GeocodeResult) {
    skipNextSearch.current = true;
    onAddressChange?.(result.label);
    onChange({ latitude: result.latitude, longitude: result.longitude });
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function handleAutoPick() {
    if (!navigator.geolocation) {
      setError("Your browser does not support location detection.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        onChange(coords);
        setLocating(false);
        reverseGeocode(coords);
      },
      () => {
        setError("Could not detect your current location. Try using the map instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={handleAutoPick}
          disabled={locating}
          className="flex items-center gap-1.5 font-semibold disabled:opacity-50"
        >
          📍 {locating ? "Locating…" : "Auto pick"}
        </button>
        <span className="text-zinc-400">or</span>
        <button
          type="button"
          onClick={() => setMapOpen(true)}
          className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-4 py-1.5 text-zinc-500 dark:text-zinc-400"
        >
          {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : "Enter coordinates"}
        </button>
        {allowClear && location && (
          <button type="button" onClick={() => onChange(null)} className="text-xs text-zinc-400 hover:text-red-600">
            Clear
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {showAddressField && (
        <div className="relative">
          <input
            name="address"
            value={address}
            maxLength={200}
            autoComplete="off"
            placeholder="Start typing an address…"
            onChange={(e) => onAddressChange?.(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          />
          {searching && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
              Searching…
            </span>
          )}
          {showSuggestions && trimmedAddressLength >= 3 && suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm shadow-lg">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectSuggestion(s)}
                    className="block w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <MapPickerModal
        open={mapOpen}
        initial={location}
        subtitle={mapSubtitle}
        onConfirm={(coords) => {
          onChange(coords);
          setMapOpen(false);
          reverseGeocode(coords);
        }}
        onClose={() => setMapOpen(false)}
      />
    </div>
  );
}
