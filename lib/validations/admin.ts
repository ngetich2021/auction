import { z } from "zod";

export const updateUserRoleSchema = z.object({
  userId: z.string().min(1, { error: "Select a user" }),
  role: z.enum(["USER", "ADMIN"], { error: "Select a valid role" }),
});

export const moderateListingSchema = z.object({
  listingId: z.string().min(1, { error: "Select a listing" }),
  status: z.enum(["AVAILABLE", "PENDING", "SOLD", "REMOVED"], {
    error: "Select a valid status",
  }),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type ModerateListingInput = z.infer<typeof moderateListingSchema>;
