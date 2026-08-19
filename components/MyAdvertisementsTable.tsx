"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";

type AdStatus = "PENDING" | "PENDING_APPROVAL" | "ACTIVE" | "EXPIRED" | "CANCELLED";

export type MyAdvertisement = {
  id: string;
  plan: string;
  amount: number;
  status: AdStatus;
  endsAt: Date | string | null;
  listing: { id: string; title: string };
};

const STATUS_LABELS: Record<AdStatus, string> = {
  PENDING: "Awaiting payment",
  PENDING_APPROVAL: "Awaiting approval",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

const STATUS_BADGE_VARIANT: Record<AdStatus, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "secondary",
  PENDING_APPROVAL: "secondary",
  ACTIVE: "default",
  EXPIRED: "outline",
  CANCELLED: "destructive",
};

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

const columns: ColumnDef<MyAdvertisement>[] = [
  {
    accessorKey: "listing.title",
    id: "listing",
    header: sortableHeader("Listing"),
    cell: ({ row }) => <span className="line-clamp-1">{row.original.listing.title}</span>,
  },
  {
    accessorKey: "plan",
    header: "Duration",
  },
  {
    accessorKey: "amount",
    header: sortableHeader("Amount"),
    cell: ({ row }) => <span>KES {row.original.amount.toLocaleString()}</span>,
  },
  {
    accessorKey: "status",
    header: sortableHeader("Status"),
    cell: ({ row }) => (
      <Badge variant={STATUS_BADGE_VARIANT[row.original.status]}>{STATUS_LABELS[row.original.status]}</Badge>
    ),
  },
  {
    accessorKey: "endsAt",
    header: "Ends",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.endsAt ? new Date(row.original.endsAt).toLocaleDateString() : "—"}
      </span>
    ),
  },
];

export function MyAdvertisementsTable({ ads }: { ads: MyAdvertisement[] }) {
  return (
    <DataTable
      columns={columns}
      data={ads}
      filterColumnId="listing"
      filterPlaceholder="Filter by listing…"
      emptyMessage="You have not boosted any listings yet."
      enableRowSelection={false}
    />
  );
}
