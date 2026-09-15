"use server";

import { updateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { contactFieldsSchema, feedbackFieldsSchema } from "@/lib/validations/contact";
import type { ActionState } from "@/lib/actions/types";
import type { ContactMessageStatus } from "@prisma/client";

export async function submitContactMessage(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();

  const result = contactFieldsSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!result.success) {
    return { ok: false, message: "Please fix the errors below.", errors: result.error.flatten().fieldErrors };
  }

  await prisma.contactMessage.create({
    data: {
      type: "CONTACT",
      name: result.data.name,
      email: result.data.email,
      phone: result.data.phone ?? null,
      subject: result.data.subject,
      message: result.data.message,
      userId: session?.user?.id,
    },
  });

  updateTag("admin-contacts");
  return { ok: true, message: "Thanks for reaching out — we'll get back to you soon." };
}

export async function submitFeedback(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();

  const result = feedbackFieldsSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    rating: formData.get("rating"),
    message: formData.get("message"),
  });

  if (!result.success) {
    return { ok: false, message: "Please fix the errors below.", errors: result.error.flatten().fieldErrors };
  }

  await prisma.contactMessage.create({
    data: {
      type: "FEEDBACK",
      name: result.data.name,
      email: result.data.email,
      rating: result.data.rating,
      message: result.data.message,
      userId: session?.user?.id,
    },
  });

  updateTag("admin-contacts");
  return { ok: true, message: "Thanks for the feedback!" };
}

export async function setContactMessageStatus(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { ok: false, message: "Admins only." };
  }

  const id = formData.get("id");
  const status = formData.get("status");
  const validStatuses: ContactMessageStatus[] = ["NEW", "READ", "RESOLVED"];
  if (typeof id !== "string" || !id || typeof status !== "string" || !validStatuses.includes(status as ContactMessageStatus)) {
    return { ok: false, message: "Invalid request." };
  }

  await prisma.contactMessage.update({ where: { id }, data: { status: status as ContactMessageStatus } });
  updateTag("admin-contacts");
  return { ok: true, message: "Updated." };
}

export async function deleteContactMessage(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { ok: false, message: "Admins only." };
  }

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { ok: false, message: "Invalid request." };
  }

  await prisma.contactMessage.delete({ where: { id } });
  updateTag("admin-contacts");
  return { ok: true, message: "Deleted." };
}
