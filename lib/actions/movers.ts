"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadMoverImage } from "@/lib/cloudinary";
import { moverFieldsSchema, validateMoverImage } from "@/lib/validations/mover";
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
  return { ok: true, message: "Your vehicle is now listed for movers." };
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
  if (mover.ownerId !== session.user.id) {
    return { ok: false, message: "You can only manage your own listing." };
  }

  await prisma.mover.update({ where: { id: moverId }, data: { active } });
  revalidatePath("/");
  return { ok: true, message: active ? "Listing is now visible to clients." : "Listing hidden." };
}
