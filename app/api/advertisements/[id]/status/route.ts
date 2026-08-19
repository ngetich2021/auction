import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, ctx: RouteContext<"/api/advertisements/[id]/status">) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const ad = await prisma.advertisement.findUnique({
    where: { id },
    select: { status: true, ownerId: true, failureReason: true },
  });

  if (!ad || ad.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Advertisement not found." }, { status: 404 });
  }

  return NextResponse.json({ status: ad.status, failureReason: ad.failureReason });
}
