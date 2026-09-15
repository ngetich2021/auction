"use server";

import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadOfferImage } from "@/lib/cloudinary";
import { initiateStkPush, MpesaError } from "@/lib/mpesa";
import { offerFieldsSchema, validateOfferImage } from "@/lib/validations/offer";
import { BADGE_PRICE_KES } from "@/lib/validations/badge";
import type { ActionState } from "@/lib/actions/types";

export async function createOffer(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in to announce an offer." };
  }

  const result = offerFieldsSchema.safeParse({
    shopName: formData.get("shopName"),
    title: formData.get("title"),
    description: formData.get("description"),
    discount: formData.get("discount"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    expiresAt: formData.get("expiresAt"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });

  const imageEntry = formData.get("image");
  const imageFile = imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;
  const imageError = validateOfferImage(imageFile);

  if (!result.success || imageError) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      errors: {
        ...(result.success ? {} : result.error.flatten().fieldErrors),
        ...(imageError ? { image: [imageError] } : {}),
      },
    };
  }

  let imageUrl: string;
  try {
    imageUrl = await uploadOfferImage(imageFile!);
  } catch {
    return { ok: false, message: "Photo upload failed. Please try again." };
  }

  await prisma.offer.create({
    data: {
      ownerId: session.user.id,
      shopName: result.data.shopName,
      title: result.data.title,
      description: result.data.description || null,
      discount: result.data.discount || null,
      phone: result.data.phone,
      image: imageUrl,
      address: result.data.address || null,
      expiresAt: result.data.expiresAt ?? null,
      latitude: result.data.latitude,
      longitude: result.data.longitude,
    },
  });

  revalidatePath("/");
  updateTag("offers");
  return { ok: true, message: "Your offer is now live." };
}

export async function updateOffer(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const offerId = formData.get("offerId");
  if (typeof offerId !== "string" || !offerId) {
    return { ok: false, message: "Invalid request." };
  }

  const existing = await prisma.offer.findUnique({ where: { id: offerId }, select: { ownerId: true, image: true } });
  if (!existing) {
    return { ok: false, message: "Offer not found." };
  }
  const isOwner = existing.ownerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { ok: false, message: "You can only manage your own offers." };
  }

  const result = offerFieldsSchema.safeParse({
    shopName: formData.get("shopName"),
    title: formData.get("title"),
    description: formData.get("description"),
    discount: formData.get("discount"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    expiresAt: formData.get("expiresAt"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });

  const imageEntry = formData.get("image");
  const imageFile = imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;
  const imageError = validateOfferImage(imageFile, false);

  if (!result.success || imageError) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      errors: {
        ...(result.success ? {} : result.error.flatten().fieldErrors),
        ...(imageError ? { image: [imageError] } : {}),
      },
    };
  }

  let imageUrl = existing.image;
  if (imageFile) {
    try {
      imageUrl = await uploadOfferImage(imageFile);
    } catch {
      return { ok: false, message: "Photo upload failed. Please try again." };
    }
  }

  await prisma.offer.update({
    where: { id: offerId },
    data: {
      shopName: result.data.shopName,
      title: result.data.title,
      description: result.data.description || null,
      discount: result.data.discount || null,
      phone: result.data.phone,
      image: imageUrl,
      address: result.data.address || null,
      expiresAt: result.data.expiresAt ?? null,
      latitude: result.data.latitude,
      longitude: result.data.longitude,
    },
  });

  revalidatePath("/");
  updateTag("offers");
  return { ok: true, message: "Offer updated." };
}

export async function deleteOffer(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const offerId = formData.get("offerId");
  if (typeof offerId !== "string" || !offerId) {
    return { ok: false, message: "Invalid request." };
  }

  const offer = await prisma.offer.findUnique({ where: { id: offerId }, select: { ownerId: true } });
  if (!offer) {
    return { ok: false, message: "Offer not found." };
  }
  const isOwner = offer.ownerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { ok: false, message: "You can only manage your own offers." };
  }

  await prisma.offer.delete({ where: { id: offerId } });
  revalidatePath("/");
  updateTag("offers");
  return { ok: true, message: "Offer deleted." };
}

export async function setOfferActive(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const offerId = formData.get("offerId");
  const active = formData.get("active") === "true";
  if (typeof offerId !== "string" || !offerId) {
    return { ok: false, message: "Invalid request." };
  }

  const offer = await prisma.offer.findUnique({ where: { id: offerId }, select: { ownerId: true } });
  if (!offer) {
    return { ok: false, message: "Offer not found." };
  }
  const isOwner = offer.ownerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { ok: false, message: "You can only manage your own offers." };
  }

  await prisma.offer.update({ where: { id: offerId }, data: { active } });
  revalidatePath("/");
  updateTag("offers");
  return { ok: true, message: active ? "Offer is now visible to shoppers." : "Offer hidden." };
}

export async function payForOfferBadge(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const offerId = formData.get("offerId");
  const phone = formData.get("phone");
  if (typeof offerId !== "string" || !offerId || typeof phone !== "string" || !phone) {
    return { ok: false, message: "Invalid request." };
  }

  const offer = await prisma.offer.findUnique({ where: { id: offerId }, select: { ownerId: true, badge: true } });
  if (!offer) {
    return { ok: false, message: "Offer not found." };
  }
  const isOwner = offer.ownerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { ok: false, message: "You can only manage your own offers." };
  }
  if (offer.badge) {
    return { ok: false, message: "This offer already has the blue star badge." };
  }

  try {
    const stk = await initiateStkPush({
      phone,
      amount: BADGE_PRICE_KES,
      accountReference: offerId,
      transactionDesc: "Offer badge",
    });
    await prisma.offer.update({
      where: { id: offerId },
      data: { badgeCheckoutRequestId: stk.checkoutRequestId, badgeFailureReason: null },
    });
  } catch (error) {
    const message = error instanceof MpesaError ? error.message : "Could not start M-Pesa payment. Please try again.";
    return { ok: false, message };
  }

  return {
    ok: true,
    message: `Check your phone to complete the KES ${BADGE_PRICE_KES} payment.`,
    data: { offerId },
  };
}
