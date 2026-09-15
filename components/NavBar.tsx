"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

function NavLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return <span className={pending ? "animate-pulse opacity-50" : ""}>{label}</span>;
}

export function NavBar({ isLoggedIn, isAdmin }: { isLoggedIn: boolean; isAdmin: boolean }) {
  const pathname = usePathname();

  const items: { href: string; label: string }[] = [
    { href: "/", label: "browse" },
    { href: "/offers", label: "offers" },
    { href: "/movers", label: "movers" },
    { href: "/eateries", label: "eateries" },
    { href: "/post", label: "post" },
    { href: "/advertise", label: "advertise" },
    ...(isLoggedIn ? [{ href: "/orders", label: "orders" }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "admin" }] : []),
    ...(isLoggedIn ? [{ href: "/settings", label: "settings" }] : []),
  ];

  return (
    <nav className="flex overflow-x-auto border-b border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 whitespace-nowrap px-3 py-3 text-center text-sm ${
              active ? "font-bold text-zinc-900 dark:text-zinc-100" : "font-medium text-zinc-500 dark:text-zinc-400"
            }`}
          >
            <NavLabel label={item.label} />
          </Link>
        );
      })}
    </nav>
  );
}
