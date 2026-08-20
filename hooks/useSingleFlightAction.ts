"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/lib/actions/types";

/**
 * Wraps useActionState so a form's submit button can only trigger one
 * in-flight request at a time — guards against duplicate submissions
 * from fast repeat clicks (critical for the M-Pesa payment actions).
 */
export function useSingleFlightAction(
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>
) {
  const [state, dispatch, pending] = useActionState(action, undefined);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!pending) inFlight.current = false;
  }, [pending]);

  function guardedDispatch(formData: FormData) {
    if (inFlight.current || pending) return;
    inFlight.current = true;
    // Imperative callers (onClick, onCheckedChange, etc.) don't get the transition wrapping a
    // <form action={...}> submission gets for free, so useActionState's dispatch needs it here.
    startTransition(() => dispatch(formData));
  }

  return [state, guardedDispatch, pending] as const;
}
