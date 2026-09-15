import Link from "next/link";
import { auth } from "@/lib/auth";
import { ContactFeedbackTabs } from "@/components/ContactFeedbackTabs";

export const metadata = { title: "Contact & Feedback — Auctions" };

export default async function ContactPage() {
  const session = await auth();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4">
      <div className="flex flex-col gap-1">
        <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
          ← Back to Auctions
        </Link>
        <h1 className="text-xl font-bold">Contact &amp; Feedback</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Have a question, an issue, or something you&apos;d like to tell us? Send us a message below.
        </p>
      </div>

      <ContactFeedbackTabs defaultName={session?.user?.name ?? undefined} defaultEmail={session?.user?.email ?? undefined} />
    </main>
  );
}
