// Shared by both the server-only assistant prompt (lib/assistant.ts) and the client chat widget —
// kept in its own file (no "server-only") so the widget can import labels without pulling in
// server-only code.
export const NAV_LINKS: Record<string, string> = {
  "/": "Browse",
  "/post": "Post a listing",
  "/advertise": "Advertise",
  "/offers": "Offers",
  "/movers": "Movers",
  "/eateries": "Eateries",
  "/orders": "Orders",
  "/settings": "Settings",
};
