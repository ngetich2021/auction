import { z } from "zod";
import { kenyanPhoneSchema } from "@/lib/validations/phone";

export const createOrderSchema = z.object({
  listingId: z.string().min(1, { error: "Listing is required" }),
  quantity: z.coerce
    .number({ error: "Enter a valid quantity" })
    .int({ error: "Quantity must be a whole number" })
    .min(1, { error: "Quantity must be at least 1" })
    .max(10000, { error: "Quantity is too large" }),
  phone: kenyanPhoneSchema,
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
