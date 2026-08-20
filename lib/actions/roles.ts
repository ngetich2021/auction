"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/admin";
import { createRoleSchema, togglePermissionSchema, assignUserRoleSchema } from "@/lib/validations/roles";
import type { ActionState } from "@/lib/actions/types";

// Role/permission management is restricted to true admins (session.user.role === "ADMIN") —
// a custom role must never be able to edit the permission catalog or grant itself more access.

export async function createRole(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { ok: false, message: "Admins only." };
  }

  const result = createRoleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!result.success) {
    return { ok: false, message: "Please fix the errors below.", errors: result.error.flatten().fieldErrors };
  }

  const existing = await prisma.customRole.findUnique({ where: { name: result.data.name } });
  if (existing) {
    return { ok: false, message: "A role with that name already exists.", errors: { name: ["Already in use"] } };
  }

  await prisma.customRole.create({
    data: { name: result.data.name, description: result.data.description || null },
  });

  revalidatePath("/admin");
  return { ok: true, message: "Role created." };
}

export async function deleteRole(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { ok: false, message: "Admins only." };
  }

  const roleId = formData.get("roleId");
  if (typeof roleId !== "string" || !roleId) {
    return { ok: false, message: "Invalid request." };
  }

  await prisma.user.updateMany({ where: { customRoleId: roleId }, data: { customRoleId: null } });
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  await prisma.customRole.delete({ where: { id: roleId } });

  revalidatePath("/admin");
  return { ok: true, message: "Role deleted." };
}

export async function togglePermission(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { ok: false, message: "Admins only." };
  }

  const result = togglePermissionSchema.safeParse({
    roleId: formData.get("roleId"),
    resource: formData.get("resource"),
    action: formData.get("action"),
    enabled: formData.get("enabled"),
  });
  if (!result.success) {
    return { ok: false, message: "Invalid request." };
  }
  const { roleId, resource, action, enabled } = result.data;

  if (enabled === "true") {
    await prisma.rolePermission.upsert({
      where: { roleId_resource_action: { roleId, resource, action } },
      create: { roleId, resource, action },
      update: {},
    });
  } else {
    await prisma.rolePermission.deleteMany({ where: { roleId, resource, action } });
  }

  revalidatePath("/admin");
  return { ok: true, message: "Permissions updated." };
}

export async function assignUserRole(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { ok: false, message: "Admins only." };
  }

  const result = assignUserRoleSchema.safeParse({
    userId: formData.get("userId"),
    customRoleId: formData.get("customRoleId"),
  });
  if (!result.success) {
    return { ok: false, message: "Invalid request." };
  }

  await prisma.user.update({
    where: { id: result.data.userId },
    data: { customRoleId: result.data.customRoleId || null },
  });

  revalidatePath("/admin");
  return { ok: true, message: "User role assignment updated." };
}
