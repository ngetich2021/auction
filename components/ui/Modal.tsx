"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function Modal({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  const router = useRouter();
  const close = onClose ?? (() => router.back());

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 sm:items-center sm:p-4"
      onClick={close}
    >
      <div
        className="flex max-h-[85dvh] min-h-0 w-full flex-col overflow-y-auto overscroll-contain rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] dark:bg-zinc-900 sm:max-h-[90dvh] sm:max-w-2xl sm:rounded-2xl"
        style={{ touchAction: "pan-y" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex justify-end border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            Close ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
