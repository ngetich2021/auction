"use server";

import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validations/settings";
import type { ActionState } from "@/lib/actions/types";

export async function updateProfile(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "Sign in required." };
  }

  const result = updateProfileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!result.success) {
    return { ok: false, message: "Please fix the errors below.", errors: result.error.flatten().fieldErrors };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: result.data.name, phone: result.data.phone },
  });

  revalidatePath("/");
  updateTag("admin-users");
  return { ok: true, message: "Profile updated." };
}
