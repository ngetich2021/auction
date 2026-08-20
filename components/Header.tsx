"use client";

import { signIn } from "next-auth/react";
import { useTransition } from "react";
import type { Session } from "next-auth";
import { MediaPlayer, type PromoVideo } from "@/components/MediaPlayer";
import { ProfileMenu } from "@/components/ProfileMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InstallAppButton } from "@/components/InstallAppButton";

export function Header({ session, promoVideos }: { session: Session | null; promoVideos: PromoVideo[] }) {
  const [signingIn, startSignIn] = useTransition();

  return (
    <header className="flex flex-col border-b border-zinc-900 dark:border-zinc-100">
      <div className="flex items-center justify-end gap-3 px-4 pt-3">
        <InstallAppButton />
        <ThemeToggle />
        {session?.user ? (
          <ProfileMenu user={session.user} />
        ) : (
          <button
            type="button"
            onClick={() => startSignIn(() => signIn("google", { redirectTo: "/" }))}
            disabled={signingIn}
            className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {signingIn ? "Signing in…" : "Sign in"}
          </button>
        )}
      </div>

      <h1 className="px-4 pb-4 pt-2 text-center text-xl font-bold leading-tight">
        Auction items here, get more interested buyers
      </h1>

      <MediaPlayer videos={promoVideos} session={session} />
    </header>
  );
}
