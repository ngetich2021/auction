"use client";

import Image from "next/image";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Session } from "next-auth";

export function ProfileMenu({ user }: { user: NonNullable<Session["user"]> }) {
  const [open, setOpen] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="block"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? "Account"}
            width={28}
            height={28}
            className="rounded-full"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 text-xs font-medium">
            {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1 text-sm shadow-lg">
          {(user.name || user.email) && (
            <div className="truncate px-3 py-2 text-xs text-zinc-500">{user.name ?? user.email}</div>
          )}
          <button
            type="button"
            onClick={() => startSignOut(() => signOut({ redirectTo: "/" }))}
            disabled={signingOut}
            className="w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
