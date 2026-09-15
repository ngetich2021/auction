"use server";

import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadListingImage } from "@/lib/cloudinary";
import { initiateStkPush, MpesaError } from "@/lib/mpesa";
import { listingFieldsSchema, validateListingImages } from "@/lib/validations/listing";
import { moderateListingSchema } from "@/lib/validations/admin";
import { BADGE_PRICE_KES } from "@/lib/validations/badge";
import { STALE_AFTER_DAYS } from "@/lib/validations/staleness";
import type { ActionState } from "@/lib/actions/types";

export async function createListing(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in to post a listing." };
  }

  const fieldsResult = listingFieldsSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    price: formData.get("price"),
    quantity: formData.get("quantity"),
    address: formData.get("address"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    phone: formData.get("phone"),
  });

  const images = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const imageError = validateListingImages(images);

  if (!fieldsResult.success || imageError) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      errors: {
        ...(fieldsResult.success ? {} : fieldsResult.error.flatten().fieldErrors),
        ...(imageError ? { images: [imageError] } : {}),
      },
    };
  }

  let imageUrls: string[];
  try {
    imageUrls = await Promise.all(images.map((file) => uploadListingImage(file)));
  } catch {
    return { ok: false, message: "Image upload failed. Please try again." };
  }

  let listingId: string;
  try {
    const listing = await prisma.listing.create({
      data: {
        title: fieldsResult.data.title,
        description: fieldsResult.data.description,
        category: fieldsResult.data.category,
        price: fieldsResult.data.price,
        quantity: fieldsResult.data.quantity,
        latitude: fieldsResult.data.latitude,
        longitude: fieldsResult.data.longitude,
        address: fieldsResult.data.address || null,
        phone: fieldsResult.data.phone,
        images: JSON.stringify(imageUrls),
        status: "AVAILABLE",
        sellerId: session.user.id,
      },
    });
    listingId = listing.id;
  } catch {
    return { ok: false, message: "Could not save your listing. Please try again." };
  }

  revalidatePath("/");
  updateTag("listings");
  updateTag("admin-listings");
  return {
    ok: true,
    message: "Your listing is now live.",
    data: { listingId },
  };
}

export async function updateListing(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const listingId = formData.get("listingId");
  if (typeof listingId !== "string" || !listingId) {
    return { ok: false, message: "Invalid request." };
  }

  const existing = await prisma.listing.findUnique({ where: { id: listingId }, select: { sellerId: true } });
  if (!existing) {
    return { ok: false, message: "Listing not found." };
  }
  const isOwner = existing.sellerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { ok: false, message: "You can only manage your own listing." };
  }

  const fieldsResult = listingFieldsSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    price: formData.get("price"),
    quantity: formData.get("quantity"),
    address: formData.get("address"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    phone: formData.get("phone"),
  });

  const keepImages = formData.getAll("keepImages").filter((v): v is string => typeof v === "string" && v.length > 0);
  const newImages = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const imageError = validateListingImages(newImages, keepImages.length);

  if (!fieldsResult.success || imageError) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      errors: {
        ...(fieldsResult.success ? {} : fieldsResult.error.flatten().fieldErrors),
        ...(imageError ? { images: [imageError] } : {}),
      },
    };
  }

  let newImageUrls: string[];
  try {
    newImageUrls = await Promise.all(newImages.map((file) => uploadListingImage(file)));
  } catch {
    return { ok: false, message: "Image upload failed. Please try again." };
  }

  await prisma.listing.update({
    where: { id: listingId },
    data: {
      title: fieldsResult.data.title,
      description: fieldsResult.data.description,
      category: fieldsResult.data.category,
      price: fieldsResult.data.price,
      quantity: fieldsResult.data.quantity,
      latitude: fieldsResult.data.latitude,
      longitude: fieldsResult.data.longitude,
      address: fieldsResult.data.address || null,
      phone: fieldsResult.data.phone,
      images: JSON.stringify([...keepImages, ...newImageUrls]),
    },
  });

  revalidatePath("/");
  updateTag("listings");
  updateTag("admin-listings");
  return { ok: true, message: "Listing updated." };
}

export async function setListingStatus(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const result = moderateListingSchema.safeParse({
    listingId: formData.get("listingId"),
    status: formData.get("status"),
  });
  if (!result.success) {
    return { ok: false, message: "Invalid request.", errors: result.error.flatten().fieldErrors };
  }

  const listing = await prisma.listing.findUnique({
    where: { id: result.data.listingId },
    select: { sellerId: true },
  });
  if (!listing) {
    return { ok: false, message: "Listing not found." };
  }
  if (listing.sellerId !== session.user.id && session.user.role !== "ADMIN") {
    return { ok: false, message: "You are not allowed to modify this listing." };
  }

  await prisma.listing.update({
    where: { id: result.data.listingId },
    data: { status: result.data.status },
  });

  revalidatePath("/");
  updateTag("listings");
  updateTag("admin-listings");
  return { ok: true, message: "Listing updated." };
}

export async function deleteListing(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const listingId = formData.get("listingId");
  if (typeof listingId !== "string" || !listingId) {
    return { ok: false, message: "Invalid request." };
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { sellerId: true } });
  if (!listing) {
    return { ok: false, message: "Listing not found." };
  }
  const isOwner = listing.sellerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { ok: false, message: "You can only manage your own listing." };
  }

  await prisma.listing.delete({ where: { id: listingId } });
  revalidatePath("/");
  updateTag("listings");
  updateTag("admin-listings");
  return { ok: true, message: "Listing deleted." };
}

export async function reactivateListing(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const listingId = formData.get("listingId");
  if (typeof listingId !== "string" || !listingId) {
    return { ok: false, message: "Invalid request." };
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { sellerId: true } });
  if (!listing) {
    return { ok: false, message: "Listing not found." };
  }
  if (listing.sellerId !== session.user.id && session.user.role !== "ADMIN") {
    return { ok: false, message: "You can only manage your own listing." };
  }

  await prisma.listing.update({ where: { id: listingId }, data: { activatedAt: new Date() } });
  revalidatePath("/");
  updateTag("listings");
  updateTag("admin-listings");
  return { ok: true, message: `Reactivated — visible for ${STALE_AFTER_DAYS} more days.` };
}

export async function payForListingBadge(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const listingId = formData.get("listingId");
  const phone = formData.get("phone");
  if (typeof listingId !== "string" || !listingId || typeof phone !== "string" || !phone) {
    return { ok: false, message: "Invalid request." };
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { sellerId: true, badge: true } });
  if (!listing) {
    return { ok: false, message: "Listing not found." };
  }
  const isOwner = listing.sellerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { ok: false, message: "You can only manage your own listing." };
  }
  if (listing.badge) {
    return { ok: false, message: "This listing already has the blue star badge." };
  }

  try {
    const stk = await initiateStkPush({
      phone,
      amount: BADGE_PRICE_KES,
      accountReference: listingId,
      transactionDesc: "Listing badge",
    });
    await prisma.listing.update({
      where: { id: listingId },
      data: { badgeCheckoutRequestId: stk.checkoutRequestId, badgeFailureReason: null },
    });
  } catch (error) {
    const message = error instanceof MpesaError ? error.message : "Could not start M-Pesa payment. Please try again.";
    return { ok: false, message };
  }

  return {
    ok: true,
    message: `Check your phone to complete the KES ${BADGE_PRICE_KES} payment.`,
    data: { listingId },
  };
}
