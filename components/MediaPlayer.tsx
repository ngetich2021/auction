"use client";

import { useEffect, useRef, useState } from "react";
import type { Session } from "next-auth";
import { extractYoutubeId } from "@/lib/validations/advertisement";
import { haversineKm } from "@/lib/geo";
import { ItemDetailModal } from "@/components/ItemDetailModal";
import { CATEGORY_LABELS } from "@/lib/validations/listing";
import type { ClientListing } from "@/types/listing";

export type PromoVideo = {
  id: string;
  number: number;
  videoUrl: string;
  listing: ClientListing;
};

function youtubeEmbedUrl(url: string, autoplay: boolean, loopSingle: boolean): string | null {
  const id = extractYoutubeId(url);
  if (!id) return null;
  const params = new URLSearchParams({ playsinline: "1", enablejsapi: "1" });
  if (autoplay) params.set("autoplay", "1");
  if (loopSingle) {
    // a single YouTube video only loops when `playlist` names itself alongside `loop=1`
    params.set("loop", "1");
    params.set("playlist", id);
  }
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

function sendYoutubeCommand(iframe: HTMLIFrameElement | null, func: string) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
}

export function MediaPlayer({ videos, session }: { videos: PromoVideo[]; session: Session | null }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const [interacted, setInteracted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (interacted) return;
    function handleClick() {
      setInteracted(true);
      // the YouTube iframe reloads with autoplay=1 in response to this same click, so a
      // brief delay lets it attach its postMessage listener before we force it unmuted
      setTimeout(() => {
        sendYoutubeCommand(iframeRef.current, "unMute");
        sendYoutubeCommand(iframeRef.current, "playVideo");
      }, 500);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [interacted]);

  const playlist = videos;
  const index = Math.min(activeIndex, playlist.length - 1);
  const active = playlist[index];
  const loopSingle = playlist.length === 1;
  const embedUrl = active ? youtubeEmbedUrl(active.videoUrl, interacted, loopSingle) : null;
  const failed = active ? failedIds.has(active.id) || !embedUrl : false;

  function nextIndexSkippingFailed(fromIndex: number, failed: Set<string>): number {
    for (let step = 1; step <= playlist.length; step++) {
      const next = (fromIndex + step) % playlist.length;
      if (!failed.has(playlist[next].id)) return next;
    }
    return fromIndex;
  }

  function markFailed(id: string) {
    if (failedIds.has(id)) return;
    const updated = new Set(failedIds).add(id);
    setFailedIds(updated);
    // Skip permanently past a video that failed instead of getting stuck on its error screen.
    setActiveIndex((i) => nextIndexSkippingFailed(i, updated));
  }

  function advance() {
    setActiveIndex((i) => nextIndexSkippingFailed(i, failedIds));
  }

  // YouTube's iframe posts player-state changes once enablejsapi is set; state 0 means the
  // video ended, so advance to the next one in the playlist (a lone video self-loops via
  // the loop/playlist params instead).
  useEffect(() => {
    if (playlist.length <= 1) return;
    function handleMessage(e: MessageEvent) {
      if (e.origin !== "https://www.youtube.com") return;
      if (typeof e.data !== "string") return;
      let data: unknown;
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }
      if (!data || typeof data !== "object") return;
      const info = (data as { info?: unknown }).info;
      const state = typeof info === "number" ? info : (info as { playerState?: number } | undefined)?.playerState;
      if (state === 0) advance();
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist.length]);

  function handleOpenDetails() {
    setExpanded(true);
    if (userLocation || locating || !navigator.geolocation) return;
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError("Enable location access to see how far this item is.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const distanceKm =
    active && userLocation
      ? haversineKm(userLocation.latitude, userLocation.longitude, active.listing.latitude, active.listing.longitude)
      : null;

  if (playlist.length === 0) {
    return (
      <div className="mx-auto flex w-full flex-col sm:w-11/12 md:w-4/5 lg:w-3/5">
        <div className="flex aspect-3/1 w-full items-center justify-center bg-black text-sm text-white/60 sm:aspect-7/2 md:aspect-4/1 lg:aspect-32/9">
          No promo videos are live right now.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full flex-col sm:w-11/12 md:w-4/5 lg:w-3/5">
      <div className="relative aspect-3/1 w-full bg-black sm:aspect-7/2 md:aspect-4/1 lg:aspect-32/9">
        {failed ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-white/80">
            <span className="text-2xl font-semibold">#{active.number}</span>
            <span className="text-sm">Video {active.number} failed to load</span>
          </div>
        ) : (
          <iframe
            key={active.id}
            ref={iframeRef}
            src={embedUrl!}
            title={active.listing.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
            onError={() => markFailed(active.id)}
          />
        )}
      </div>

      <button
        type="button"
        onClick={handleOpenDetails}
        className="py-2 text-center text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        Interested? View details →
      </button>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="flex w-full max-w-md flex-col gap-3 rounded-2xl bg-white dark:bg-zinc-900 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold">{active.listing.title}</p>
              <p className="text-xs text-zinc-500">{CATEGORY_LABELS[active.listing.category]}</p>
              <p className="text-sm font-medium">KES {active.listing.price.toLocaleString()}</p>
              {active.listing.address && <p className="text-xs text-zinc-500">{active.listing.address}</p>}
              {distanceKm != null && (
                <p className="text-xs text-zinc-500">{distanceKm.toFixed(1)} km from you</p>
              )}
              {locating && <p className="text-xs text-zinc-400">Finding your location…</p>}
              {locationError && !locating && <p className="text-xs text-zinc-400">{locationError}</p>}
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowFullDetails(true)}
                className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                More details
              </button>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-4 py-1.5 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showFullDetails && (
        <ItemDetailModal
          listing={{ ...active.listing, distanceKm }}
          session={session}
          onClose={() => setShowFullDetails(false)}
        />
      )}
    </div>
  );
}
