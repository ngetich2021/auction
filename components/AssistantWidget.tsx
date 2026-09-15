"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { NAV_LINKS } from "@/lib/assistantNav";

type ChatMessage = { role: "user" | "assistant"; content: string; navigate?: string | null };

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hi! I can help you find your way around Auctions, explain fees, or walk you through posting or buying something. What do you need?",
};

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setMessages((prev) => [...prev, { role: "assistant", content: data.text, navigate: data.navigate }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="flex h-[28rem] w-[90vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
            <span className="text-sm font-semibold">Auctions assistant</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              ✕
            </button>
          </div>

          <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.navigate && NAV_LINKS[m.navigate] && (
                    <Link
                      href={m.navigate}
                      onClick={() => setOpen(false)}
                      className="mt-2 inline-block rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                    >
                      Go to {NAV_LINKS[m.navigate]} →
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {sending && <p className="text-xs text-zinc-400">Thinking…</p>}
            {error && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2 border-t border-zinc-200 dark:border-zinc-800 p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              maxLength={2000}
              disabled={sending}
              className="min-w-0 flex-1 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="shrink-0 rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-xl text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
