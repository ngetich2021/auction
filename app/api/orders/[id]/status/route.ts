import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, ctx: RouteContext<"/api/orders/[id]/status">) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: { status: true, buyerId: true, failureReason: true },
  });

  if (!order || order.buyerId !== session.user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json({ status: order.status, failureReason: order.failureReason });
}
