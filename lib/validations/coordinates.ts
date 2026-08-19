import { z } from "zod";

export const coordinatesSchema = z.object({
  latitude: z.coerce
    .number({ error: "Pick a location on the map" })
    .min(-90, { error: "Latitude must be between -90 and 90" })
    .max(90, { error: "Latitude must be between -90 and 90" }),
  longitude: z.coerce
    .number({ error: "Pick a location on the map" })
    .min(-180, { error: "Longitude must be between -180 and 180" })
    .max(180, { error: "Longitude must be between -180 and 180" }),
});

export type Coordinates = z.infer<typeof coordinatesSchema>;
