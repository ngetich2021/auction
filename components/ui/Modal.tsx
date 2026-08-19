"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function Modal({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  const router = useRouter();
  const close = onClose ?? (() => router.back());

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={close}
    >
      <div
        className="flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-white dark:bg-zinc-900 sm:max-w-2xl sm:rounded-2xl"
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
