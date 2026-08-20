"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// On a touch device (phone/tablet) the tel: link should just dial. On desktop there's no
// dialer to hand off to, so clicking instead reveals the number to read/copy. Checked at
// click time via a pointer-type media query — never during render — so there's nothing for
// the server-rendered markup to mismatch against on hydration.
export function CallButton({ phone, className }: { phone: string; className?: string }) {
  const [revealed, setRevealed] = useState(false);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    if (!isTouchDevice) {
      e.preventDefault();
      setRevealed(true);
    }
  }

  return (
    <a href={`tel:${phone}`} onClick={handleClick} className={cn(className)}>
      {revealed ? phone : "Call"}
    </a>
  );
}
