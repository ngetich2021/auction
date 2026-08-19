import { z } from "zod";
import { normalizeKenyanPhone } from "@/lib/phone";

export const kenyanPhoneSchema = z
  .string()
  .trim()
  .min(9, { error: "Enter your M-Pesa phone number" })
  .transform((val, ctx) => {
    const normalized = normalizeKenyanPhone(val);
    if (!normalized) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid Safaricom number, e.g. 0712345678",
      });
      return z.NEVER;
    }
    return normalized;
  });
