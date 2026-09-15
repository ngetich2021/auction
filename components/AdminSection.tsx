"use client";

import { useState } from "react";
import Image from "next/image";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Star } from "lucide-react";
import { useSingleFlightAction } from "@/hooks/useSingleFlightAction";
import { updateUserRole, adminModerateListing } from "@/lib/actions/admin";
import { assignUserRole } from "@/lib/actions/roles";
import { approveAdvertisement, rejectAdvertisement } from "@/lib/actions/advertisements";
import { setMoverActive, deleteMover } from "@/lib/actions/movers";
import { setOfferActive, deleteOffer } from "@/lib/actions/offers";
import { setEateryActive, deleteEatery } from "@/lib/actions/eateries";
import { setContactMessageStatus, deleteContactMessage } from "@/lib/actions/contact";
import { VIDEO_NOT_PLAYING_REASON } from "@/lib/validations/advertisement";
import { CATEGORY_LABELS } from "@/lib/validations/listing";
import { BADGE_PRICE_KES } from "@/lib/validations/badge";
import { hasPermission, type SessionPermission } from "@/lib/permissions";
import { RolesModal, PermissionsModal, type AdminRole } from "@/components/AdminRolesPermissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/Modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ListingCategory, ListingStatus } from "@/types/listing";
import type { AdminPayment } from "@/lib/queries";

type AdStatus = "PENDING" | "PENDING_APPROVAL" | "ACTIVE" | "EXPIRED" | "CANCELLED" | "REJECTED";
type PaymentStatus = "PAID" | "AWAITING_PAYMENT" | "FAILED" | "FREE";
type ContactMessageType = "CONTACT" | "FEEDBACK";
type ContactMessageStatus = "NEW" | "READ" | "RESOLVED";

export type AdminAccess = { isSuperAdmin: boolean; permissions: SessionPermission[] };

type AdminStats = {
  userCount: number;
  listingCount: number;
  orderCount: number;
  orderTotalValue: number;
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
  customRoleId: string | null;
  customRole: { id: string; name: string } | null;
};
type AdminListing = {
  id: string;
  title: string;
  images: string[];
  category: ListingCategory;
  status: ListingStatus;
  badge: boolean;
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
type AdminMover = {
  id: string;
  vehicleType: string;
  image: string;
  phone: string;
  active: boolean;
  badge: boolean;
  owner: { name: string | null; email: string };
};
type AdminOffer = {
  id: string;
  title: string;
  shopName: string;
  image: string;
  phone: string;
  active: boolean;
  badge: boolean;
  owner: { name: string | null; email: string };
};
type AdminEatery = {
  id: string;
  name: string;
  foodType: string | null;
  image: string;
  phone: string;
  active: boolean;
  badge: boolean;
  owner: { name: string | null; email: string };
};
type AdminContact = {
  id: string;
  type: ContactMessageType;
  status: ContactMessageStatus;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  rating: number | null;
  createdAt: string | Date;
};

export type AdminData = {
  stats: AdminStats | null;
  users: AdminUser[];
  listings: AdminListing[];
  orders: AdminOrder[];
  adverts: AdminAdvertisement[];
  payments: AdminPayment[];
  roles: AdminRole[];
  movers: AdminMover[];
  offers: AdminOffer[];
  eateries: AdminEatery[];
  contacts: AdminContact[];
};

const TABS = [
  "overview",
  "users",
  "listings",
  "adverts",
  "orders",
  "payments",
  "movers",
  "offers",
  "eateries",
  "contacts",
] as const;
type Tab = (typeof TABS)[number];
const RESOURCE_TABS = ["users", "listings", "adverts", "orders", "payments"] as const;
const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  users: "Users",
  listings: "Listings",
  adverts: "Adverts",
  orders: "Orders",
  payments: "Payments",
  movers: "Movers",
  offers: "Offers",
  eateries: "Eateries",
  contacts: "Contacts",
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

function ActionsTrigger({ disabled }: { disabled?: boolean }) {
  return (
    <DropdownMenuTrigger
      render={
        <Button variant="ghost" size="icon" disabled={disabled}>
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      }
    />
  );
}

function UserActions({ user, roles, isSuperAdmin }: { user: AdminUser; roles: AdminRole[]; isSuperAdmin: boolean }) {
  const [state, formAction, pending] = useSingleFlightAction(updateUserRole);
  const [roleState, roleAction, rolePending] = useSingleFlightAction(assignUserRole);

  function setRole(role: "USER" | "ADMIN") {
    const formData = new FormData();
    formData.set("userId", user.id);
    formData.set("role", role);
    formAction(formData);
  }

  function setCustomRole(customRoleId: string) {
    const formData = new FormData();
    formData.set("userId", user.id);
    formData.set("customRoleId", customRoleId);
    roleAction(formData);
  }

  // Granting/removing ADMIN or a custom role is a super-admin-only privilege — a scoped role
  // must never be able to widen anyone's access, including its own.
  if (!isSuperAdmin) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <ActionsTrigger disabled={pending || rolePending} />
        <DropdownMenuContent align="end">
          {user.role !== "ADMIN" && <DropdownMenuItem onClick={() => setRole("ADMIN")}>Promote to admin</DropdownMenuItem>}
          {user.role !== "USER" && <DropdownMenuItem onClick={() => setRole("USER")}>Demote to user</DropdownMenuItem>}
          {roles.map(
            (role) =>
              role.id !== user.customRoleId && (
                <DropdownMenuItem key={role.id} onClick={() => setCustomRole(role.id)}>
                  Assign role: {role.name}
                </DropdownMenuItem>
              )
          )}
          {user.customRoleId && (
            <DropdownMenuItem onClick={() => setCustomRole("")}>Remove custom role</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {(state?.message || roleState?.message) && (
        <span
          className={`text-xs ${
            (state?.ok ?? roleState?.ok) ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {state?.message ?? roleState?.message}
        </span>
      )}
    </div>
  );
}

const LISTING_STATUS_OPTIONS: { value: ListingStatus; label: string }[] = [
  { value: "AVAILABLE", label: "Mark available" },
  { value: "PENDING", label: "Mark pending" },
  { value: "SOLD", label: "Mark sold" },
  { value: "REMOVED", label: "Mark removed" },
];

function ListingActions({ listing, canManage }: { listing: AdminListing; canManage: boolean }) {
  const [state, formAction, pending] = useSingleFlightAction(adminModerateListing);

  function setStatus(status: ListingStatus) {
    const formData = new FormData();
    formData.set("listingId", listing.id);
    formData.set("status", status);
    formAction(formData);
  }

  if (!canManage) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <ActionsTrigger disabled={pending} />
        <DropdownMenuContent align="end">
          {LISTING_STATUS_OPTIONS.filter((o) => o.value !== listing.status).map((o) => (
            <DropdownMenuItem key={o.value} onClick={() => setStatus(o.value)}>
              {o.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {state?.message && (
        <span className={`text-xs ${state.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {state.message}
        </span>
      )}
    </div>
  );
}

function AdvertApprovalActions({ ad, canManage }: { ad: AdminAdvertisement; canManage: boolean }) {
  const [approveState, approveAction, approving] = useSingleFlightAction(approveAdvertisement);
  const [rejectState, rejectAction, rejecting] = useSingleFlightAction(rejectAdvertisement);
  const [modalKind, setModalKind] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");

  const canApprove = canManage && ad.status === "PENDING_APPROVAL";
  // Admin can pull down anything that isn't already cancelled/expired — including a live ad
  // whose video has stopped playing.
  const canReject =
    canManage && (ad.status === "PENDING" || ad.status === "PENDING_APPROVAL" || ad.status === "ACTIVE");

  if (!canApprove && !canReject) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  function openModal(kind: "approve" | "reject") {
    setNote("");
    setModalKind(kind);
  }

  function submit() {
    const formData = new FormData();
    formData.set("advertisementId", ad.id);
    formData.set("note", note);
    if (modalKind === "approve") approveAction(formData);
    else if (modalKind === "reject") rejectAction(formData);
    setModalKind(null);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <ActionsTrigger disabled={approving || rejecting} />
        <DropdownMenuContent align="end">
          {canApprove && <DropdownMenuItem onClick={() => openModal("approve")}>Approve</DropdownMenuItem>}
          {canReject && (
            <DropdownMenuItem variant="destructive" onClick={() => openModal("reject")}>
              Reject
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {(approveState?.message || rejectState?.message) && (
        <span className="text-xs text-muted-foreground">{approveState?.message ?? rejectState?.message}</span>
      )}

      {modalKind && (
        <Modal onClose={() => setModalKind(null)}>
          <div className="flex flex-col gap-3 p-4">
            <h3 className="text-base font-semibold">
              {modalKind === "approve" ? "Approve advertisement" : "Reject advertisement"}
            </h3>
            <p className="text-sm text-zinc-500">{ad.listing.title}</p>
            {modalKind === "reject" && (
              <button
                type="button"
                onClick={() => setNote(VIDEO_NOT_PLAYING_REASON)}
                className="self-start rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                Quick reason: video not playing
              </button>
            )}
            <label className="flex flex-col gap-1 text-sm">
              Note (optional)
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Visible to the advertiser…"
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={submit}
              disabled={approving || rejecting}
              className={`self-start rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                modalKind === "approve" ? "bg-emerald-600" : "bg-red-600"
              }`}
            >
              {modalKind === "approve" ? (approving ? "Approving…" : "Approve") : rejecting ? "Rejecting…" : "Reject"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MoverActions({ mover }: { mover: AdminMover }) {
  const [toggleState, toggleAction, togglePending] = useSingleFlightAction(setMoverActive);
  const [deleteState, deleteAction, deletePending] = useSingleFlightAction(deleteMover);

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

  const message = toggleState?.message ?? deleteState?.message;
  const ok = toggleState?.ok ?? deleteState?.ok;

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <ActionsTrigger disabled={togglePending || deletePending} />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={toggleActive}>{mover.active ? "Hide" : "Show"}</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {message && (
        <span className={`text-xs ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {message}
        </span>
      )}
    </div>
  );
}

function OfferActions({ offer }: { offer: AdminOffer }) {
  const [toggleState, toggleAction, togglePending] = useSingleFlightAction(setOfferActive);
  const [deleteState, deleteAction, deletePending] = useSingleFlightAction(deleteOffer);

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

  const message = toggleState?.message ?? deleteState?.message;
  const ok = toggleState?.ok ?? deleteState?.ok;

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <ActionsTrigger disabled={togglePending || deletePending} />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={toggleActive}>{offer.active ? "Hide" : "Show"}</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {message && (
        <span className={`text-xs ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {message}
        </span>
      )}
    </div>
  );
}

function EateryActions({ eatery }: { eatery: AdminEatery }) {
  const [toggleState, toggleAction, togglePending] = useSingleFlightAction(setEateryActive);
  const [deleteState, deleteAction, deletePending] = useSingleFlightAction(deleteEatery);

  function toggleActive() {
    const formData = new FormData();
    formData.set("eateryId", eatery.id);
    formData.set("active", eatery.active ? "false" : "true");
    toggleAction(formData);
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${eatery.name}"? This cannot be undone.`)) return;
    const formData = new FormData();
    formData.set("eateryId", eatery.id);
    deleteAction(formData);
  }

  const message = toggleState?.message ?? deleteState?.message;
  const ok = toggleState?.ok ?? deleteState?.ok;

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <ActionsTrigger disabled={togglePending || deletePending} />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={toggleActive}>{eatery.active ? "Hide" : "Show"}</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {message && (
        <span className={`text-xs ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {message}
        </span>
      )}
    </div>
  );
}

function ContactActions({ contact }: { contact: AdminContact }) {
  const [statusState, statusAction, statusPending] = useSingleFlightAction(setContactMessageStatus);
  const [deleteState, deleteAction, deletePending] = useSingleFlightAction(deleteContactMessage);

  function setStatus(status: ContactMessageStatus) {
    const formData = new FormData();
    formData.set("id", contact.id);
    formData.set("status", status);
    statusAction(formData);
  }

  function handleDelete() {
    if (!window.confirm(`Delete this message from "${contact.name}"? This cannot be undone.`)) return;
    const formData = new FormData();
    formData.set("id", contact.id);
    deleteAction(formData);
  }

  const message = statusState?.message ?? deleteState?.message;
  const ok = statusState?.ok ?? deleteState?.ok;

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <ActionsTrigger disabled={statusPending || deletePending} />
        <DropdownMenuContent align="end">
          {["NEW", "READ", "RESOLVED"]
            .filter((s) => s !== contact.status)
            .map((s) => (
              <DropdownMenuItem key={s} onClick={() => setStatus(s as ContactMessageStatus)}>
                Mark {s.toLowerCase()}
              </DropdownMenuItem>
            ))}
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {message && (
        <span className={`text-xs ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {message}
        </span>
      )}
    </div>
  );
}

const moverColumns: ColumnDef<AdminMover>[] = [
  {
    accessorKey: "vehicleType",
    header: sortableHeader("Vehicle"),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-muted">
          <Image src={row.original.image} alt="" fill sizes="32px" className="object-cover" />
        </div>
        <span className="line-clamp-1">{row.original.vehicleType}</span>
      </div>
    ),
  },
  { id: "owner", accessorFn: (m) => m.owner.name ?? m.owner.email, header: sortableHeader("Owner") },
  { accessorKey: "phone", header: "Phone" },
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => <Badge variant={row.original.active ? "default" : "secondary"}>{row.original.active ? "Visible" : "Hidden"}</Badge>,
  },
  {
    accessorKey: "badge",
    header: "Badge",
    cell: ({ row }) =>
      row.original.badge ? <Star className="size-4 fill-blue-500 text-blue-500" aria-label="Blue star badge" /> : "—",
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <MoverActions mover={row.original} />
      </div>
    ),
  },
];

const offerColumns: ColumnDef<AdminOffer>[] = [
  {
    accessorKey: "title",
    header: sortableHeader("Offer"),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-muted">
          <Image src={row.original.image} alt="" fill sizes="32px" className="object-cover" />
        </div>
        <div className="flex flex-col">
          <span className="line-clamp-1">{row.original.title}</span>
          <span className="text-xs text-muted-foreground">{row.original.shopName}</span>
        </div>
      </div>
    ),
  },
  { id: "owner", accessorFn: (o) => o.owner.name ?? o.owner.email, header: sortableHeader("Owner") },
  { accessorKey: "phone", header: "Phone" },
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => <Badge variant={row.original.active ? "default" : "secondary"}>{row.original.active ? "Visible" : "Hidden"}</Badge>,
  },
  {
    accessorKey: "badge",
    header: "Badge",
    cell: ({ row }) =>
      row.original.badge ? <Star className="size-4 fill-blue-500 text-blue-500" aria-label="Blue star badge" /> : "—",
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <OfferActions offer={row.original} />
      </div>
    ),
  },
];

const eateryColumns: ColumnDef<AdminEatery>[] = [
  {
    accessorKey: "name",
    header: sortableHeader("Eatery"),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-muted">
          <Image src={row.original.image} alt="" fill sizes="32px" className="object-cover" />
        </div>
        <div className="flex flex-col">
          <span className="line-clamp-1">{row.original.name}</span>
          {row.original.foodType && <span className="text-xs text-muted-foreground">{row.original.foodType}</span>}
        </div>
      </div>
    ),
  },
  { id: "owner", accessorFn: (e) => e.owner.name ?? e.owner.email, header: sortableHeader("Owner") },
  { accessorKey: "phone", header: "Phone" },
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => <Badge variant={row.original.active ? "default" : "secondary"}>{row.original.active ? "Visible" : "Hidden"}</Badge>,
  },
  {
    accessorKey: "badge",
    header: "Badge",
    cell: ({ row }) =>
      row.original.badge ? <Star className="size-4 fill-blue-500 text-blue-500" aria-label="Blue star badge" /> : "—",
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <EateryActions eatery={row.original} />
      </div>
    ),
  },
];

const contactColumns: ColumnDef<AdminContact>[] = [
  {
    accessorKey: "type",
    header: sortableHeader("Type"),
    cell: ({ row }) => <Badge variant={row.original.type === "FEEDBACK" ? "secondary" : "outline"}>{row.original.type}</Badge>,
  },
  {
    id: "from",
    accessorFn: (c) => c.name,
    header: sortableHeader("From"),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="line-clamp-1">{row.original.name}</span>
        <span className="text-xs text-muted-foreground">{row.original.email}</span>
        {row.original.phone && <span className="text-xs text-muted-foreground">{row.original.phone}</span>}
      </div>
    ),
  },
  {
    id: "content",
    accessorFn: (c) => c.subject ?? c.message,
    header: "Message",
    cell: ({ row }) => (
      <div className="flex flex-col max-w-xs">
        {row.original.subject && <span className="text-xs font-medium line-clamp-1">{row.original.subject}</span>}
        {row.original.rating != null && (
          <span className="flex items-center gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`size-3 ${i < row.original.rating! ? "fill-amber-400 text-amber-400" : "text-zinc-300 dark:text-zinc-700"}`}
              />
            ))}
          </span>
        )}
        <span className="line-clamp-2 text-xs text-muted-foreground">{row.original.message}</span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: sortableHeader("Status"),
    cell: ({ row }) => (
      <Badge variant={row.original.status === "NEW" ? "default" : row.original.status === "RESOLVED" ? "secondary" : "outline"}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: sortableHeader("Date"),
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{new Date(row.original.createdAt).toLocaleDateString()}</span>,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <ContactActions contact={row.original} />
      </div>
    ),
  },
];

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function buildUserColumns(roles: AdminRole[], isSuperAdmin: boolean): ColumnDef<AdminUser>[] {
  return [
    { accessorKey: "name", header: sortableHeader("Name"), cell: ({ row }) => row.original.name ?? "—" },
    { accessorKey: "email", header: sortableHeader("Email") },
    {
      accessorKey: "role",
      header: sortableHeader("Role"),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline">{row.original.role}</Badge>
          {row.original.customRole && <Badge variant="secondary">{row.original.customRole.name}</Badge>}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <UserActions user={row.original} roles={roles} isSuperAdmin={isSuperAdmin} />
        </div>
      ),
    },
  ];
}

function buildListingColumns(canManage: boolean): ColumnDef<AdminListing>[] {
  return [
  {
    accessorKey: "title",
    header: sortableHeader("Title"),
    cell: ({ row }) => {
      const listing = row.original;
      return (
        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-muted">
            {listing.images[0] && <Image src={listing.images[0]} alt="" fill sizes="32px" className="object-cover" />}
          </div>
          <span className="line-clamp-1">{listing.title}</span>
        </div>
      );
    },
  },
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
      <Badge
        variant={
          row.original.paymentStatus === "PAID"
            ? "default"
            : row.original.paymentStatus === "FAILED"
              ? "destructive"
              : row.original.paymentStatus === "FREE"
                ? "outline"
                : "secondary"
        }
      >
        {row.original.paymentStatus}
      </Badge>
    ),
  },
  {
    accessorKey: "badge",
    header: "Badge",
    cell: ({ row }) =>
      row.original.badge ? <Star className="size-4 fill-blue-500 text-blue-500" aria-label="Blue star badge" /> : "—",
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <ListingActions listing={row.original} canManage={canManage} />
      </div>
    ),
  },
  ];
}

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

function buildAdvertColumns(canManage: boolean): ColumnDef<AdminAdvertisement>[] {
  return [
    { id: "listing", accessorFn: (a) => a.listing.title, header: sortableHeader("Listing") },
    { id: "owner", accessorFn: (a) => a.owner.name ?? a.owner.email, header: sortableHeader("Owner") },
    { accessorKey: "plan", header: "Duration" },
    {
      accessorKey: "amount",
      header: sortableHeader("Amount"),
      cell: ({ row }) => `KES ${row.original.amount.toLocaleString()}`,
    },
    {
      accessorKey: "status",
      header: sortableHeader("Status"),
      cell: ({ row }) => (
        <Badge variant={row.original.status === "REJECTED" ? "destructive" : "outline"}>{row.original.status}</Badge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <AdvertApprovalActions ad={row.original} canManage={canManage} />
        </div>
      ),
    },
  ];
}

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

export function AdminSection({ data, access }: { data: AdminData; access: AdminAccess }) {
  const { stats, users, listings, orders, adverts, payments, roles, movers, offers, eateries, contacts } = data;
  const { isSuperAdmin, permissions } = access;
  const newContactCount = contacts.filter((c) => c.status === "NEW").length;

  const visibleTabs: Tab[] = isSuperAdmin
    ? [...TABS]
    : RESOURCE_TABS.filter((t) => hasPermission(permissions, t, "READ"));
  const [tab, setTab] = useState<Tab>(visibleTabs[0] ?? "overview");
  const [rolesModalOpen, setRolesModalOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);

  const canManageListings = isSuperAdmin || hasPermission(permissions, "listings", "UPDATE");
  const canManageAdverts = isSuperAdmin || hasPermission(permissions, "adverts", "UPDATE");

  return (
    <div className="flex flex-col gap-6 p-4">
      <nav className="flex overflow-x-auto rounded-full border border-zinc-200 dark:border-zinc-800 p-1">
        {visibleTabs.map((t) => (
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
            {t === "adverts" && !!stats?.pendingApprovals && (
              <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {stats.pendingApprovals}
              </span>
            )}
            {t === "contacts" && !!newContactCount && (
              <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {newContactCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {tab === "overview" && stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Users" value={stats.userCount} />
          <StatCard label="Listings" value={stats.listingCount} />
          <StatCard label="Orders" value={stats.orderCount} />
          <StatCard label="Order value (buyer↔seller)" value={`KES ${stats.orderTotalValue.toLocaleString()}`} />
          <StatCard label="Active ads" value={stats.activeAds} />
          <StatCard label="Pending ad approvals" value={stats.pendingApprovals} />
          <StatCard label="Listing fees (historical)" value={`KES ${stats.listingFeeRevenue.toLocaleString()}`} />
          <StatCard label="Ad revenue" value={`KES ${stats.adRevenue.toLocaleString()}`} />
          <StatCard label="Badge price" value={`KES ${BADGE_PRICE_KES}`} />
        </div>
      )}

      {tab === "users" && (
        <div className="flex flex-col gap-3">
          {isSuperAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setRolesModalOpen(true)}>
                Roles
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPermissionsModalOpen(true)}>
                Permissions
              </Button>
            </div>
          )}
          <DataTable
            columns={buildUserColumns(roles, isSuperAdmin)}
            data={users}
            filterColumnId="email"
            filterPlaceholder="Filter by email…"
            enableRowSelection={false}
            exportFilename="users"
          />
        </div>
      )}

      {tab === "listings" && (
        <DataTable
          columns={buildListingColumns(canManageListings)}
          data={listings}
          filterColumnId="title"
          filterPlaceholder="Filter by title…"
          enableRowSelection={false}
          exportFilename="listings"
        />
      )}

      {tab === "adverts" && (
        <DataTable
          columns={buildAdvertColumns(canManageAdverts)}
          data={adverts}
          filterColumnId="listing"
          filterPlaceholder="Filter by listing…"
          enableRowSelection={false}
          exportFilename="advertisements"
        />
      )}

      {tab === "orders" && (
        <DataTable
          columns={orderColumns}
          data={orders}
          filterColumnId="item"
          filterPlaceholder="Filter by item…"
          enableRowSelection={false}
          exportFilename="orders"
        />
      )}

      {tab === "payments" && (
        <DataTable
          columns={paymentColumns}
          data={payments}
          filterColumnId="description"
          filterPlaceholder="Filter by description…"
          enableRowSelection={false}
          exportFilename="payments"
        />
      )}

      {tab === "movers" && (
        <DataTable
          columns={moverColumns}
          data={movers}
          filterColumnId="vehicleType"
          filterPlaceholder="Filter by vehicle…"
          enableRowSelection={false}
          exportFilename="movers"
        />
      )}

      {tab === "offers" && (
        <DataTable
          columns={offerColumns}
          data={offers}
          filterColumnId="title"
          filterPlaceholder="Filter by offer…"
          enableRowSelection={false}
          exportFilename="offers"
        />
      )}

      {tab === "eateries" && (
        <DataTable
          columns={eateryColumns}
          data={eateries}
          filterColumnId="name"
          filterPlaceholder="Filter by eatery…"
          enableRowSelection={false}
          exportFilename="eateries"
        />
      )}

      {tab === "contacts" && (
        <DataTable
          columns={contactColumns}
          data={contacts}
          filterColumnId="from"
          filterPlaceholder="Filter by name or email…"
          enableRowSelection={false}
          exportFilename="contacts"
        />
      )}

      {rolesModalOpen && <RolesModal roles={roles} onClose={() => setRolesModalOpen(false)} />}
      {permissionsModalOpen && <PermissionsModal roles={roles} onClose={() => setPermissionsModalOpen(false)} />}
    </div>
  );
}
