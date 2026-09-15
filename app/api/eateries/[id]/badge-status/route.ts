import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { queryStkPushStatus } from "@/lib/mpesa";
import { handleEateryBadgeCallback } from "@/lib/mpesaCallbacks";

export async function GET(_request: Request, ctx: RouteContext<"/api/eateries/[id]/badge-status">) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await ctx.params;
  let eatery = await prisma.eatery.findUnique({
    where: { id },
    select: { ownerId: true, badge: true, badgeFailureReason: true, badgeCheckoutRequestId: true },
  });

  if (!eatery || (eatery.ownerId !== session.user.id && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Eatery not found." }, { status: 404 });
  }

  if (!eatery.badge && !eatery.badgeFailureReason && eatery.badgeCheckoutRequestId) {
    const result = await queryStkPushStatus(eatery.badgeCheckoutRequestId);
    if (result.outcome !== "pending") {
      await handleEateryBadgeCallback(
        { id },
        result.outcome === "succeeded",
        result.outcome === "failed" ? result.resultDesc : undefined,
        undefined
      );
      eatery = await prisma.eatery.findUnique({
        where: { id },
        select: { ownerId: true, badge: true, badgeFailureReason: true, badgeCheckoutRequestId: true },
      });
    }
  }

  return NextResponse.json({ badge: eatery!.badge, failureReason: eatery!.badgeFailureReason });
}
