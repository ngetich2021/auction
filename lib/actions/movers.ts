"use server";

import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadMoverImage } from "@/lib/cloudinary";
import { initiateStkPush, MpesaError } from "@/lib/mpesa";
import { moverFieldsSchema, validateMoverImage } from "@/lib/validations/mover";
import { BADGE_PRICE_KES } from "@/lib/validations/badge";
import { STALE_AFTER_DAYS } from "@/lib/validations/staleness";
import type { ActionState } from "@/lib/actions/types";

export async function createMover(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in to list your moving vehicle." };
  }

  const result = moverFieldsSchema.safeParse({
    vehicleType: formData.get("vehicleType"),
    description: formData.get("description"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });

  const imageEntry = formData.get("image");
  const imageFile = imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;
  const imageError = validateMoverImage(imageFile);

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
    imageUrl = await uploadMoverImage(imageFile!);
  } catch {
    return { ok: false, message: "Photo upload failed. Please try again." };
  }

  await prisma.mover.create({
    data: {
      ownerId: session.user.id,
      vehicleType: result.data.vehicleType,
      description: result.data.description || null,
      phone: result.data.phone,
      image: imageUrl,
      address: result.data.address || null,
      latitude: result.data.latitude,
      longitude: result.data.longitude,
    },
  });

  revalidatePath("/");
  updateTag("movers");
  return { ok: true, message: "Your vehicle is now listed for movers." };
}

export async function updateMover(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const moverId = formData.get("moverId");
  if (typeof moverId !== "string" || !moverId) {
    return { ok: false, message: "Invalid request." };
  }

  const existing = await prisma.mover.findUnique({ where: { id: moverId }, select: { ownerId: true, image: true } });
  if (!existing) {
    return { ok: false, message: "Listing not found." };
  }
  const isOwner = existing.ownerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { ok: false, message: "You can only manage your own listing." };
  }

  const result = moverFieldsSchema.safeParse({
    vehicleType: formData.get("vehicleType"),
    description: formData.get("description"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });

  const imageEntry = formData.get("image");
  const imageFile = imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;
  const imageError = validateMoverImage(imageFile, false);

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
      imageUrl = await uploadMoverImage(imageFile);
    } catch {
      return { ok: false, message: "Photo upload failed. Please try again." };
    }
  }

  await prisma.mover.update({
    where: { id: moverId },
    data: {
      vehicleType: result.data.vehicleType,
      description: result.data.description || null,
      phone: result.data.phone,
      image: imageUrl,
      address: result.data.address || null,
      latitude: result.data.latitude,
      longitude: result.data.longitude,
    },
  });

  revalidatePath("/");
  updateTag("movers");
  return { ok: true, message: "Listing updated." };
}

export async function deleteMover(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const moverId = formData.get("moverId");
  if (typeof moverId !== "string" || !moverId) {
    return { ok: false, message: "Invalid request." };
  }

  const mover = await prisma.mover.findUnique({ where: { id: moverId }, select: { ownerId: true } });
  if (!mover) {
    return { ok: false, message: "Listing not found." };
  }
  const isOwner = mover.ownerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { ok: false, message: "You can only manage your own listing." };
  }

  await prisma.mover.delete({ where: { id: moverId } });
  revalidatePath("/");
  updateTag("movers");
  return { ok: true, message: "Listing deleted." };
}

export async function setMoverActive(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const moverId = formData.get("moverId");
  const active = formData.get("active") === "true";
  if (typeof moverId !== "string" || !moverId) {
    return { ok: false, message: "Invalid request." };
  }

  const mover = await prisma.mover.findUnique({ where: { id: moverId }, select: { ownerId: true } });
  if (!mover) {
    return { ok: false, message: "Listing not found." };
  }
  const isOwner = mover.ownerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { ok: false, message: "You can only manage your own listing." };
  }

  await prisma.mover.update({ where: { id: moverId }, data: { active } });
  revalidatePath("/");
  updateTag("movers");
  return { ok: true, message: active ? "Listing is now visible to clients." : "Listing hidden." };
}

export async function reactivateMover(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const moverId = formData.get("moverId");
  if (typeof moverId !== "string" || !moverId) {
    return { ok: false, message: "Invalid request." };
  }

  const mover = await prisma.mover.findUnique({ where: { id: moverId }, select: { ownerId: true } });
  if (!mover) {
    return { ok: false, message: "Listing not found." };
  }
  const isOwner = mover.ownerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { ok: false, message: "You can only manage your own listing." };
  }

  await prisma.mover.update({ where: { id: moverId }, data: { activatedAt: new Date() } });
  revalidatePath("/");
  updateTag("movers");
  return { ok: true, message: `Reactivated — visible for ${STALE_AFTER_DAYS} more days.` };
}

export async function payForMoverBadge(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const moverId = formData.get("moverId");
  const phone = formData.get("phone");
  if (typeof moverId !== "string" || !moverId || typeof phone !== "string" || !phone) {
    return { ok: false, message: "Invalid request." };
  }

  const mover = await prisma.mover.findUnique({ where: { id: moverId }, select: { ownerId: true, badge: true } });
  if (!mover) {
    return { ok: false, message: "Listing not found." };
  }
  const isOwner = mover.ownerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { ok: false, message: "You can only manage your own listing." };
  }
  if (mover.badge) {
    return { ok: false, message: "This listing already has the blue star badge." };
  }

  try {
    const stk = await initiateStkPush({
      phone,
      amount: BADGE_PRICE_KES,
      accountReference: moverId,
      transactionDesc: "Mover badge",
    });
    await prisma.mover.update({
      where: { id: moverId },
      data: { badgeCheckoutRequestId: stk.checkoutRequestId, badgeFailureReason: null },
    });
  } catch (error) {
    const message = error instanceof MpesaError ? error.message : "Could not start M-Pesa payment. Please try again.";
    return { ok: false, message };
  }

  return {
    ok: true,
    message: `Check your phone to complete the KES ${BADGE_PRICE_KES} payment.`,
    data: { moverId },
  };
}
