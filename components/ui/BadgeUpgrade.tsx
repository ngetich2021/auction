"use client";

import { useEffect, useState } from "react";
import { useSingleFlightAction } from "@/hooks/useSingleFlightAction";
import { Modal } from "@/components/ui/Modal";
import { FormAlert } from "@/components/ui/FormAlert";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { BADGE_PRICE_KES } from "@/lib/validations/badge";
import type { ActionState } from "@/lib/actions/types";

const MAX_POLL_ATTEMPTS = 20;

/**
 * "Get a blue star badge" flow shared by Offers/Movers/Eateries: a dropdown item that opens a
 * modal collecting an M-Pesa phone number, starts the STK push via `payAction`, then polls
 * `statusUrl` until the badge is confirmed (or the payment fails/times out).
 */
export function BadgeUpgradeMenuItem({
  idField,
  idValue,
  defaultPhone,
  payAction,
  statusUrl,
}: {
  idField: string;
  idValue: string;
  defaultPhone: string;
  payAction: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  statusUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useSingleFlightAction(payAction);
  const [badge, setBadge] = useState(false);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);

  const paymentStarted = open && state?.ok === true;

  useEffect(() => {
    if (!paymentStarted) return;
    let attempts = 0;
    const pollId = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch(statusUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.badge) {
            setBadge(true);
            clearInterval(pollId);
            return;
          }
          if (data.failureReason) {
            setFailureReason(data.failureReason);
            clearInterval(pollId);
            return;
          }
        }
      } catch {
        // transient network error while polling; the next tick retries
      }
      if (attempts >= MAX_POLL_ATTEMPTS) {
        clearInterval(pollId);
        setPollTimedOut(true);
      }
    }, 3000);
    return () => clearInterval(pollId);
  }, [paymentStarted, state, statusUrl]);

  useEffect(() => {
    if (!badge) return;
    const timer = setTimeout(() => setOpen(false), 2000);
    return () => clearTimeout(timer);
  }, [badge]);

  function openModal() {
    setBadge(false);
    setFailureReason(null);
    setPollTimedOut(false);
    setOpen(true);
  }

  const waiting = paymentStarted && !badge && !failureReason && !pollTimedOut;

  return (
    <>
      <DropdownMenuItem onClick={openModal}>Get blue star badge (KES {BADGE_PRICE_KES})</DropdownMenuItem>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <form action={formAction} className="flex flex-col gap-4 p-4">
            <h3 className="text-sm font-semibold">Get the blue star badge</h3>
            <p className="text-sm text-zinc-500">
              Free listings only show to people within 500m of them. Pay KES {BADGE_PRICE_KES} once to get a blue
              star badge and be visible to everyone searching nearby, no matter the distance.
            </p>
            <FormAlert ok={state?.ok} message={state?.message} />
            <input type="hidden" name={idField} value={idValue} />

            <label className="flex flex-col gap-1 text-sm">
              M-Pesa phone number
              <input
                name="phone"
                type="tel"
                required
                placeholder="07XXXXXXXX"
                defaultValue={defaultPhone}
                disabled={paymentStarted}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 disabled:opacity-50"
              />
            </label>

            <button
              type="submit"
              disabled={pending || waiting}
              className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {pending ? "Starting payment…" : waiting ? "Waiting for payment…" : `Pay KES ${BADGE_PRICE_KES}`}
            </button>

            {paymentStarted && (
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-sm">
                {waiting && <p>Check your phone and enter your M-Pesa PIN to complete the payment…</p>}
                {pollTimedOut && !badge && !failureReason && (
                  <p className="text-red-600 dark:text-red-400">
                    Still confirming — if money left your account, the badge will appear automatically once M-Pesa
                    confirms it. Reopen this in a minute to check.
                  </p>
                )}
                {failureReason && <p className="text-red-600 dark:text-red-400">{failureReason}</p>}
                {badge && (
                  <p className="text-emerald-600 dark:text-emerald-400">
                    Payment received! You now have the blue star badge. Closing…
                  </p>
                )}
              </div>
            )}
          </form>
        </Modal>
      )}
    </>
  );
}
