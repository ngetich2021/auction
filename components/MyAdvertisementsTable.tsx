"use client";

import { useEffect, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/Modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSingleFlightAction } from "@/hooks/useSingleFlightAction";
import { cancelAdvertisement, extendAdvertisement, editRejectedAdvertisement } from "@/lib/actions/advertisements";
import { MAX_AD_DAYS } from "@/lib/validations/advertisement";
import { FormAlert } from "@/components/ui/FormAlert";
import { FieldError } from "@/components/ui/FieldError";

type AdStatus = "PENDING" | "PENDING_APPROVAL" | "ACTIVE" | "EXPIRED" | "CANCELLED" | "REJECTED";

export type MyAdvertisement = {
  id: string;
  plan: string;
  amount: number;
  status: AdStatus;
  adminNote: string | null;
  pendingExtensionDays: number | null;
  endsAt: Date | string | null;
  videoUrl: string | null;
  listing: { id: string; title: string };
};

const MAX_POLL_ATTEMPTS = 20;

const STATUS_LABELS: Record<AdStatus, string> = {
  PENDING: "Awaiting payment",
  PENDING_APPROVAL: "Awaiting approval",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected — needs edit",
};

const STATUS_BADGE_VARIANT: Record<AdStatus, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "secondary",
  PENDING_APPROVAL: "secondary",
  ACTIVE: "default",
  EXPIRED: "outline",
  CANCELLED: "destructive",
  REJECTED: "destructive",
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

function EditRejectedModal({ ad, onClose }: { ad: MyAdvertisement; onClose: () => void }) {
  const [state, formAction, pending] = useSingleFlightAction(editRejectedAdvertisement);

  return (
    <Modal onClose={onClose}>
      <form action={formAction} className="flex flex-col gap-4 p-4">
        <h3 className="text-base font-semibold">Edit & resubmit advertisement</h3>
        <p className="text-sm text-zinc-500">{ad.listing.title}</p>
        <FormAlert ok={state?.ok} message={state?.message} />

        {ad.adminNote && (
          <p className="rounded-lg bg-red-50 dark:bg-red-950 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            Admin note: {ad.adminNote}
          </p>
        )}
        <p className="text-xs text-zinc-500">
          Your payment for this boost is unaffected — fix the video below and resubmit for approval, no new
          payment required.
        </p>

        <input type="hidden" name="advertisementId" value={ad.id} />

        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1">Promo video</legend>

          <label className="flex flex-col gap-1">
            YouTube video URL (optional — leave blank to remove)
            <input
              name="youtubeUrl"
              type="url"
              defaultValue={ad.videoUrl ?? ""}
              placeholder="https://youtube.com/watch?v=…"
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
            />
            <FieldError messages={state?.errors?.youtubeUrl} />
          </label>
        </fieldset>

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Resubmitting…" : "Resubmit for approval"}
        </button>
      </form>
    </Modal>
  );
}

function ExtendModal({ ad, defaultPhone, onClose }: { ad: MyAdvertisement; defaultPhone: string; onClose: () => void }) {
  const [extendState, extendAction, extendPending] = useSingleFlightAction(extendAdvertisement);
  const [resolved, setResolved] = useState<{ ok: boolean; message: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeAdId = extendState?.ok ? (extendState.data?.advertisementId ?? null) : null;
  const polling = !!activeAdId && !resolved;

  useEffect(() => {
    if (!activeAdId) return;
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/advertisements/${activeAdId}/status`);
        if (res.ok) {
          const data = await res.json();
          if (!data.pendingExtensionDays) {
            if (pollRef.current) clearInterval(pollRef.current);
            setResolved(
              data.failureReason
                ? { ok: false, message: data.failureReason }
                : { ok: true, message: "Thank you! Your advertisement has been extended." }
            );
            return;
          }
        }
      } catch {
        // transient network error while polling; the next tick retries
      }
      if (attempts >= MAX_POLL_ATTEMPTS) {
        if (pollRef.current) clearInterval(pollRef.current);
        setResolved({
          ok: false,
          message:
            "We're still confirming your payment — if money left your account, the extension will apply automatically once M-Pesa confirms it.",
        });
      }
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeAdId]);

  // Payment succeeded — thank the owner, then close the form on its own instead of leaving
  // them to dismiss it manually.
  useEffect(() => {
    if (!resolved?.ok) return;
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [resolved, onClose]);

  return (
    <Modal onClose={onClose}>
      <form action={extendAction} className="flex flex-col gap-3 p-4">
        <h3 className="text-base font-semibold">Extend advertisement</h3>
        <p className="text-sm text-zinc-500">{ad.listing.title}</p>
        <input type="hidden" name="advertisementId" value={ad.id} />
        <label className="flex flex-col gap-1 text-sm">
          Number of days
          <input
            name="days"
            type="number"
            min={1}
            max={MAX_AD_DAYS}
            defaultValue={7}
            required
            disabled={!!activeAdId}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 disabled:opacity-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          M-Pesa phone number
          <input
            name="phone"
            type="tel"
            required
            defaultValue={defaultPhone}
            placeholder="07XXXXXXXX"
            disabled={!!activeAdId}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 disabled:opacity-50"
          />
        </label>
        <button
          type="submit"
          disabled={extendPending || polling}
          className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {extendPending ? "Starting payment…" : polling ? "Waiting for payment…" : "Pay & extend"}
        </button>

        {activeAdId && !resolved && (
          <p className="text-sm">Check your phone and enter your M-Pesa PIN to complete payment…</p>
        )}
        {resolved && (
          <p className={`text-sm ${resolved.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {resolved.ok ? `${resolved.message} Closing…` : resolved.message}
          </p>
        )}
      </form>
    </Modal>
  );
}

function RowActions({ ad, defaultPhone }: { ad: MyAdvertisement; defaultPhone: string }) {
  const [cancelState, cancelAction, cancelPending] = useSingleFlightAction(cancelAdvertisement);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const canCancel = ad.status === "PENDING" || ad.status === "PENDING_APPROVAL" || ad.status === "ACTIVE";
  const canExtend = (ad.status === "ACTIVE" || ad.status === "EXPIRED") && !ad.pendingExtensionDays;
  const canEdit = ad.status === "REJECTED";

  if (!canCancel && !canExtend && !canEdit) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  function handleCancel() {
    const formData = new FormData();
    formData.set("advertisementId", ad.id);
    cancelAction(formData);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" disabled={cancelPending}>
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {canEdit && <DropdownMenuItem onClick={() => setShowEditModal(true)}>Edit & resubmit</DropdownMenuItem>}
          {canExtend && <DropdownMenuItem onClick={() => setShowExtendModal(true)}>Extend</DropdownMenuItem>}
          {canCancel && (
            <DropdownMenuItem variant="destructive" onClick={handleCancel}>
              Cancel
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {ad.pendingExtensionDays && <span className="text-xs text-muted-foreground">Extension payment pending…</span>}

      {ad.status === "REJECTED" && ad.adminNote && (
        <span className="max-w-48 text-right text-xs text-red-600 dark:text-red-400">{ad.adminNote}</span>
      )}

      {cancelState?.message && (
        <span
          className={`text-xs ${
            cancelState.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {cancelState.message}
        </span>
      )}

      {showEditModal && <EditRejectedModal ad={ad} onClose={() => setShowEditModal(false)} />}

      {showExtendModal && (
        <ExtendModal ad={ad} defaultPhone={defaultPhone} onClose={() => setShowExtendModal(false)} />
      )}
    </div>
  );
}

function buildColumns(defaultPhone: string): ColumnDef<MyAdvertisement>[] {
  return [
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
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <RowActions ad={row.original} defaultPhone={defaultPhone} />
        </div>
      ),
    },
  ];
}

export function MyAdvertisementsTable({ ads, defaultPhone }: { ads: MyAdvertisement[]; defaultPhone: string }) {
  return (
    <DataTable
      columns={buildColumns(defaultPhone)}
      data={ads}
      filterColumnId="listing"
      filterPlaceholder="Filter by listing…"
      emptyMessage="You have not boosted any listings yet."
      enableRowSelection={false}
      exportFilename="my-advertisements"
    />
  );
}
