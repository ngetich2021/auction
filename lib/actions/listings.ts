"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadListingImage } from "@/lib/cloudinary";
import { initiateStkPush, MpesaError } from "@/lib/mpesa";
import { listingFieldsSchema, validateListingImages, LISTING_POST_FEE_KES } from "@/lib/validations/listing";
import { moderateListingSchema } from "@/lib/validations/admin";
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
        status: "PENDING",
        sellerId: session.user.id,
      },
    });
    listingId = listing.id;
  } catch {
    return { ok: false, message: "Could not save your listing. Please try again." };
  }

  try {
    const stk = await initiateStkPush({
      phone: fieldsResult.data.phone,
      amount: LISTING_POST_FEE_KES,
      accountReference: listingId,
      transactionDesc: "Listing post fee",
    });
    await prisma.listing.update({
      where: { id: listingId },
      data: { mpesaCheckoutRequestId: stk.checkoutRequestId },
    });
  } catch (error) {
    const message = error instanceof MpesaError ? error.message : "Could not start M-Pesa payment. Please try again.";
    await prisma.listing.update({ where: { id: listingId }, data: { failureReason: message } });
    return { ok: false, message };
  }

  revalidatePath("/");
  return {
    ok: true,
    message: `Check your phone to pay the KES ${LISTING_POST_FEE_KES} posting fee.`,
    data: { listingId },
  };
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
  return { ok: true, message: "Listing updated." };
}
