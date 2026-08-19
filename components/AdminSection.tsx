"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { useSingleFlightAction } from "@/hooks/useSingleFlightAction";
import { updateUserRole, adminModerateListing } from "@/lib/actions/admin";
import { approveAdvertisement, rejectAdvertisement } from "@/lib/actions/advertisements";
import { CATEGORY_LABELS, LISTING_POST_FEE_KES } from "@/lib/validations/listing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { ListingCategory, ListingStatus } from "@/types/listing";
import type { AdminPayment } from "@/lib/queries";

type AdStatus = "PENDING" | "PENDING_APPROVAL" | "ACTIVE" | "EXPIRED" | "CANCELLED";
type PaymentStatus = "PAID" | "AWAITING_PAYMENT" | "FAILED";

type AdminStats = {
  userCount: number;
  listingCount: number;
  orderCount: number;
  totalRevenue: number;
  activeAds: number;
  pendingApprovals: number;
  listingFeeRevenue: number;
  adRevenue: number;
};
type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
};
type AdminListing = {
  id: string;
  title: string;
  category: ListingCategory;
  status: ListingStatus;
  paymentStatus: PaymentStatus;
  seller: { name: string | null; email: string };
};
type AdminOrder = {
  id: string;
  totalAmount: number;
  status: string;
  listing: { title: string };
  buyer: { name: string | null; email: string };
};
type AdminAdvertisement = {
  id: string;
  plan: string;
  amount: number;
  status: AdStatus;
  listing: { title: string };
  owner: { name: string | null; email: string };
};

export type AdminData = {
  stats: AdminStats;
  users: AdminUser[];
  listings: AdminListing[];
  orders: AdminOrder[];
  adverts: AdminAdvertisement[];
  payments: AdminPayment[];
};

const TABS = ["overview", "users", "listings", "adverts", "orders", "payments"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  users: "Users",
  listings: "Listings",
  adverts: "Adverts",
  orders: "Orders",
  payments: "Payments",
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

function RoleForm({ user }: { user: AdminUser }) {
  const [state, formAction, pending] = useSingleFlightAction(updateUserRole);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={user.id} />
      <select
        name="role"
        defaultValue={user.role}
        className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
      >
        <option value="USER">USER</option>
        <option value="ADMIN">ADMIN</option>
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-xs disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state?.message && (
        <span className={`text-xs ${state.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}

function ListingModerationForm({ listing }: { listing: AdminListing }) {
  const [state, formAction, pending] = useSingleFlightAction(adminModerateListing);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="listingId" value={listing.id} />
      <select
        name="status"
        defaultValue={listing.status}
        className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
      >
        <option value="AVAILABLE">AVAILABLE</option>
        <option value="PENDING">PENDING</option>
        <option value="SOLD">SOLD</option>
        <option value="REMOVED">REMOVED</option>
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-xs disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state?.message && (
        <span className={`text-xs ${state.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}

function AdvertApprovalActions({ ad }: { ad: AdminAdvertisement }) {
  const [approveState, approveAction, approving] = useSingleFlightAction(approveAdvertisement);
  const [rejectState, rejectAction, rejecting] = useSingleFlightAction(rejectAdvertisement);

  if (ad.status !== "PENDING_APPROVAL") {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <form action={approveAction}>
          <input type="hidden" name="advertisementId" value={ad.id} />
          <button
            type="submit"
            disabled={approving || rejecting}
            className="rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-1 text-xs disabled:opacity-50"
          >
            {approving ? "Approving…" : "Approve"}
          </button>
        </form>
        <form action={rejectAction}>
          <input type="hidden" name="advertisementId" value={ad.id} />
          <button
            type="submit"
            disabled={approving || rejecting}
            className="rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 px-2 py-1 text-xs disabled:opacity-50"
          >
            {rejecting ? "Rejecting…" : "Reject"}
          </button>
        </form>
      </div>
      {(approveState?.message || rejectState?.message) && (
        <span className="text-xs text-muted-foreground">{approveState?.message ?? rejectState?.message}</span>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

const userColumns: ColumnDef<AdminUser>[] = [
  { accessorKey: "name", header: sortableHeader("Name"), cell: ({ row }) => row.original.name ?? "—" },
  { accessorKey: "email", header: sortableHeader("Email") },
  { accessorKey: "role", header: sortableHeader("Role"), cell: ({ row }) => <Badge variant="outline">{row.original.role}</Badge> },
  { id: "actions", header: () => <span className="sr-only">Actions</span>, cell: ({ row }) => <RoleForm user={row.original} /> },
];

const listingColumns: ColumnDef<AdminListing>[] = [
  { accessorKey: "title", header: sortableHeader("Title") },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[row.original.category]}</span>,
  },
  { id: "seller", accessorFn: (l) => l.seller.name ?? l.seller.email, header: sortableHeader("Seller") },
  { accessorKey: "status", header: sortableHeader("Status"), cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge> },
  {
    accessorKey: "paymentStatus",
    header: "Payment",
    cell: ({ row }) => (
      <Badge variant={row.original.paymentStatus === "PAID" ? "default" : row.original.paymentStatus === "FAILED" ? "destructive" : "secondary"}>
        {row.original.paymentStatus}
      </Badge>
    ),
  },
  { id: "actions", header: () => <span className="sr-only">Actions</span>, cell: ({ row }) => <ListingModerationForm listing={row.original} /> },
];

const orderColumns: ColumnDef<AdminOrder>[] = [
  { id: "item", accessorFn: (o) => o.listing.title, header: sortableHeader("Item") },
  { id: "buyer", accessorFn: (o) => o.buyer.name ?? o.buyer.email, header: sortableHeader("Buyer") },
  {
    accessorKey: "totalAmount",
    header: sortableHeader("Total"),
    cell: ({ row }) => `KES ${row.original.totalAmount.toLocaleString()}`,
  },
  { accessorKey: "status", header: sortableHeader("Status"), cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge> },
];

const advertColumns: ColumnDef<AdminAdvertisement>[] = [
  { id: "listing", accessorFn: (a) => a.listing.title, header: sortableHeader("Listing") },
  { id: "owner", accessorFn: (a) => a.owner.name ?? a.owner.email, header: sortableHeader("Owner") },
  { accessorKey: "plan", header: "Duration" },
  { accessorKey: "amount", header: sortableHeader("Amount"), cell: ({ row }) => `KES ${row.original.amount.toLocaleString()}` },
  { accessorKey: "status", header: sortableHeader("Status"), cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge> },
  { id: "actions", header: () => <span className="sr-only">Actions</span>, cell: ({ row }) => <AdvertApprovalActions ad={row.original} /> },
];

const paymentColumns: ColumnDef<AdminPayment>[] = [
  { accessorKey: "type", header: sortableHeader("Type") },
  { accessorKey: "description", header: sortableHeader("Description") },
  { accessorKey: "payer", header: sortableHeader("Payer") },
  { accessorKey: "amount", header: sortableHeader("Amount"), cell: ({ row }) => `KES ${row.original.amount.toLocaleString()}` },
  { accessorKey: "status", header: sortableHeader("Status"), cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge> },
  { accessorKey: "receipt", header: "Receipt", cell: ({ row }) => row.original.receipt ?? "—" },
  {
    accessorKey: "createdAt",
    header: sortableHeader("Date"),
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{new Date(row.original.createdAt).toLocaleDateString()}</span>,
  },
];

export function AdminSection({ data }: { data: AdminData }) {
  const { stats, users, listings, orders, adverts, payments } = data;
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="flex flex-col gap-6 p-4">
      <nav className="flex overflow-x-auto rounded-full border border-zinc-200 dark:border-zinc-800 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
              tab === t
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {TAB_LABELS[t]}
            {t === "adverts" && stats.pendingApprovals > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {stats.pendingApprovals}
              </span>
            )}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Users" value={stats.userCount} />
          <StatCard label="Listings" value={stats.listingCount} />
          <StatCard label="Orders" value={stats.orderCount} />
          <StatCard label="Order revenue" value={`KES ${stats.totalRevenue.toLocaleString()}`} />
          <StatCard label="Active ads" value={stats.activeAds} />
          <StatCard label="Pending ad approvals" value={stats.pendingApprovals} />
          <StatCard label="Listing fee revenue" value={`KES ${stats.listingFeeRevenue.toLocaleString()}`} />
          <StatCard label="Ad revenue" value={`KES ${stats.adRevenue.toLocaleString()}`} />
          <StatCard label="Listing post fee" value={`KES ${LISTING_POST_FEE_KES}`} />
        </div>
      )}

      {tab === "users" && (
        <DataTable columns={userColumns} data={users} filterColumnId="email" filterPlaceholder="Filter by email…" enableRowSelection={false} />
      )}

      {tab === "listings" && (
        <DataTable columns={listingColumns} data={listings} filterColumnId="title" filterPlaceholder="Filter by title…" enableRowSelection={false} />
      )}

      {tab === "adverts" && (
        <DataTable columns={advertColumns} data={adverts} filterColumnId="listing" filterPlaceholder="Filter by listing…" enableRowSelection={false} />
      )}

      {tab === "orders" && (
        <DataTable columns={orderColumns} data={orders} filterColumnId="item" filterPlaceholder="Filter by item…" enableRowSelection={false} />
      )}

      {tab === "payments" && (
        <DataTable
          columns={paymentColumns}
          data={payments}
          filterColumnId="description"
          filterPlaceholder="Filter by description…"
          enableRowSelection={false}
        />
      )}
    </div>
  );
}
