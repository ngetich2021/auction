import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mail";

type StkCallbackItem = { Name: string; Value?: string | number };
type StkCallback = {
  CheckoutRequestID?: string;
  ResultCode?: number;
  ResultDesc?: string;
  CallbackMetadata?: { Item?: StkCallbackItem[] };
};

const ACK = { ResultCode: 0, ResultDesc: "Accepted" };

export async function POST(request: Request) {
  let body: { Body?: { stkCallback?: StkCallback } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(ACK);
  }

  const callback = body?.Body?.stkCallback;
  const checkoutRequestId = callback?.CheckoutRequestID;
  if (!callback || !checkoutRequestId) {
    return NextResponse.json(ACK);
  }

  const succeeded = callback.ResultCode === 0;
  const items = callback.CallbackMetadata?.Item ?? [];
  const receipt = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value;
  const receiptNumber = typeof receipt === "string" ? receipt : undefined;

  try {
    const order = await prisma.order.findFirst({ where: { mpesaCheckoutRequestId: checkoutRequestId } });
    if (order) {
      await handleOrderCallback(order, succeeded, callback.ResultDesc, receiptNumber);
      return NextResponse.json(ACK);
    }

    const ad = await prisma.advertisement.findFirst({ where: { mpesaCheckoutRequestId: checkoutRequestId } });
    if (ad) {
      await handleAdvertisementCallback(ad, succeeded, callback.ResultDesc, receiptNumber);
      return NextResponse.json(ACK);
    }

    const listing = await prisma.listing.findFirst({ where: { mpesaCheckoutRequestId: checkoutRequestId } });
    if (listing) {
      await handleListingCallback(listing, succeeded, callback.ResultDesc, receiptNumber);
    }

    return NextResponse.json(ACK);
  } catch (error) {
    console.error("M-Pesa callback processing failed", error);
    return NextResponse.json(ACK);
  }
}

async function handleOrderCallback(
  order: { id: string; listingId: string; buyerId: string; quantity: number },
  succeeded: boolean,
  resultDesc: string | undefined,
  receiptNumber: string | undefined
) {
  if (!succeeded) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "FAILED", failureReason: resultDesc ?? "Payment was not completed." },
    });
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "PAID", mpesaReceipt: receiptNumber ?? null },
  });

  const listing = await prisma.listing.findUnique({ where: { id: order.listingId } });
  if (listing) {
    const remaining = Math.max(listing.quantity - order.quantity, 0);
    await prisma.listing.update({
      where: { id: listing.id },
      data: { quantity: remaining, status: remaining <= 0 ? "SOLD" : listing.status },
    });
  }

  const buyer = await prisma.user.findUnique({ where: { id: order.buyerId } });
  if (buyer?.email) {
    await sendMail({
      to: buyer.email,
      subject: "Your order is confirmed",
      html: `<p>Your payment for "${listing?.title ?? "your order"}" was received.</p><p>M-Pesa receipt: ${
        receiptNumber ?? "N/A"
      }</p>`,
    });
  }
}

async function handleAdvertisementCallback(
  ad: { id: string; ownerId: string; listingId: string },
  succeeded: boolean,
  resultDesc: string | undefined,
  receiptNumber: string | undefined
) {
  if (!succeeded) {
    await prisma.advertisement.update({
      where: { id: ad.id },
      data: { status: "CANCELLED", failureReason: resultDesc ?? "Payment was not completed." },
    });
    return;
  }

  // Payment succeeded, but the ad still needs an admin to review the content before it goes live.
  await prisma.advertisement.update({
    where: { id: ad.id },
    data: { status: "PENDING_APPROVAL", mpesaReceipt: receiptNumber ?? null },
  });

  const [listing, admins] = await Promise.all([
    prisma.listing.findUnique({ where: { id: ad.listingId }, select: { title: true } }),
    prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } }),
  ]);

  await Promise.all(
    admins.map((admin) =>
      sendMail({
        to: admin.email,
        subject: "An advertisement is awaiting your approval",
        html: `<p>A new advertisement for "${
          listing?.title ?? "a listing"
        }" was paid for and is waiting for approval before it goes live.</p><p>Review it in the admin dashboard.</p>`,
      })
    )
  );
}

async function handleListingCallback(
  listing: { id: string; sellerId: string; title: string },
  succeeded: boolean,
  resultDesc: string | undefined,
  receiptNumber: string | undefined
) {
  if (!succeeded) {
    await prisma.listing.update({
      where: { id: listing.id },
      data: { failureReason: resultDesc ?? "Payment was not completed." },
    });
    return;
  }

  await prisma.listing.update({
    where: { id: listing.id },
    data: { status: "AVAILABLE", mpesaReceipt: receiptNumber ?? null, failureReason: null },
  });

  const seller = await prisma.user.findUnique({ where: { id: listing.sellerId } });
  if (seller?.email) {
    await sendMail({
      to: seller.email,
      subject: "Your listing is live",
      html: `<p>Your posting fee for "${listing.title}" was received and your listing is now live.</p><p>M-Pesa receipt: ${
        receiptNumber ?? "N/A"
      }</p>`,
    });
  }
}
