import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { queryStkPushStatus } from "@/lib/mpesa";
import { handleListingBadgeCallback } from "@/lib/mpesaCallbacks";

export async function GET(_request: Request, ctx: RouteContext<"/api/listings/[id]/badge-status">) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await ctx.params;
  let listing = await prisma.listing.findUnique({
    where: { id },
    select: { sellerId: true, badge: true, badgeFailureReason: true, badgeCheckoutRequestId: true },
  });

  if (!listing || (listing.sellerId !== session.user.id && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  if (!listing.badge && !listing.badgeFailureReason && listing.badgeCheckoutRequestId) {
    const result = await queryStkPushStatus(listing.badgeCheckoutRequestId);
    if (result.outcome !== "pending") {
      await handleListingBadgeCallback(
        { id },
        result.outcome === "succeeded",
        result.outcome === "failed" ? result.resultDesc : undefined,
        undefined
      );
      listing = await prisma.listing.findUnique({
        where: { id },
        select: { sellerId: true, badge: true, badgeFailureReason: true, badgeCheckoutRequestId: true },
      });
    }
  }

  return NextResponse.json({ badge: listing!.badge, failureReason: listing!.badgeFailureReason });
}
