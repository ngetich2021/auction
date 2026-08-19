"use client";

import { signOut } from "next-auth/react";
import { useTransition } from "react";
import type { Session } from "next-auth";
import { useSingleFlightAction } from "@/hooks/useSingleFlightAction";
import { updateProfile } from "@/lib/actions/settings";
import { FormAlert } from "@/components/ui/FormAlert";
import { FieldError } from "@/components/ui/FieldError";
import { SignInPrompt } from "@/components/ui/SignInPrompt";

export function SettingsSection({ session }: { session: Session | null }) {
  const [state, formAction, pending] = useSingleFlightAction(updateProfile);
  const [signingOut, startSignOut] = useTransition();

  if (!session) {
    return <SignInPrompt message="Sign in to manage your settings." />;
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <form action={formAction} className="flex flex-col gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
        <h2 className="text-base font-semibold">Profile settings</h2>
        <FormAlert ok={state?.ok} message={state?.message} />

        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            name="name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={session.user.name ?? ""}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          />
          <FieldError messages={state?.errors?.name} />
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

        <div className="text-sm text-zinc-500">Signed in as {session.user.email}</div>

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => startSignOut(() => signOut({ redirectTo: "/" }))}
        disabled={signingOut}
        className="self-start rounded-full border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
