import { z } from "zod";
import { kenyanPhoneSchema } from "@/lib/validations/phone";

export const AD_PRICE_PER_DAY_KES = 25;
export const MAX_AD_DAYS = 90;

export const VIDEO_SOURCES = ["NONE", "YOUTUBE", "UPLOAD"] as const;
export type VideoSourceChoice = (typeof VIDEO_SOURCES)[number];

export const MAX_VIDEO_SIZE_MB = 50;

const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

export function extractYoutubeId(url: string): string | null {
  const match = url.match(YOUTUBE_REGEX);
  return match ? match[1] : null;
}

export function validatePromoVideoFile(file: File): string | null {
  if (!file.type.startsWith("video/")) return "Only video files are allowed";
  if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
    return `Video must be under ${MAX_VIDEO_SIZE_MB}MB`;
  }
  return null;
}

export const createAdvertisementSchema = z
  .object({
    listingId: z.string().min(1, { error: "Select a listing to advertise" }),
    days: z.coerce
      .number({ error: "Enter the number of days" })
      .int({ error: "Days must be a whole number" })
      .min(1, { error: "Boost for at least 1 day" })
      .max(MAX_AD_DAYS, { error: `Boost for at most ${MAX_AD_DAYS} days` }),
    phone: kenyanPhoneSchema,
    videoSource: z.enum(VIDEO_SOURCES).default("NONE"),
    youtubeUrl: z.string().trim().optional().or(z.literal("")),
  })
  .refine((data) => data.videoSource !== "YOUTUBE" || !!(data.youtubeUrl && extractYoutubeId(data.youtubeUrl)), {
    error: "Enter a valid YouTube video URL",
    path: ["youtubeUrl"],
  });

export type CreateAdvertisementInput = z.infer<typeof createAdvertisementSchema>;
