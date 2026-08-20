"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { initiateStkPush, MpesaError } from "@/lib/mpesa";
import { sendMail } from "@/lib/mail";
import {
  AD_PRICE_PER_DAY_KES,
  MAX_AD_DAYS,
  createAdvertisementSchema,
  editAdvertisementVideoSchema,
} from "@/lib/validations/advertisement";
import { requireAccess } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/actions/types";
import type { AdStatus } from "@prisma/client";

const NON_TERMINAL_STATUSES: AdStatus[] = ["PENDING", "PENDING_APPROVAL", "ACTIVE"];

export async function createAdvertisement(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in to advertise a listing." };
  }

  const result = createAdvertisementSchema.safeParse({
    listingId: formData.get("listingId"),
    days: formData.get("days"),
    phone: formData.get("phone"),
    youtubeUrl: formData.get("youtubeUrl"),
  });

  if (!result.success) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      errors: result.error.flatten().fieldErrors,
    };
  }

  const listing = await prisma.listing.findUnique({ where: { id: result.data.listingId } });
  if (!listing) {
    return { ok: false, message: "Listing not found." };
  }
  if (listing.sellerId !== session.user.id) {
    return { ok: false, message: "You can only advertise your own listings." };
  }

  const videoUrl = result.data.youtubeUrl ? result.data.youtubeUrl.trim() : null;
  const amount = result.data.days * AD_PRICE_PER_DAY_KES;

  const ad = await prisma.advertisement.create({
    data: {
      listingId: listing.id,
      ownerId: session.user.id,
      plan: `${result.data.days}-day boost`,
      amount,
      status: "PENDING",
      videoUrl,
    },
  });

  try {
    const stk = await initiateStkPush({
      phone: result.data.phone,
      amount,
      accountReference: ad.id,
      transactionDesc: "Ad boost",
    });
    await prisma.advertisement.update({
      where: { id: ad.id },
      data: { mpesaCheckoutRequestId: stk.checkoutRequestId },
    });
  } catch (error) {
    const message = error instanceof MpesaError ? error.message : "Could not start M-Pesa payment. Please try again.";
    await prisma.advertisement.update({
      where: { id: ad.id },
      data: { status: "CANCELLED", failureReason: message },
    });
    return { ok: false, message };
  }

  revalidatePath("/");
  return {
    ok: true,
    message: "Check your phone to complete the M-Pesa payment.",
    data: { advertisementId: ad.id },
  };
}

export async function extendAdvertisement(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const adId = formData.get("advertisementId");
  const daysRaw = formData.get("days");
  const days = typeof daysRaw === "string" ? Number(daysRaw) : NaN;
  const phone = formData.get("phone");

  if (typeof adId !== "string" || !adId || typeof phone !== "string" || !phone) {
    return { ok: false, message: "Invalid request." };
  }
  if (!Number.isInteger(days) || days < 1 || days > MAX_AD_DAYS) {
    return { ok: false, message: `Enter a number of days between 1 and ${MAX_AD_DAYS}.` };
  }

  const ad = await prisma.advertisement.findUnique({ where: { id: adId } });
  if (!ad || ad.ownerId !== session.user.id) {
    return { ok: false, message: "Advertisement not found." };
  }
  if (ad.status !== "ACTIVE" && ad.status !== "EXPIRED") {
    return { ok: false, message: "Only an active or expired advertisement can be extended." };
  }
  if (ad.pendingExtensionDays) {
    return { ok: false, message: "An extension payment is already in progress for this advertisement." };
  }

  const amount = days * AD_PRICE_PER_DAY_KES;

  try {
    const stk = await initiateStkPush({
      phone,
      amount,
      accountReference: ad.id,
      transactionDesc: "Ad extension",
    });
    await prisma.advertisement.update({
      where: { id: ad.id },
      data: { mpesaCheckoutRequestId: stk.checkoutRequestId, pendingExtensionDays: days },
    });
  } catch (error) {
    const message = error instanceof MpesaError ? error.message : "Could not start M-Pesa payment. Please try again.";
    return { ok: false, message };
  }

  revalidatePath("/");
  return {
    ok: true,
    message: "Check your phone to complete the M-Pesa payment for the extension.",
    data: { advertisementId: ad.id },
  };
}

export async function cancelAdvertisement(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const adId = formData.get("advertisementId");
  if (typeof adId !== "string" || !adId) {
    return { ok: false, message: "Invalid request." };
  }

  const ad = await prisma.advertisement.findUnique({ where: { id: adId }, select: { ownerId: true, status: true } });
  if (!ad || ad.ownerId !== session.user.id) {
    return { ok: false, message: "Advertisement not found." };
  }
  if (!NON_TERMINAL_STATUSES.includes(ad.status)) {
    return { ok: false, message: "This advertisement is already cancelled or expired." };
  }

  await prisma.advertisement.update({
    where: { id: adId },
    data: { status: "CANCELLED", failureReason: "Cancelled by owner", pendingExtensionDays: null },
  });

  revalidatePath("/");
  return { ok: true, message: "Advertisement cancelled." };
}

export async function approveAdvertisement(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAccess("adverts", "UPDATE");
  if (!session) {
    return { ok: false, message: "Admins only." };
  }

  const adId = formData.get("advertisementId");
  const note = formData.get("note");
  if (typeof adId !== "string" || !adId) {
    return { ok: false, message: "Invalid request." };
  }

  const ad = await prisma.advertisement.findUnique({
    where: { id: adId },
    include: { listing: { select: { title: true } }, owner: { select: { email: true } } },
  });
  if (!ad || ad.status !== "PENDING_APPROVAL") {
    return { ok: false, message: "This advertisement is not awaiting approval." };
  }

  const days = Math.max(1, Math.round(ad.amount / AD_PRICE_PER_DAY_KES));
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000);
  const adminNote = typeof note === "string" && note.trim() ? note.trim() : null;

  await prisma.advertisement.update({
    where: { id: adId },
    data: { status: "ACTIVE", startsAt, endsAt, adminNote },
  });

  if (ad.owner.email) {
    await sendMail({
      to: ad.owner.email,
      subject: "Your advertisement was approved",
      html: `<p>Your advertisement for "${ad.listing.title}" was approved and is now playing.</p>${
        adminNote ? `<p>Note from admin: ${adminNote}</p>` : ""
      }`,
    });
  }

  revalidatePath("/");
  return { ok: true, message: "Advertisement approved and now live." };
}

export async function rejectAdvertisement(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAccess("adverts", "UPDATE");
  if (!session) {
    return { ok: false, message: "Admins only." };
  }

  const adId = formData.get("advertisementId");
  const note = formData.get("note");
  if (typeof adId !== "string" || !adId) {
    return { ok: false, message: "Invalid request." };
  }

  const ad = await prisma.advertisement.findUnique({
    where: { id: adId },
    include: { listing: { select: { title: true } }, owner: { select: { email: true } } },
  });
  if (!ad || !NON_TERMINAL_STATUSES.includes(ad.status)) {
    return { ok: false, message: "This advertisement cannot be rejected." };
  }

  const adminNote = typeof note === "string" && note.trim() ? note.trim() : null;

  // Rejection never touches the amount already paid — the advert just moves to REJECTED so the
  // owner can fix the video and resubmit for approval using the same payment.
  await prisma.advertisement.update({
    where: { id: adId },
    data: {
      status: "REJECTED",
      failureReason: adminNote ?? "Rejected by admin",
      adminNote,
      pendingExtensionDays: null,
    },
  });

  if (ad.owner.email) {
    await sendMail({
      to: ad.owner.email,
      subject: "Your advertisement was rejected",
      html: `<p>Your advertisement for "${ad.listing.title}" was rejected by an admin.</p>${
        adminNote ? `<p>Reason: ${adminNote}</p>` : ""
      }<p>Your payment is unaffected — you can edit the advert and resubmit it for approval.</p>`,
    });
  }

  revalidatePath("/");
  return { ok: true, message: "Advertisement rejected." };
}

export async function editRejectedAdvertisement(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const result = editAdvertisementVideoSchema.safeParse({
    advertisementId: formData.get("advertisementId"),
    youtubeUrl: formData.get("youtubeUrl"),
  });

  if (!result.success) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      errors: result.error.flatten().fieldErrors,
    };
  }

  const ad = await prisma.advertisement.findUnique({ where: { id: result.data.advertisementId } });
  if (!ad || ad.ownerId !== session.user.id) {
    return { ok: false, message: "Advertisement not found." };
  }
  if (ad.status !== "REJECTED") {
    return { ok: false, message: "Only a rejected advertisement can be edited." };
  }

  const videoUrl = result.data.youtubeUrl ? result.data.youtubeUrl.trim() : null;

  // The advert was already paid for — resubmitting for approval reuses that payment, no new
  // M-Pesa charge, so the funds the customer already sent stay usable.
  await prisma.advertisement.update({
    where: { id: ad.id },
    data: {
      videoUrl,
      status: "PENDING_APPROVAL",
      failureReason: null,
    },
  });

  revalidatePath("/");
  return { ok: true, message: "Advertisement updated and resubmitted for approval." };
}
