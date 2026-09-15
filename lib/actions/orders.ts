"use server";

import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createOrderSchema } from "@/lib/validations/order";
import type { ActionState } from "@/lib/actions/types";

// Orders connect a buyer and seller for an auction listing — the purchase amount itself is
// settled directly between them (see Terms §5), so this never initiates an M-Pesa payment.
export async function createOrder(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in to place an order." };
  }

  const result = createOrderSchema.safeParse({
    listingId: formData.get("listingId"),
    quantity: formData.get("quantity"),
    phone: formData.get("phone"),
  });
  if (!result.success) {
    return { ok: false, message: "Please fix the errors below.", errors: result.error.flatten().fieldErrors };
  }

  const listing = await prisma.listing.findUnique({ where: { id: result.data.listingId } });
  if (!listing || listing.status !== "AVAILABLE") {
    return { ok: false, message: "This listing is no longer available." };
  }
  if (listing.sellerId === session.user.id) {
    return { ok: false, message: "You cannot buy your own listing." };
  }
  if (result.data.quantity > listing.quantity) {
    return {
      ok: false,
      message: `Only ${listing.quantity} available.`,
      errors: { quantity: [`Only ${listing.quantity} available.`] },
    };
  }

  const totalAmount = listing.price * result.data.quantity;

  const order = await prisma.order.create({
    data: {
      listingId: listing.id,
      buyerId: session.user.id,
      quantity: result.data.quantity,
      totalAmount,
      phone: result.data.phone,
      status: "COMPLETED",
    },
  });

  const remaining = Math.max(listing.quantity - result.data.quantity, 0);
  await prisma.listing.update({
    where: { id: listing.id },
    data: { quantity: remaining, status: remaining <= 0 ? "SOLD" : listing.status },
  });

  revalidatePath("/");
  updateTag("orders");
  updateTag("listings");
  updateTag("admin-orders");
  updateTag("admin-listings");
  return {
    ok: true,
    message: "Order confirmed. Contact the seller to arrange payment and pickup/delivery.",
    data: { orderId: order.id },
  };
}

export async function cancelOrder(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const orderId = formData.get("orderId");
  if (typeof orderId !== "string" || !orderId) {
    return { ok: false, message: "Invalid order." };
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.buyerId !== session.user.id) {
    return { ok: false, message: "Order not found." };
  }
  if (order.status !== "COMPLETED") {
    return { ok: false, message: "This order can no longer be cancelled." };
  }

  await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
  revalidatePath("/");
  updateTag("orders");
  updateTag("admin-orders");
  return { ok: true, message: "Order cancelled." };
}
