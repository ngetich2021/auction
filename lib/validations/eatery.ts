import { z } from "zod";
import { kenyanPhoneSchema } from "@/lib/validations/phone";
import { coordinatesSchema } from "@/lib/validations/coordinates";

export const MAX_EATERY_IMAGE_SIZE_MB = 5;

export const eateryFieldsSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { error: "Enter the eatery or shop name" })
      .max(80, { error: "Name is too long" }),
    foodType: z.string().trim().max(60, { error: "Food type is too long" }).optional().or(z.literal("")),
    description: z.string().trim().max(300, { error: "Description is too long" }).optional().or(z.literal("")),
    phone: kenyanPhoneSchema,
    address: z.string().trim().max(200, { error: "Address is too long" }).optional().or(z.literal("")),
  })
  .extend(coordinatesSchema.shape);

export type EateryFields = z.infer<typeof eateryFieldsSchema>;

export function validateEateryImage(file: File | null, required: boolean = true): string | null {
  if (!file || file.size === 0) return required ? "Add a photo of the eatery or dish" : null;
  if (!file.type.startsWith("image/")) return "Only image files are allowed";
  if (file.size > MAX_EATERY_IMAGE_SIZE_MB * 1024 * 1024) {
    return `Photo must be under ${MAX_EATERY_IMAGE_SIZE_MB}MB`;
  }
  return null;
}
