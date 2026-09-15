"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Session } from "next-auth";
import { useSingleFlightAction } from "@/hooks/useSingleFlightAction";
import { cancelOrder } from "@/lib/actions/orders";
import { SignInPrompt } from "@/components/ui/SignInPrompt";
import { DataTable } from "@/components/ui/data-table";

type OrderStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "COMPLETED";

export type BuyerOrder = {
  id: string;
  quantity: number;
  totalAmount: number;
  status: OrderStatus;
  createdAt: Date | string;
  listing: { id: string; title: string; images: string[] };
};

export type SellerOrder = BuyerOrder & {
  buyer: { id: string; name: string | null; email: string };
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  CANCELLED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>{status}</span>
  );
}

function CancelButton({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useSingleFlightAction(cancelOrder);
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-xs disabled:opacity-50"
      >
        {pending ? "Cancelling…" : "Cancel"}
      </button>
      {state?.message && (
        <span className={state.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
          {state.message}
        </span>
      )}
    </form>
  );
}

const purchaseColumns: ColumnDef<BuyerOrder>[] = [
  {
    accessorKey: "listing.title",
    id: "item",
    header: "Item",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
          {row.original.listing.images[0] && (
            <Image src={row.original.listing.images[0]} alt="" fill className="object-cover" />
          )}
        </div>
        <span className="line-clamp-1">{row.original.listing.title}</span>
      </div>
    ),
  },
  { accessorKey: "quantity", header: "Qty" },
  {
    accessorKey: "totalAmount",
    header: "Total",
    cell: ({ row }) => <span>KES {row.original.totalAmount.toLocaleString()}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    enableHiding: false,
    cell: ({ row }) =>
      row.original.status === "COMPLETED" ? (
        <CancelButton orderId={row.original.id} />
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
];

const saleColumns: ColumnDef<SellerOrder>[] = [
  {
    accessorKey: "listing.title",
    id: "item",
    header: "Item",
    cell: ({ row }) => <span className="line-clamp-1">{row.original.listing.title}</span>,
  },
  {
    accessorKey: "buyer.name",
    id: "buyer",
    header: "Buyer",
    cell: ({ row }) => <span>{row.original.buyer.name ?? row.original.buyer.email}</span>,
  },
  { accessorKey: "quantity", header: "Qty" },
  {
    accessorKey: "totalAmount",
    header: "Total",
    cell: ({ row }) => <span>KES {row.original.totalAmount.toLocaleString()}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

function PurchasesTable({ orders }: { orders: BuyerOrder[] }) {
  return (
    <DataTable
      columns={purchaseColumns}
      data={orders}
      filterColumnId="item"
      filterPlaceholder="Filter by item…"
      emptyMessage="You have not placed any orders yet."
      enableRowSelection={false}
      exportFilename="my-purchases"
    />
  );
}

function SalesTable({ orders }: { orders: SellerOrder[] }) {
  return (
    <DataTable
      columns={saleColumns}
      data={orders}
      filterColumnId="item"
      filterPlaceholder="Filter by item…"
      emptyMessage="No one has ordered your listings yet."
      enableRowSelection={false}
      exportFilename="my-sales"
    />
  );
}

export function OrdersSection({
  session,
  buyerOrders,
  sellerOrders,
}: {
  session: Session | null;
  buyerOrders: BuyerOrder[];
  sellerOrders: SellerOrder[];
}) {
  const [tab, setTab] = useState<"purchases" | "sales">("purchases");

  if (!session) {
    return <SignInPrompt message="Sign in to view your orders." />;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setTab("purchases")}
            className={`rounded-full px-3 py-1.5 ${
              tab === "purchases" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800"
            }`}
          >
            My purchases
          </button>
          <button
            type="button"
            onClick={() => setTab("sales")}
            className={`rounded-full px-3 py-1.5 ${
              tab === "sales" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800"
            }`}
          >
            My sales
          </button>
        </div>
        <Link
          href={tab === "purchases" ? "/" : "/post"}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          {tab === "purchases" ? "Browse items" : "Post an item"}
        </Link>
      </div>

      {tab === "purchases" ? <PurchasesTable orders={buyerOrders} /> : <SalesTable orders={sellerOrders} />}
    </div>
  );
}
