"use client";

import { useState } from "react";
import Image from "next/image";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Star } from "lucide-react";
import { useSingleFlightAction } from "@/hooks/useSingleFlightAction";
import { setMoverActive, deleteMover, payForMoverBadge, reactivateMover } from "@/lib/actions/movers";
import { getFreshness } from "@/lib/staleness";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/Modal";
import { MoverForm } from "@/components/MoverForm";
import { BadgeUpgradeMenuItem } from "@/components/ui/BadgeUpgrade";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ClientMover } from "@/types/mover";

function MoverRowActions({ mover }: { mover: ClientMover }) {
  const [toggleState, toggleAction, togglePending] = useSingleFlightAction(setMoverActive);
  const [deleteState, deleteAction, deletePending] = useSingleFlightAction(deleteMover);
  const [reactivateState, reactivateAction, reactivatePending] = useSingleFlightAction(reactivateMover);
  const [editing, setEditing] = useState(false);

  function toggleActive() {
    const formData = new FormData();
    formData.set("moverId", mover.id);
    formData.set("active", mover.active ? "false" : "true");
    toggleAction(formData);
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${mover.vehicleType}"? This cannot be undone.`)) return;
    const formData = new FormData();
    formData.set("moverId", mover.id);
    deleteAction(formData);
  }

  function reactivate() {
    const formData = new FormData();
    formData.set("moverId", mover.id);
    reactivateAction(formData);
  }

  const message = toggleState?.message ?? deleteState?.message ?? reactivateState?.message;
  const ok = toggleState?.ok ?? deleteState?.ok ?? reactivateState?.ok;

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" disabled={togglePending || deletePending || reactivatePending}>
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditing(true)}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={toggleActive}>{mover.active ? "Hide" : "Show"}</DropdownMenuItem>
          <DropdownMenuItem onClick={reactivate}>Reactivate</DropdownMenuItem>
          {!mover.badge && (
            <BadgeUpgradeMenuItem
              idField="moverId"
              idValue={mover.id}
              defaultPhone={mover.phone}
              payAction={payForMoverBadge}
              statusUrl={`/api/movers/${mover.id}/badge-status`}
            />
          )}
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {message && (
        <p
          role={ok ? "status" : "alert"}
          className={`text-xs ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
        >
          {message}
        </p>
      )}
      {editing && (
        <Modal onClose={() => setEditing(false)}>
          <MoverForm defaultPhone={mover.phone} mover={mover} />
        </Modal>
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
        <span className="line-clamp-1 flex items-center gap-1">
          {row.original.vehicleType}
          {row.original.badge && <Star className="size-3.5 shrink-0 fill-blue-500 text-blue-500" />}
        </span>
      </div>
    ),
  },
  { accessorKey: "phone", header: "Phone" },
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => {
      const { stale, daysLeft } = getFreshness(row.original.activatedAt);
      return (
        <div className="flex flex-col text-xs">
          <span>{row.original.active ? "Visible" : "Hidden"}</span>
          <span className={stale ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}>
            {stale ? "Stale — reactivate to show" : `Reactivate within ${daysLeft}d`}
          </span>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <MoverRowActions mover={row.original} />
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
