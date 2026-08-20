"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateUserRoleSchema, moderateListingSchema } from "@/lib/validations/admin";
import { hasPermission, type PermissionAction, type ResourceId } from "@/lib/permissions";
import type { ActionState } from "@/lib/actions/types";

// True admins only — used for the role/permission catalog itself and for granting the ADMIN
// enum role, so a scoped custom role can never escalate its own access.
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

// Admins pass automatically; a signed-in user with a custom role passes if that role was
// granted the given resource/action.
export async function requireAccess(resource: ResourceId, action: PermissionAction) {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role === "ADMIN") return session;
  if (!hasPermission(session.user.permissions, resource, action)) return null;
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
  const session = await requireAccess("listings", "UPDATE");
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
