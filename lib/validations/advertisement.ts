import { z } from "zod";
import { kenyanPhoneSchema } from "@/lib/validations/phone";

export const AD_PRICE_PER_DAY_KES = 25;
export const MAX_AD_DAYS = 90;

// Quick-fill reason admins can attach when rejecting an advert whose YouTube link won't play
// reliably — the most common rejection reason.
export const VIDEO_NOT_PLAYING_REASON =
  "Error: the YouTube link is not playing. Please check the link and resubmit.";

const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

export function extractYoutubeId(url: string): string | null {
  const match = url.match(YOUTUBE_REGEX);
  return match ? match[1] : null;
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
    youtubeUrl: z.string().trim().optional().or(z.literal("")),
  })
  .refine((data) => !data.youtubeUrl || !!extractYoutubeId(data.youtubeUrl), {
    error: "Enter a valid YouTube video URL",
    path: ["youtubeUrl"],
  });

export type CreateAdvertisementInput = z.infer<typeof createAdvertisementSchema>;

export const editAdvertisementVideoSchema = z
  .object({
    advertisementId: z.string().min(1),
    youtubeUrl: z.string().trim().optional().or(z.literal("")),
  })
  .refine((data) => !data.youtubeUrl || !!extractYoutubeId(data.youtubeUrl), {
    error: "Enter a valid YouTube video URL",
    path: ["youtubeUrl"],
  });
