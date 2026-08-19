"use client";

import { signIn } from "next-auth/react";
import { useTransition } from "react";

export function SignInPrompt({ message }: { message: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-zinc-500">
      <p>{message}</p>
      <button
        type="button"
        onClick={() => startTransition(() => signIn("google", { redirectTo: "/" }))}
        disabled={pending}
        className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Signing in…" : "Continue with Google"}
      </button>
    </div>
  );
}
