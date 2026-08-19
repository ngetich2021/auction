"use client";

import Image from "next/image";
import { useSingleFlightAction } from "@/hooks/useSingleFlightAction";
import { setMoverActive } from "@/lib/actions/movers";
import type { ClientMover } from "@/types/mover";

function MoverRow({ mover }: { mover: ClientMover }) {
  const [state, formAction, pending] = useSingleFlightAction(setMoverActive);

  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 align-top">
      <td className="flex items-center gap-2 py-2 pr-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Image src={mover.image} alt="" fill className="object-cover" />
        </div>
        <span className="line-clamp-1 text-sm">{mover.vehicleType}</span>
      </td>
      <td className="py-2 pr-3 text-xs text-zinc-400">{mover.phone}</td>
      <td className="py-2 pr-3 text-xs">{mover.active ? "Visible" : "Hidden"}</td>
      <td className="py-2">
        <form action={formAction} className="flex gap-1">
          <input type="hidden" name="moverId" value={mover.id} />
          <button
            name="active"
            value={mover.active ? "false" : "true"}
            disabled={pending}
            className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-xs disabled:opacity-50"
          >
            {pending ? "Saving…" : mover.active ? "Hide" : "Show"}
          </button>
        </form>
        {state?.message && (
          <p
            role={state.ok ? "status" : "alert"}
            className={`mt-1 text-xs ${state.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
          >
            {state.message}
          </p>
        )}
      </td>
    </tr>
  );
}

export function MyMovers({ movers }: { movers: ClientMover[] }) {
  if (movers.length === 0) {
    return <p className="text-sm text-zinc-500">You have not listed any vehicles yet.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase text-zinc-400">
            <th className="px-3 py-2">Vehicle</th>
            <th className="px-3 py-2">Phone</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {movers.map((mover) => (
            <MoverRow key={mover.id} mover={mover} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
