"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Session } from "next-auth";
import { ListingForm } from "@/components/ListingForm";
import { Modal } from "@/components/ui/Modal";
import { SignInPrompt } from "@/components/ui/SignInPrompt";

export function PostSection({ session }: { session: Session | null }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [opening, startOpening] = useTransition();

  if (!session) {
    return <SignInPrompt message="Sign in to post a listing." />;
  }

  function handleAddPostClick() {
    startOpening(() => {
      if (!session?.user.phone) {
        router.push("/settings");
        return;
      }
      setFormOpen(true);
    });
  }

  if (!formOpen) {
    return (
      <button
        type="button"
        onClick={handleAddPostClick}
        disabled={opening}
        className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {opening ? "Loading…" : "Add post"}
      </button>
    );
  }

  return (
    <Modal onClose={() => setFormOpen(false)}>
      {/* Posting is free and immediate — thank the seller, then close the form on its own
          instead of leaving them to dismiss it manually. */}
      <ListingForm phone={session.user.phone ?? ""} onSuccess={() => setTimeout(() => setFormOpen(false), 2000)} />
    </Modal>
  );
}
