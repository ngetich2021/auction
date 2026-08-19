"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { initiateStkPush, MpesaError } from "@/lib/mpesa";
import { createOrderSchema } from "@/lib/validations/order";
import type { ActionState } from "@/lib/actions/types";

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
      status: "PENDING",
    },
  });

  try {
    const stk = await initiateStkPush({
      phone: result.data.phone,
      amount: totalAmount,
      accountReference: order.id,
      transactionDesc: listing.title,
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { mpesaCheckoutRequestId: stk.checkoutRequestId },
    });
  } catch (error) {
    const message = error instanceof MpesaError ? error.message : "Could not start M-Pesa payment. Please try again.";
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "FAILED", failureReason: message },
    });
    return { ok: false, message };
  }

  revalidatePath("/");
  return {
    ok: true,
    message: "Check your phone to complete the M-Pesa payment.",
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
  if (order.status !== "PENDING" && order.status !== "FAILED") {
    return { ok: false, message: "This order can no longer be cancelled." };
  }

  await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
  revalidatePath("/");
  return { ok: true, message: "Order cancelled." };
}
