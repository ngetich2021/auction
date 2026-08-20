import { v2 as cloudinary } from "cloudinary";
import "server-only";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadFile(file: File, folder: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: "image" }, (error, result) => {
      if (error || !result) {
        reject(error ?? new Error("Cloudinary upload failed"));
        return;
      }
      resolve(result.secure_url);
    });
    stream.end(buffer);
  });
}

export function uploadListingImage(file: File): Promise<string> {
  return uploadFile(file, "disposals/listings");
}

export function uploadMoverImage(file: File): Promise<string> {
  return uploadFile(file, "disposals/movers");
}
