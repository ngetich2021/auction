"use client";

import { useState } from "react";
import { ContactForm } from "@/components/ContactForm";
import { FeedbackForm } from "@/components/FeedbackForm";

export function ContactFeedbackTabs({ defaultName, defaultEmail }: { defaultName?: string; defaultEmail?: string }) {
  const [tab, setTab] = useState<"contact" | "feedback">("contact");

  return (
    <div className="flex flex-col gap-2">
      <nav className="flex rounded-full border border-zinc-200 dark:border-zinc-800 p-1">
        {(["contact", "feedback"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
              tab === t
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {t === "contact" ? "Contact us" : "Leave feedback"}
          </button>
        ))}
      </nav>

      {tab === "contact" ? (
        <ContactForm defaultName={defaultName} defaultEmail={defaultEmail} />
      ) : (
        <FeedbackForm defaultName={defaultName} defaultEmail={defaultEmail} />
      )}
    </div>
  );
}
