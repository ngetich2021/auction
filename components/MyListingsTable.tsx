"use client";

import { useState } from "react";
import Image from "next/image";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Loader2, MoreHorizontal, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/Modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/ui/data-table";
import { BadgeUpgradeMenuItem } from "@/components/ui/BadgeUpgrade";
import { ListingForm } from "@/components/ListingForm";
import { useSingleFlightAction } from "@/hooks/useSingleFlightAction";
import { setListingStatus, payForListingBadge, reactivateListing, deleteListing } from "@/lib/actions/listings";
import { CATEGORY_LABELS } from "@/lib/validations/listing";
import { getFreshness } from "@/lib/staleness";
import type { ClientListing } from "@/types/listing";

const STATUS_LABELS: Record<ClientListing["status"], string> = {
  AVAILABLE: "Available",
  PENDING: "Pending",
  SOLD: "Sold",
  REMOVED: "Removed",
};

const STATUS_BADGE_VARIANT: Record<
  ClientListing["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  AVAILABLE: "default",
  PENDING: "secondary",
  SOLD: "outline",
  REMOVED: "destructive",
};

const PAYMENT_LABELS: Record<NonNullable<ClientListing["paymentStatus"]>, string> = {
  FREE: "Free",
  PAID: "Paid",
  AWAITING_PAYMENT: "Awaiting payment",
  FAILED: "Payment failed",
};

const PAYMENT_BADGE_VARIANT: Record<
  NonNullable<ClientListing["paymentStatus"]>,
  "default" | "secondary" | "outline" | "destructive"
> = {
  FREE: "outline",
  PAID: "default",
  AWAITING_PAYMENT: "secondary",
  FAILED: "destructive",
};

function RowActions({ listing }: { listing: ClientListing }) {
  const [state, formAction, pending] = useSingleFlightAction(setListingStatus);
  const [reactivateState, reactivateAction, reactivatePending] = useSingleFlightAction(reactivateListing);
  const [deleteState, deleteAction, deletePending] = useSingleFlightAction(deleteListing);
  const [editing, setEditing] = useState(false);
  const isAvailable = listing.status === "AVAILABLE";

  function updateStatus(status: "SOLD" | "REMOVED") {
    const formData = new FormData();
    formData.set("listingId", listing.id);
    formData.set("status", status);
    formAction(formData);
  }

  function reactivate() {
    const formData = new FormData();
    formData.set("listingId", listing.id);
    reactivateAction(formData);
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${listing.title}"? This cannot be undone.`)) return;
    const formData = new FormData();
    formData.set("listingId", listing.id);
    deleteAction(formData);
  }

  const message = state?.message ?? reactivateState?.message ?? deleteState?.message;
  const ok = state?.ok ?? reactivateState?.ok ?? deleteState?.ok;
  const anyPending = pending || reactivatePending || deletePending;

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" disabled={anyPending}>
              {anyPending ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
              <span className="sr-only">Open menu</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditing(true)}>Edit</DropdownMenuItem>
          {isAvailable && <DropdownMenuItem onClick={() => updateStatus("SOLD")}>Mark sold</DropdownMenuItem>}
          {isAvailable && <DropdownMenuItem onClick={reactivate}>Reactivate</DropdownMenuItem>}
          {isAvailable && !listing.badge && (
            <BadgeUpgradeMenuItem
              idField="listingId"
              idValue={listing.id}
              defaultPhone={listing.phone ?? ""}
              payAction={payForListingBadge}
              statusUrl={`/api/listings/${listing.id}/badge-status`}
            />
          )}
          {isAvailable && (
            <DropdownMenuItem variant="destructive" onClick={() => updateStatus("REMOVED")}>
              Remove
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {anyPending && <span className="text-xs text-muted-foreground">Updating…</span>}
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
          <ListingForm phone={listing.phone ?? ""} listing={listing} onSuccess={() => setEditing(false)} />
        </Modal>
      )}
    </div>
  );
}

function sortableHeader(label: string) {
  return function Header({ column }: { column: { toggleSorting: (desc: boolean) => void; getIsSorted: () => string | false } }) {
    return (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-2.5">
        {label}
        <ArrowUpDown className="size-3.5" />
      </Button>
    );
  };
}

const columns: ColumnDef<ClientListing>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: sortableHeader("Listing"),
    cell: ({ row }) => {
      const listing = row.original;
      return (
        <div className="flex items-center gap-2">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
            {listing.images[0] && <Image src={listing.images[0]} alt="" fill className="object-cover" />}
          </div>
          <span className="line-clamp-1 flex items-center gap-1">
            {listing.title}
            {listing.badge && <Star className="size-3.5 shrink-0 fill-blue-500 text-blue-500" />}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[row.original.category]}</span>
    ),
  },
  {
    accessorKey: "price",
    header: sortableHeader("Price"),
    cell: ({ row }) => <span>KES {row.original.price.toLocaleString()}</span>,
  },
  {
    accessorKey: "status",
    header: sortableHeader("Status"),
    cell: ({ row }) => {
      const listing = row.original;
      const { stale, daysLeft } = getFreshness(listing.activatedAt);
      return (
        <div className="flex flex-col gap-0.5">
          <Badge variant={STATUS_BADGE_VARIANT[listing.status]}>{STATUS_LABELS[listing.status]}</Badge>
          {listing.status === "AVAILABLE" && (
            <span className={`text-xs ${stale ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
              {stale ? "Stale — reactivate to show" : `Reactivate within ${daysLeft}d`}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "paymentStatus",
    header: sortableHeader("Payment"),
    cell: ({ row }) => {
      const paymentStatus = row.original.paymentStatus;
      if (!paymentStatus) return <span className="text-xs text-muted-foreground">—</span>;
      return <Badge variant={PAYMENT_BADGE_VARIANT[paymentStatus]}>{PAYMENT_LABELS[paymentStatus]}</Badge>;
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <RowActions listing={row.original} />
      </div>
    ),
  },
];

export function MyListingsTable({ listings }: { listings: ClientListing[] }) {
  return (
    <DataTable
      columns={columns}
      data={listings}
      filterColumnId="title"
      filterPlaceholder="Filter by title…"
      emptyMessage="You have not posted any listings yet."
      exportFilename="my-listings"
    />
  );
}
