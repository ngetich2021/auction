import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { queryStkPushStatus } from "@/lib/mpesa";
import { handleOrderCallback } from "@/lib/mpesaCallbacks";

export async function GET(_request: Request, ctx: RouteContext<"/api/orders/[id]/status">) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await ctx.params;
  let order = await prisma.order.findUnique({
    where: { id },
    select: {
      status: true,
      buyerId: true,
      listingId: true,
      quantity: true,
      failureReason: true,
      mpesaCheckoutRequestId: true,
    },
  });

  if (!order || order.buyerId !== session.user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  // The webhook that normally flips this out of PENDING is a passive listener — if it never
  // reached us, actively ask Safaricom for the real outcome instead of leaving the buyer
  // staring at "PENDING" for a payment that may have already gone through on their phone.
  if (order.status === "PENDING" && !order.failureReason && order.mpesaCheckoutRequestId) {
    const result = await queryStkPushStatus(order.mpesaCheckoutRequestId);
    if (result.outcome !== "pending") {
      await handleOrderCallback(
        { id, listingId: order.listingId, buyerId: order.buyerId, quantity: order.quantity },
        result.outcome === "succeeded",
        result.outcome === "failed" ? result.resultDesc : undefined,
        undefined
      );
      order = await prisma.order.findUnique({
        where: { id },
        select: {
          status: true,
          buyerId: true,
          listingId: true,
          quantity: true,
          failureReason: true,
          mpesaCheckoutRequestId: true,
        },
      });
    }
  }

  return NextResponse.json({ status: order!.status, failureReason: order!.failureReason });
}
