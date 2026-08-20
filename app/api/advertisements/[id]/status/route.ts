import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { queryStkPushStatus } from "@/lib/mpesa";
import { handleAdvertisementCallback } from "@/lib/mpesaCallbacks";

export async function GET(_request: Request, ctx: RouteContext<"/api/advertisements/[id]/status">) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await ctx.params;
  let ad = await prisma.advertisement.findUnique({
    where: { id },
    select: {
      status: true,
      ownerId: true,
      listingId: true,
      pendingExtensionDays: true,
      endsAt: true,
      amount: true,
      failureReason: true,
      mpesaCheckoutRequestId: true,
    },
  });

  if (!ad || ad.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Advertisement not found." }, { status: 404 });
  }

  // The webhook that normally flips this out of PENDING is a passive listener — if it never
  // reached us, actively ask Safaricom for the real outcome instead of leaving the owner
  // staring at "PENDING" for a payment that may have already gone through on their phone.
  const awaitingPayment = ad.status === "PENDING" || ad.pendingExtensionDays != null;
  if (awaitingPayment && !ad.failureReason && ad.mpesaCheckoutRequestId) {
    const result = await queryStkPushStatus(ad.mpesaCheckoutRequestId);
    if (result.outcome !== "pending") {
      await handleAdvertisementCallback(
        { id, ownerId: ad.ownerId, listingId: ad.listingId, pendingExtensionDays: ad.pendingExtensionDays, endsAt: ad.endsAt, amount: ad.amount },
        result.outcome === "succeeded",
        result.outcome === "failed" ? result.resultDesc : undefined,
        undefined
      );
      ad = await prisma.advertisement.findUnique({
        where: { id },
        select: {
          status: true,
          ownerId: true,
          listingId: true,
          pendingExtensionDays: true,
          endsAt: true,
          amount: true,
          failureReason: true,
          mpesaCheckoutRequestId: true,
        },
      });
    }
  }

  return NextResponse.json({
    status: ad!.status,
    failureReason: ad!.failureReason,
    pendingExtensionDays: ad!.pendingExtensionDays,
  });
}
