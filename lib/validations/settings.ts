import { z } from "zod";
import { kenyanPhoneSchema } from "@/lib/validations/phone";

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Name must be at least 2 characters" })
    .max(80, { error: "Name is too long" }),
  phone: kenyanPhoneSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
