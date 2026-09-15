import { z } from "zod";
import { kenyanPhoneSchema } from "@/lib/validations/phone";
import { coordinatesSchema } from "@/lib/validations/coordinates";

export const MAX_OFFER_IMAGE_SIZE_MB = 5;

export const offerFieldsSchema = z
  .object({
    shopName: z
      .string()
      .trim()
      .min(2, { error: "Enter your shop name" })
      .max(80, { error: "Shop name is too long" }),
    title: z
      .string()
      .trim()
      .min(2, { error: "Enter a title for the offer, e.g. 20% off all electronics" })
      .max(100, { error: "Title is too long" }),
    description: z.string().trim().max(300, { error: "Description is too long" }).optional().or(z.literal("")),
    discount: z.string().trim().max(40, { error: "Discount is too long" }).optional().or(z.literal("")),
    phone: kenyanPhoneSchema,
    address: z.string().trim().max(200, { error: "Address is too long" }).optional().or(z.literal("")),
    expiresAt: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .transform((val, ctx) => {
        if (!val) return undefined;
        const date = new Date(val);
        if (Number.isNaN(date.getTime())) {
          ctx.addIssue({ code: "custom", message: "Enter a valid date" });
          return z.NEVER;
        }
        return date;
      }),
  })
  .extend(coordinatesSchema.shape);

export type OfferFields = z.infer<typeof offerFieldsSchema>;

export function validateOfferImage(file: File | null, required: boolean = true): string | null {
  if (!file || file.size === 0) return required ? "Add a photo for the offer" : null;
  if (!file.type.startsWith("image/")) return "Only image files are allowed";
  if (file.size > MAX_OFFER_IMAGE_SIZE_MB * 1024 * 1024) {
    return `Photo must be under ${MAX_OFFER_IMAGE_SIZE_MB}MB`;
  }
  return null;
}
