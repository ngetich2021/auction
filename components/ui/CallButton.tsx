"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Never render a bare `tel:` link — it's always a <button>, so there's no tel: URI sitting in
// the DOM for a crawler, screen reader "open link" menu, or right-click to pick up. On a touch
// device (phone/tablet) a click navigates to tel: itself (same effect as a real link, dialer
// opens); on desktop there's no dialer to hand off to, so clicking instead reveals the number
// to read/copy. Checked at click time via a pointer-type media query — never during render —
// so there's nothing for the server-rendered markup to mismatch against on hydration.
export function CallButton({ phone, className }: { phone: string; className?: string }) {
  const [revealed, setRevealed] = useState(false);

  function handleClick() {
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    if (isTouchDevice) {
      window.location.href = `tel:${phone}`;
    } else {
      setRevealed(true);
    }
  }

  return (
    <button type="button" onClick={handleClick} className={cn(className)}>
      {revealed ? phone : "Call"}
    </button>
  );
}
