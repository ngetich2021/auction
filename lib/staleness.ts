import { STALE_AFTER_DAYS } from "@/lib/validations/staleness";

const DAY_MS = 24 * 60 * 60 * 1000;

// Client-safe (no "server-only") — used by both server-rendered admin tables and "My X" client
// components to show owners why an item might not be showing up in Browse.
export function getFreshness(activatedAt: string | Date): { stale: boolean; daysLeft: number } {
  const msLeft = new Date(activatedAt).getTime() + STALE_AFTER_DAYS * DAY_MS - Date.now();
  return { stale: msLeft <= 0, daysLeft: Math.ceil(msLeft / DAY_MS) };
}
