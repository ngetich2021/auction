import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { queryStkPushStatus } from "@/lib/mpesa";
import { handleOfferBadgeCallback } from "@/lib/mpesaCallbacks";

export async function GET(_request: Request, ctx: RouteContext<"/api/offers/[id]/badge-status">) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await ctx.params;
  let offer = await prisma.offer.findUnique({
    where: { id },
    select: { ownerId: true, badge: true, badgeFailureReason: true, badgeCheckoutRequestId: true },
  });

  if (!offer || (offer.ownerId !== session.user.id && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Offer not found." }, { status: 404 });
  }

  // Same reconciliation as /api/listings/[id]/status: the webhook is a passive listener, so
  // actively check with Safaricom in case it never reached us.
  if (!offer.badge && !offer.badgeFailureReason && offer.badgeCheckoutRequestId) {
    const result = await queryStkPushStatus(offer.badgeCheckoutRequestId);
    if (result.outcome !== "pending") {
      await handleOfferBadgeCallback(
        { id },
        result.outcome === "succeeded",
        result.outcome === "failed" ? result.resultDesc : undefined,
        undefined
      );
      offer = await prisma.offer.findUnique({
        where: { id },
        select: { ownerId: true, badge: true, badgeFailureReason: true, badgeCheckoutRequestId: true },
      });
    }
  }

  return NextResponse.json({ badge: offer!.badge, failureReason: offer!.badgeFailureReason });
}
