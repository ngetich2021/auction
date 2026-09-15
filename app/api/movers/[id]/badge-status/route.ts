import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { queryStkPushStatus } from "@/lib/mpesa";
import { handleMoverBadgeCallback } from "@/lib/mpesaCallbacks";

export async function GET(_request: Request, ctx: RouteContext<"/api/movers/[id]/badge-status">) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await ctx.params;
  let mover = await prisma.mover.findUnique({
    where: { id },
    select: { ownerId: true, badge: true, badgeFailureReason: true, badgeCheckoutRequestId: true },
  });

  if (!mover || (mover.ownerId !== session.user.id && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  if (!mover.badge && !mover.badgeFailureReason && mover.badgeCheckoutRequestId) {
    const result = await queryStkPushStatus(mover.badgeCheckoutRequestId);
    if (result.outcome !== "pending") {
      await handleMoverBadgeCallback(
        { id },
        result.outcome === "succeeded",
        result.outcome === "failed" ? result.resultDesc : undefined,
        undefined
      );
      mover = await prisma.mover.findUnique({
        where: { id },
        select: { ownerId: true, badge: true, badgeFailureReason: true, badgeCheckoutRequestId: true },
      });
    }
  }

  return NextResponse.json({ badge: mover!.badge, failureReason: mover!.badgeFailureReason });
}
