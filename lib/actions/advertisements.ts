"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { initiateStkPush, MpesaError } from "@/lib/mpesa";
import { uploadPromoVideo } from "@/lib/cloudinary";
import { AD_PRICE_PER_DAY_KES, createAdvertisementSchema, validatePromoVideoFile } from "@/lib/validations/advertisement";
import { requireAdmin } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/actions/types";

export async function createAdvertisement(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in to advertise a listing." };
  }

  const result = createAdvertisementSchema.safeParse({
    listingId: formData.get("listingId"),
    days: formData.get("days"),
    phone: formData.get("phone"),
    videoSource: formData.get("videoSource") || "NONE",
    youtubeUrl: formData.get("youtubeUrl"),
  });

  const videoFileEntry = formData.get("video");
  const hasVideoFile = videoFileEntry instanceof File && videoFileEntry.size > 0;
  const videoFileError =
    result.success && result.data.videoSource === "UPLOAD"
      ? hasVideoFile
        ? validatePromoVideoFile(videoFileEntry as File)
        : "Choose a video file to upload"
      : null;

  if (!result.success || videoFileError) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      errors: {
        ...(result.success ? {} : result.error.flatten().fieldErrors),
        ...(videoFileError ? { video: [videoFileError] } : {}),
      },
    };
  }

  const listing = await prisma.listing.findUnique({ where: { id: result.data.listingId } });
  if (!listing) {
    return { ok: false, message: "Listing not found." };
  }
  if (listing.sellerId !== session.user.id) {
    return { ok: false, message: "You can only advertise your own listings." };
  }

  let videoUrl: string | null = null;
  let videoSource: "YOUTUBE" | "UPLOAD" | null = null;

  if (result.data.videoSource === "YOUTUBE") {
    videoUrl = result.data.youtubeUrl!.trim();
    videoSource = "YOUTUBE";
  } else if (result.data.videoSource === "UPLOAD" && hasVideoFile) {
    try {
      videoUrl = await uploadPromoVideo(videoFileEntry as File);
      videoSource = "UPLOAD";
    } catch {
      return { ok: false, message: "Video upload failed. Please try again." };
    }
  }

  const amount = result.data.days * AD_PRICE_PER_DAY_KES;

  const ad = await prisma.advertisement.create({
    data: {
      listingId: listing.id,
      ownerId: session.user.id,
      plan: `${result.data.days}-day boost`,
      amount,
      status: "PENDING",
      videoSource,
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

export async function approveAdvertisement(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { ok: false, message: "Admins only." };
  }

  const adId = formData.get("advertisementId");
  if (typeof adId !== "string" || !adId) {
    return { ok: false, message: "Invalid request." };
  }

  const ad = await prisma.advertisement.findUnique({ where: { id: adId }, select: { status: true, amount: true } });
  if (!ad || ad.status !== "PENDING_APPROVAL") {
    return { ok: false, message: "This advertisement is not awaiting approval." };
  }

  const days = Math.max(1, Math.round(ad.amount / AD_PRICE_PER_DAY_KES));
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000);

  await prisma.advertisement.update({
    where: { id: adId },
    data: { status: "ACTIVE", startsAt, endsAt },
  });

  revalidatePath("/");
  return { ok: true, message: "Advertisement approved and now live." };
}

export async function rejectAdvertisement(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { ok: false, message: "Admins only." };
  }

  const adId = formData.get("advertisementId");
  if (typeof adId !== "string" || !adId) {
    return { ok: false, message: "Invalid request." };
  }

  const ad = await prisma.advertisement.findUnique({ where: { id: adId }, select: { status: true } });
  if (!ad || ad.status !== "PENDING_APPROVAL") {
    return { ok: false, message: "This advertisement is not awaiting approval." };
  }

  await prisma.advertisement.update({
    where: { id: adId },
    data: { status: "CANCELLED", failureReason: "Rejected by admin." },
  });

  revalidatePath("/");
  return { ok: true, message: "Advertisement rejected." };
}
