"use client";

import { useSingleFlightAction } from "@/hooks/useSingleFlightAction";
import { submitContactMessage } from "@/lib/actions/contact";
import { FormAlert } from "@/components/ui/FormAlert";
import { FieldError } from "@/components/ui/FieldError";

export function ContactForm({ defaultName, defaultEmail }: { defaultName?: string; defaultEmail?: string }) {
  const [state, formAction, pending] = useSingleFlightAction(submitContactMessage);
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
        Phone (optional)
        <input
          name="phone"
          type="tel"
          placeholder="07XXXXXXXX"
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
        />
        <FieldError messages={errors.phone} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Subject
        <input
          name="subject"
          required
          minLength={2}
          maxLength={120}
          placeholder="What's this about?"
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
        />
        <FieldError messages={errors.subject} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Message
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
        />
        <FieldError messages={errors.message} />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
