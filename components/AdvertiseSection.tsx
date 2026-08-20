"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Session } from "next-auth";
import { useSingleFlightAction } from "@/hooks/useSingleFlightAction";
import { createAdvertisement } from "@/lib/actions/advertisements";
import { AD_PRICE_PER_DAY_KES, MAX_AD_DAYS } from "@/lib/validations/advertisement";
import { Modal } from "@/components/ui/Modal";
import { FormAlert } from "@/components/ui/FormAlert";
import { FieldError } from "@/components/ui/FieldError";
import { SignInPrompt } from "@/components/ui/SignInPrompt";
import { MyAdvertisementsTable, type MyAdvertisement } from "@/components/MyAdvertisementsTable";
import type { ClientListing } from "@/types/listing";

type AdStatus = "PENDING" | "PENDING_APPROVAL" | "ACTIVE" | "EXPIRED" | "CANCELLED" | "REJECTED";

const MAX_POLL_ATTEMPTS = 20;

export function AdvertiseSection({
  session,
  myListings,
  myAds,
}: {
  session: Session | null;
  myListings: ClientListing[];
  myAds: MyAdvertisement[];
}) {
  const [state, formAction, pending] = useSingleFlightAction(createAdvertisement);
  const [adStatus, setAdStatus] = useState<AdStatus | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [seenAdId, setSeenAdId] = useState<string | null>(null);
  const [days, setDays] = useState(3);
  const [formOpen, setFormOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeAdId = state?.ok ? (state.data?.advertisementId ?? null) : null;
  if (activeAdId && activeAdId !== seenAdId) {
    setSeenAdId(activeAdId);
    setAdStatus("PENDING");
    setPollTimedOut(false);
  }

  useEffect(() => {
    if (!activeAdId) return;
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/advertisements/${activeAdId}/status`);
        if (res.ok) {
          const data = await res.json();
          setAdStatus(data.status);
          setFailureReason(data.failureReason ?? null);
          if (data.status !== "PENDING") {
            if (pollRef.current) clearInterval(pollRef.current);
            return;
          }
        }
      } catch {
        // transient network error while polling; the next tick retries
      }
      if (attempts >= MAX_POLL_ATTEMPTS) {
        if (pollRef.current) clearInterval(pollRef.current);
        setPollTimedOut(true);
      }
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeAdId]);

  // Payment succeeded — thank the owner, then close the form on its own instead of leaving
  // them to dismiss it manually.
  useEffect(() => {
    if (adStatus !== "PENDING_APPROVAL") return;
    const timer = setTimeout(() => setFormOpen(false), 2000);
    return () => clearTimeout(timer);
  }, [adStatus]);

  if (!session) {
    return <SignInPrompt message="Sign in to advertise a listing." />;
  }

  const availableListings = myListings.filter((l) => l.status === "AVAILABLE");

  function handleDaysChange(e: ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value);
    setDays(Number.isFinite(value) ? value : 1);
  }

  const totalAmount = Math.max(1, Math.min(days || 1, MAX_AD_DAYS)) * AD_PRICE_PER_DAY_KES;

  return (
    <div className="flex flex-col gap-6 p-4">
      {!formOpen ? (
        <button
          type="button"
          onClick={() => {
            // Reset any leftover status from a previous submission so a stale "thank you" or
            // error message doesn't flash when the form is reopened.
            setAdStatus(null);
            setFailureReason(null);
            setPollTimedOut(false);
            setFormOpen(true);
          }}
          className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Advertise
        </button>
      ) : (
        <Modal onClose={() => setFormOpen(false)}>
          <form action={formAction} className="flex flex-col gap-4 p-4">
            <h2 className="text-base font-semibold">Advertise a listing</h2>
            <FormAlert ok={state?.ok} message={state?.message} />

            {availableListings.length === 0 ? (
              <p className="text-sm text-zinc-500">Post a listing first, then come back here to boost it.</p>
            ) : (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  Listing
                  <select
                    name="listingId"
                    required
                    defaultValue=""
                    className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
                  >
                    <option value="" disabled>
                      Select a listing…
                    </option>
                    {availableListings.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                  <FieldError messages={state?.errors?.listingId} />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  Number of days (KES {AD_PRICE_PER_DAY_KES}/day)
                  <input
                    name="days"
                    type="number"
                    min={1}
                    max={MAX_AD_DAYS}
                    required
                    value={days}
                    onChange={handleDaysChange}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
                  />
                  <FieldError messages={state?.errors?.days} />
                  <span className="text-xs text-zinc-500">Total: KES {totalAmount.toLocaleString()}</span>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  M-Pesa phone number
                  <input
                    name="phone"
                    type="tel"
                    required
                    placeholder="07XXXXXXXX"
                    defaultValue={session.user.phone ?? ""}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
                  />
                  <FieldError messages={state?.errors?.phone} />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  YouTube video URL (optional)
                  <input
                    name="youtubeUrl"
                    type="url"
                    placeholder="https://youtube.com/watch?v=…"
                    className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
                  />
                  <FieldError messages={state?.errors?.youtubeUrl} />
                </label>

                <button
                  type="submit"
                  disabled={pending || (adStatus === "PENDING" && !pollTimedOut)}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {pending
                    ? "Starting payment…"
                    : adStatus === "PENDING" && !pollTimedOut
                      ? "Waiting for payment…"
                      : `Pay KES ${totalAmount.toLocaleString()} with M-Pesa`}
                </button>

                {adStatus && (
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-sm">
                    {adStatus === "PENDING" && pollTimedOut && (
                      <p className="text-red-600 dark:text-red-400">
                        {failureReason ??
                          "We're still confirming your payment — if money left your account, your advert will go live automatically once M-Pesa confirms it. Reopen this page in a minute to check."}
                      </p>
                    )}
                    {adStatus === "PENDING" && !pollTimedOut && (
                      <p>Check your phone and enter your M-Pesa PIN to complete payment…</p>
                    )}
                    {adStatus === "PENDING_APPROVAL" && (
                      <p className="text-emerald-600 dark:text-emerald-400">
                        Thank you! Payment received — your advert is now awaiting admin approval. Closing…
                      </p>
                    )}
                    {adStatus === "ACTIVE" && (
                      <p className="text-emerald-600 dark:text-emerald-400">Your listing is now boosted.</p>
                    )}
                    {(adStatus === "CANCELLED" || adStatus === "EXPIRED") && (
                      <p className="text-red-600 dark:text-red-400">
                        {failureReason ?? "Payment was not completed. You can try again."}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </form>
        </Modal>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">My advertisements</h3>
        <MyAdvertisementsTable ads={myAds} defaultPhone={session.user.phone ?? ""} />
      </div>
    </div>
  );
}
