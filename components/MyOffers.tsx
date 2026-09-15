"use client";

import { useState } from "react";
import Image from "next/image";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Star } from "lucide-react";
import { useSingleFlightAction } from "@/hooks/useSingleFlightAction";
import { setOfferActive, deleteOffer, payForOfferBadge, reactivateOffer } from "@/lib/actions/offers";
import { getFreshness } from "@/lib/staleness";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/Modal";
import { OfferForm } from "@/components/OfferForm";
import { BadgeUpgradeMenuItem } from "@/components/ui/BadgeUpgrade";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ClientOffer } from "@/types/offer";

function OfferRowActions({ offer }: { offer: ClientOffer }) {
  const [toggleState, toggleAction, togglePending] = useSingleFlightAction(setOfferActive);
  const [deleteState, deleteAction, deletePending] = useSingleFlightAction(deleteOffer);
  const [reactivateState, reactivateAction, reactivatePending] = useSingleFlightAction(reactivateOffer);
  const [editing, setEditing] = useState(false);

  function toggleActive() {
    const formData = new FormData();
    formData.set("offerId", offer.id);
    formData.set("active", offer.active ? "false" : "true");
    toggleAction(formData);
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${offer.title}"? This cannot be undone.`)) return;
    const formData = new FormData();
    formData.set("offerId", offer.id);
    deleteAction(formData);
  }

  function reactivate() {
    const formData = new FormData();
    formData.set("offerId", offer.id);
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
          <DropdownMenuItem onClick={toggleActive}>{offer.active ? "Hide" : "Show"}</DropdownMenuItem>
          <DropdownMenuItem onClick={reactivate}>Reactivate</DropdownMenuItem>
          {!offer.badge && (
            <BadgeUpgradeMenuItem
              idField="offerId"
              idValue={offer.id}
              defaultPhone={offer.phone}
              payAction={payForOfferBadge}
              statusUrl={`/api/offers/${offer.id}/badge-status`}
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
          <OfferForm defaultPhone={offer.phone} offer={offer} />
        </Modal>
      )}
    </div>
  );
}

const columns: ColumnDef<ClientOffer>[] = [
  {
    accessorKey: "title",
    header: "Offer",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Image src={row.original.image} alt="" fill className="object-cover" />
        </div>
        <div className="flex flex-col">
          <span className="line-clamp-1 flex items-center gap-1">
            {row.original.title}
            {row.original.badge && <Star className="size-3.5 shrink-0 fill-blue-500 text-blue-500" />}
          </span>
          <span className="text-xs text-zinc-500">{row.original.shopName}</span>
        </div>
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
        <OfferRowActions offer={row.original} />
      </div>
    ),
  },
];

export function MyOffers({ offers }: { offers: ClientOffer[] }) {
  return (
    <DataTable
      columns={columns}
      data={offers}
      filterColumnId="title"
      filterPlaceholder="Filter by offer…"
      emptyMessage="You have not announced any offers yet."
      enableRowSelection={false}
      exportFilename="my-offers"
    />
  );
}
