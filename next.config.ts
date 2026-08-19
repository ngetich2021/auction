import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  experimental: {
    serverActions: {
      // MAX_IMAGES (6) * MAX_IMAGE_SIZE_MB (5) in lib/validations/listing.ts, plus multipart overhead.
      bodySizeLimit: "32mb",
    },
  },
};

export default nextConfig;
