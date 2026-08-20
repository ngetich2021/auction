import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleOrderCallback, handleAdvertisementCallback, handleListingCallback } from "@/lib/mpesaCallbacks";

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
