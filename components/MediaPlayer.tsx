"use client";

import { useEffect, useRef, useState } from "react";
import { extractYoutubeId } from "@/lib/validations/advertisement";
import { CATEGORY_LABELS, type LISTING_CATEGORIES } from "@/lib/validations/listing";

export type PromoVideo = {
  id: string;
  number: number;
  title: string;
  videoUrl: string;
  videoSource: "YOUTUBE" | "UPLOAD";
  listingId?: string;
  price?: number;
  category?: (typeof LISTING_CATEGORIES)[number];
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

const EXAMPLE_VIDEO: PromoVideo = {
  id: "example",
  number: 1,
  title: "Example",
  videoUrl: "https://www.youtube.com/watch?v=Mlj6jhdGZxk",
  videoSource: "YOUTUBE",
};

export function MediaPlayer({ videos }: { videos: PromoVideo[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const [interacted, setInteracted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (interacted) return;
    function handleClick() {
      setInteracted(true);
      if (videoRef.current) videoRef.current.muted = false;
      videoRef.current?.play().catch(() => {});
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

  const playlist = videos.length > 0 ? videos : [EXAMPLE_VIDEO];
  const index = Math.min(activeIndex, playlist.length - 1);
  const active = playlist[index];
  const loopSingle = playlist.length === 1;
  const embedUrl =
    active.videoSource === "YOUTUBE" ? youtubeEmbedUrl(active.videoUrl, interacted, loopSingle) : null;
  const failed = failedIds.has(active.id) || (active.videoSource === "YOUTUBE" && !embedUrl);

  function markFailed(id: string) {
    setFailedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  function advance() {
    setActiveIndex((i) => (i + 1) % playlist.length);
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

  return (
    <div className="mx-auto flex w-2/5 flex-col">
      <div className="relative aspect-32/9 w-full bg-black">
        {failed ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-white/80">
            <span className="text-2xl font-semibold">#{active.number}</span>
            <span className="text-sm">Video {active.number} failed to load</span>
          </div>
        ) : active.videoSource === "YOUTUBE" ? (
          <iframe
            key={active.id}
            ref={iframeRef}
            src={embedUrl!}
            title={active.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
            onError={() => markFailed(active.id)}
          />
        ) : (
          <video
            key={active.id}
            ref={videoRef}
            src={active.videoUrl}
            autoPlay={interacted}
            loop={loopSingle}
            controls
            className="h-full w-full"
            onEnded={loopSingle ? undefined : advance}
            onError={() => markFailed(active.id)}
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="py-2 text-center text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        Interested? View details →
      </button>

      {playlist.length > 1 && (
        <div className="flex flex-wrap justify-center gap-1.5 pb-2">
          {playlist.map((video, i) => (
            <button
              key={video.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Play video ${video.number}`}
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                i === index
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : failedIds.has(video.id)
                    ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300"
                    : "bg-zinc-100 dark:bg-zinc-800"
              }`}
            >
              {video.number}
            </button>
          ))}
        </div>
      )}

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
              <p className="text-sm font-semibold">{active.title}</p>
              {active.category && <p className="text-xs text-zinc-500">{CATEGORY_LABELS[active.category]}</p>}
              {typeof active.price === "number" && (
                <p className="text-sm font-medium">KES {active.price.toLocaleString()}</p>
              )}
              {!active.listingId && <p className="text-xs text-zinc-400">Example promotional video.</p>}
            </div>

            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="self-end rounded-full bg-zinc-100 dark:bg-zinc-800 px-4 py-1.5 text-xs font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
