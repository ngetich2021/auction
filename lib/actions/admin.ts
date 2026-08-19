"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateUserRoleSchema, moderateListingSchema } from "@/lib/validations/admin";
import type { ActionState } from "@/lib/actions/types";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function updateUserRole(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { ok: false, message: "Admins only." };
  }

  const result = updateUserRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!result.success) {
    return { ok: false, message: "Invalid request.", errors: result.error.flatten().fieldErrors };
  }
  if (result.data.userId === session.user.id) {
    return { ok: false, message: "You cannot change your own role." };
  }

  await prisma.user.update({ where: { id: result.data.userId }, data: { role: result.data.role } });
  revalidatePath("/");
  return { ok: true, message: "User role updated." };
}

export async function adminModerateListing(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { ok: false, message: "Admins only." };
  }

  const result = moderateListingSchema.safeParse({
    listingId: formData.get("listingId"),
    status: formData.get("status"),
  });
  if (!result.success) {
    return { ok: false, message: "Invalid request.", errors: result.error.flatten().fieldErrors };
  }

  await prisma.listing.update({
    where: { id: result.data.listingId },
    data: { status: result.data.status },
  });
  revalidatePath("/");
  return { ok: true, message: "Listing updated." };
}
