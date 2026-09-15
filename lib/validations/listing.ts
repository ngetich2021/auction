import { z } from "zod";
import { coordinatesSchema } from "@/lib/validations/coordinates";
import { kenyanPhoneSchema } from "@/lib/validations/phone";

export const LISTING_CATEGORIES = [
  "ELECTRONICS",
  "VEHICLES",
  "FURNITURE_HOME",
  "FASHION",
  "APPLIANCES",
  "MACHINERY_EQUIPMENT",
  "SPORTS_LEISURE",
  "OFFICE_BUSINESS",
  "OTHER",
] as const;

export const CATEGORY_LABELS: Record<(typeof LISTING_CATEGORIES)[number], string> = {
  ELECTRONICS: "Electronics",
  VEHICLES: "Vehicles",
  FURNITURE_HOME: "Furniture & Home",
  FASHION: "Fashion & Accessories",
  APPLIANCES: "Appliances",
  MACHINERY_EQUIPMENT: "Machinery & Equipment",
  SPORTS_LEISURE: "Sports & Leisure",
  OFFICE_BUSINESS: "Office & Business",
  OTHER: "Other",
};

export const MAX_IMAGES = 6;
export const MAX_IMAGE_SIZE_MB = 5;
export const LISTING_POST_FEE_KES = 20;

export const listingFieldsSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, { error: "Title must be at least 3 characters" })
      .max(100, { error: "Title must be under 100 characters" }),
    description: z
      .string()
      .trim()
      .min(10, { error: "Description must be at least 10 characters" })
      .max(2000, { error: "Description must be under 2000 characters" }),
    category: z.enum(LISTING_CATEGORIES, { error: "Select a valid category" }),
    price: z.coerce
      .number({ error: "Enter a valid price" })
      .positive({ error: "Price must be greater than 0" })
      .max(1_000_000_000, { error: "Price is too large" }),
    quantity: z.coerce
      .number({ error: "Enter a valid quantity" })
      .int({ error: "Quantity must be a whole number" })
      .min(1, { error: "Quantity must be at least 1" })
      .max(100000, { error: "Quantity is too large" }),
    address: z
      .string()
      .trim()
      .max(200, { error: "Address is too long" })
      .optional()
      .or(z.literal("")),
    phone: kenyanPhoneSchema,
  })
  .extend(coordinatesSchema.shape);

export type ListingFields = z.infer<typeof listingFieldsSchema>;

export function validateListingImages(files: File[], existingCount: number = 0): string | null {
  const total = files.length + existingCount;
  if (total === 0) return "Add at least one photo";
  if (total > MAX_IMAGES) return `You can add up to ${MAX_IMAGES} photos`;
  for (const file of files) {
    if (!file.type.startsWith("image/")) return "Only image files are allowed";
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      return `Each photo must be under ${MAX_IMAGE_SIZE_MB}MB`;
    }
  }
  return null;
}
