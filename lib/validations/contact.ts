import { z } from "zod";
import { kenyanPhoneSchema } from "@/lib/validations/phone";

export const contactFieldsSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter your name" }).max(80, { error: "Name is too long" }),
  email: z.email({ error: "Enter a valid email address" }),
  phone: z
    .union([kenyanPhoneSchema, z.literal("")])
    .optional()
    .transform((val) => val || undefined),
  subject: z.string().trim().min(2, { error: "Enter a subject" }).max(120, { error: "Subject is too long" }),
  message: z.string().trim().min(10, { error: "Message is too short" }).max(2000, { error: "Message is too long" }),
});

export type ContactFields = z.infer<typeof contactFieldsSchema>;

export const feedbackFieldsSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter your name" }).max(80, { error: "Name is too long" }),
  email: z.email({ error: "Enter a valid email address" }),
  rating: z.coerce.number().int().min(1, { error: "Pick a rating" }).max(5, { error: "Pick a rating" }),
  message: z.string().trim().min(10, { error: "Tell us a bit more" }).max(2000, { error: "Message is too long" }),
});

export type FeedbackFields = z.infer<typeof feedbackFieldsSchema>;
