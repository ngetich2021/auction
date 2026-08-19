import { z } from "zod";
import { kenyanPhoneSchema } from "@/lib/validations/phone";
import { coordinatesSchema } from "@/lib/validations/coordinates";

export const MAX_MOVER_IMAGE_SIZE_MB = 5;

export const moverFieldsSchema = z
  .object({
    vehicleType: z
      .string()
      .trim()
      .min(2, { error: "Enter the vehicle type, e.g. Pickup, Canter, Lorry" })
      .max(60, { error: "Vehicle type is too long" }),
    description: z.string().trim().max(300, { error: "Description is too long" }).optional().or(z.literal("")),
    phone: kenyanPhoneSchema,
  })
  .extend(coordinatesSchema.shape);

export type MoverFields = z.infer<typeof moverFieldsSchema>;

export function validateMoverImage(file: File | null): string | null {
  if (!file || file.size === 0) return "Add a photo of your vehicle";
  if (!file.type.startsWith("image/")) return "Only image files are allowed";
  if (file.size > MAX_MOVER_IMAGE_SIZE_MB * 1024 * 1024) {
    return `Photo must be under ${MAX_MOVER_IMAGE_SIZE_MB}MB`;
  }
  return null;
}
