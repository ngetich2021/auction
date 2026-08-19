"use client";

import { useActionState, useEffect, useRef } from "react";
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
    dispatch(formData);
  }

  return [state, guardedDispatch, pending] as const;
}
