"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useSingleFlightAction } from "@/hooks/useSingleFlightAction";
import { submitFeedback } from "@/lib/actions/contact";
import { FormAlert } from "@/components/ui/FormAlert";
import { FieldError } from "@/components/ui/FieldError";

export function FeedbackForm({ defaultName, defaultEmail }: { defaultName?: string; defaultEmail?: string }) {
  const [state, formAction, pending] = useSingleFlightAction(submitFeedback);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const errors = state?.errors ?? {};

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <FormAlert ok={state.ok} message={state.message} />
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 p-4">
      <FormAlert ok={state?.ok} message={state?.message} />

      <div className="flex flex-col gap-1 text-sm">
        Rating
        <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} star${value > 1 ? "s" : ""}`}
              onMouseEnter={() => setHoverRating(value)}
              onClick={() => setRating(value)}
              className="p-0.5"
            >
              <Star
                className={`size-6 ${
                  value <= (hoverRating || rating) ? "fill-amber-400 text-amber-400" : "text-zinc-300 dark:text-zinc-700"
                }`}
              />
            </button>
          ))}
        </div>
        <input type="hidden" name="rating" value={rating} />
        <FieldError messages={errors.rating} />
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Your name
        <input
          name="name"
          required
          minLength={2}
          maxLength={80}
          defaultValue={defaultName}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
        />
        <FieldError messages={errors.name} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          defaultValue={defaultEmail}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
        />
        <FieldError messages={errors.email} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        What&apos;s on your mind?
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          placeholder="Tell us what you like or what we could do better…"
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
        />
        <FieldError messages={errors.message} />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}
