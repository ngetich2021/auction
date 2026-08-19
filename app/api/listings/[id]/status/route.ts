import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, ctx: RouteContext<"/api/listings/[id]/status">) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { status: true, sellerId: true, failureReason: true },
  });

  if (!listing || listing.sellerId !== session.user.id) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  return NextResponse.json({ status: listing.status, failureReason: listing.failureReason });
}
