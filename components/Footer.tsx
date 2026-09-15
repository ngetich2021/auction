import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-800 px-4 py-6 text-center text-xs text-zinc-500">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Terms &amp; Conditions
        </Link>
        <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Privacy Policy
        </Link>
        <Link href="/contact" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Contact &amp; Feedback
        </Link>
      </div>
      <p className="mt-2">© {new Date().getFullYear()} Disposals. All rights reserved.</p>
    </footer>
  );
}
