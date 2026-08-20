"use client";

import Image from "next/image";
import type { ColumnDef } from "@tanstack/react-table";
import { useSingleFlightAction } from "@/hooks/useSingleFlightAction";
import { setMoverActive } from "@/lib/actions/movers";
import { DataTable } from "@/components/ui/data-table";
import type { ClientMover } from "@/types/mover";

function ToggleActiveButton({ mover }: { mover: ClientMover }) {
  const [state, formAction, pending] = useSingleFlightAction(setMoverActive);
  return (
    <div className="flex flex-col items-end gap-1">
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
          className={`text-xs ${state.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}

const columns: ColumnDef<ClientMover>[] = [
  {
    accessorKey: "vehicleType",
    header: "Vehicle",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Image src={row.original.image} alt="" fill className="object-cover" />
        </div>
        <span className="line-clamp-1">{row.original.vehicleType}</span>
      </div>
    ),
  },
  { accessorKey: "phone", header: "Phone" },
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => <span className="text-xs">{row.original.active ? "Visible" : "Hidden"}</span>,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <ToggleActiveButton mover={row.original} />
      </div>
    ),
  },
];

export function MyMovers({ movers }: { movers: ClientMover[] }) {
  return (
    <DataTable
      columns={columns}
      data={movers}
      filterColumnId="vehicleType"
      filterPlaceholder="Filter by vehicle…"
      emptyMessage="You have not listed any vehicles yet."
      enableRowSelection={false}
      exportFilename="my-vehicles"
    />
  );
}
