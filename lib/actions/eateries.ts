"use server";

import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadEateryImage } from "@/lib/cloudinary";
import { initiateStkPush, MpesaError } from "@/lib/mpesa";
import { eateryFieldsSchema, validateEateryImage } from "@/lib/validations/eatery";
import { BADGE_PRICE_KES } from "@/lib/validations/badge";
import type { ActionState } from "@/lib/actions/types";

export async function createEatery(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in to list your eatery." };
  }

  const result = eateryFieldsSchema.safeParse({
    name: formData.get("name"),
    foodType: formData.get("foodType"),
    description: formData.get("description"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });

  const imageEntry = formData.get("image");
  const imageFile = imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;
  const imageError = validateEateryImage(imageFile);

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
    imageUrl = await uploadEateryImage(imageFile!);
  } catch {
    return { ok: false, message: "Photo upload failed. Please try again." };
  }

  await prisma.eatery.create({
    data: {
      ownerId: session.user.id,
      name: result.data.name,
      foodType: result.data.foodType || null,
      description: result.data.description || null,
      phone: result.data.phone,
      image: imageUrl,
      address: result.data.address || null,
      latitude: result.data.latitude,
      longitude: result.data.longitude,
    },
  });

  revalidatePath("/");
  updateTag("eateries");
  return { ok: true, message: "Your eatery is now listed." };
}

export async function updateEatery(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const eateryId = formData.get("eateryId");
  if (typeof eateryId !== "string" || !eateryId) {
    return { ok: false, message: "Invalid request." };
  }

  const existing = await prisma.eatery.findUnique({ where: { id: eateryId }, select: { ownerId: true, image: true } });
  if (!existing) {
    return { ok: false, message: "Eatery not found." };
  }
  const isOwner = existing.ownerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { ok: false, message: "You can only manage your own eatery." };
  }

  const result = eateryFieldsSchema.safeParse({
    name: formData.get("name"),
    foodType: formData.get("foodType"),
    description: formData.get("description"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });

  const imageEntry = formData.get("image");
  const imageFile = imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;
  const imageError = validateEateryImage(imageFile, false);

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
      imageUrl = await uploadEateryImage(imageFile);
    } catch {
      return { ok: false, message: "Photo upload failed. Please try again." };
    }
  }

  await prisma.eatery.update({
    where: { id: eateryId },
    data: {
      name: result.data.name,
      foodType: result.data.foodType || null,
      description: result.data.description || null,
      phone: result.data.phone,
      image: imageUrl,
      address: result.data.address || null,
      latitude: result.data.latitude,
      longitude: result.data.longitude,
    },
  });

  revalidatePath("/");
  updateTag("eateries");
  return { ok: true, message: "Eatery updated." };
}

export async function deleteEatery(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const eateryId = formData.get("eateryId");
  if (typeof eateryId !== "string" || !eateryId) {
    return { ok: false, message: "Invalid request." };
  }

  const eatery = await prisma.eatery.findUnique({ where: { id: eateryId }, select: { ownerId: true } });
  if (!eatery) {
    return { ok: false, message: "Eatery not found." };
  }
  const isOwner = eatery.ownerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { ok: false, message: "You can only manage your own eatery." };
  }

  await prisma.eatery.delete({ where: { id: eateryId } });
  revalidatePath("/");
  updateTag("eateries");
  return { ok: true, message: "Eatery deleted." };
}

export async function setEateryActive(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const eateryId = formData.get("eateryId");
  const active = formData.get("active") === "true";
  if (typeof eateryId !== "string" || !eateryId) {
    return { ok: false, message: "Invalid request." };
  }

  const eatery = await prisma.eatery.findUnique({ where: { id: eateryId }, select: { ownerId: true } });
  if (!eatery) {
    return { ok: false, message: "Eatery not found." };
  }
  const isOwner = eatery.ownerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { ok: false, message: "You can only manage your own eatery." };
  }

  await prisma.eatery.update({ where: { id: eateryId }, data: { active } });
  revalidatePath("/");
  updateTag("eateries");
  return { ok: true, message: active ? "Eatery is now visible to shoppers." : "Eatery hidden." };
}

export async function payForEateryBadge(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const eateryId = formData.get("eateryId");
  const phone = formData.get("phone");
  if (typeof eateryId !== "string" || !eateryId || typeof phone !== "string" || !phone) {
    return { ok: false, message: "Invalid request." };
  }

  const eatery = await prisma.eatery.findUnique({ where: { id: eateryId }, select: { ownerId: true, badge: true } });
  if (!eatery) {
    return { ok: false, message: "Eatery not found." };
  }
  const isOwner = eatery.ownerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { ok: false, message: "You can only manage your own eatery." };
  }
  if (eatery.badge) {
    return { ok: false, message: "This eatery already has the blue star badge." };
  }

  try {
    const stk = await initiateStkPush({
      phone,
      amount: BADGE_PRICE_KES,
      accountReference: eateryId,
      transactionDesc: "Eatery badge",
    });
    await prisma.eatery.update({
      where: { id: eateryId },
      data: { badgeCheckoutRequestId: stk.checkoutRequestId, badgeFailureReason: null },
    });
  } catch (error) {
    const message = error instanceof MpesaError ? error.message : "Could not start M-Pesa payment. Please try again.";
    return { ok: false, message };
  }

  return {
    ok: true,
    message: `Check your phone to complete the KES ${BADGE_PRICE_KES} payment.`,
    data: { eateryId },
  };
}
