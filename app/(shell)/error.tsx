"use client";

import { useEffect } from "react";

export default function ShellError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-zinc-500">
      <p>Something went wrong. Please try again.</p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Try again
      </button>
    </div>
  );
}
