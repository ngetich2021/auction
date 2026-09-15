"use client";

import Image from "next/image";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useSingleFlightAction } from "@/hooks/useSingleFlightAction";
import { createListing, updateListing } from "@/lib/actions/listings";
import {
  CATEGORY_LABELS,
  LISTING_CATEGORIES,
  listingFieldsSchema,
  validateListingImages,
  MAX_IMAGES,
} from "@/lib/validations/listing";
import { LocationPicker } from "@/components/LocationPicker";
import { FormAlert } from "@/components/ui/FormAlert";
import { FieldError } from "@/components/ui/FieldError";
import type { LatLng } from "@/components/map/LeafletMap";
import type { ClientListing } from "@/types/listing";

export function ListingForm({
  phone,
  listing,
  onSuccess,
}: {
  phone: string;
  listing?: ClientListing;
  onSuccess?: () => void;
}) {
  const isEditing = !!listing;
  const [state, formAction, pending] = useSingleFlightAction(isEditing ? updateListing : createListing);
  const [keepImages, setKeepImages] = useState<string[]>(listing?.images ?? []);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [location, setLocation] = useState<LatLng | null>(
    listing ? { latitude: listing.latitude, longitude: listing.longitude } : null
  );
  const [address, setAddress] = useState(listing?.address ?? "");
  const [clientErrors, setClientErrors] = useState<Record<string, string[]>>({});
  const imagesInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.ok]);

  function handleImagesChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setImages(files);
    setPreviews(files.map((file) => URL.createObjectURL(file)));
  }

  function handleRemoveNewImage(index: number) {
    const nextImages = images.filter((_, i) => i !== index);
    URL.revokeObjectURL(previews[index]);
    setImages(nextImages);
    setPreviews((prev) => prev.filter((_, i) => i !== index));

    const dataTransfer = new DataTransfer();
    nextImages.forEach((file) => dataTransfer.items.add(file));
    if (imagesInputRef.current) imagesInputRef.current.files = dataTransfer.files;
  }

  function handleRemoveKeptImage(url: string) {
    setKeepImages((prev) => prev.filter((u) => u !== url));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const formData = new FormData(e.currentTarget);
    const fieldsResult = listingFieldsSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description"),
      category: formData.get("category"),
      price: formData.get("price"),
      quantity: formData.get("quantity"),
      address: formData.get("address"),
      latitude: location?.latitude,
      longitude: location?.longitude,
      phone: formData.get("phone"),
    });
    const imageError = validateListingImages(images, keepImages.length);

    if (!fieldsResult.success || imageError) {
      e.preventDefault();
      setClientErrors({
        ...(fieldsResult.success ? {} : fieldsResult.error.flatten().fieldErrors),
        ...(imageError ? { images: [imageError] } : {}),
      });
      return;
    }
    setClientErrors({});
  }

  const errors: Record<string, string[] | undefined> = { ...clientErrors, ...state?.errors };
  const remainingSlots = MAX_IMAGES - keepImages.length;

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <h2 className="text-base font-semibold">{isEditing ? "Edit listing" : "New listing"}</h2>
      <FormAlert ok={state?.ok} message={state?.message} />
      {isEditing && <input type="hidden" name="listingId" value={listing.id} />}
      {keepImages.map((url) => (
        <input key={url} type="hidden" name="keepImages" value={url} />
      ))}

      <label className="flex flex-col gap-1 text-sm">
        Title
        <input
          name="title"
          required
          minLength={3}
          maxLength={100}
          defaultValue={listing?.title}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
        />
        <FieldError messages={errors.title} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Description
        <textarea
          name="description"
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          defaultValue={listing?.description}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
        />
        <FieldError messages={errors.description} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Category
          <select
            name="category"
            required
            defaultValue={listing?.category ?? ""}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          >
            <option value="" disabled>
              Select…
            </option>
            {LISTING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <FieldError messages={errors.category} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Price (KES)
          <input
            name="price"
            type="number"
            min={1}
            step="0.01"
            required
            defaultValue={listing?.price}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          />
          <FieldError messages={errors.price} />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Quantity
        <input
          name="quantity"
          type="number"
          min={1}
          defaultValue={listing?.quantity ?? 1}
          required
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
        />
        <FieldError messages={errors.quantity} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Contact phone number
        <input
          name="phone"
          type="tel"
          required
          placeholder="07XXXXXXXX"
          defaultValue={listing?.phone ?? phone}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
        />
        <FieldError messages={errors.phone} />
      </label>

      <div className="flex flex-col gap-1 text-sm">
        Address & location (optional)
        <LocationPicker
          location={location}
          onChange={setLocation}
          address={address}
          onAddressChange={setAddress}
        />
        <FieldError messages={errors.address} />
        <FieldError messages={errors.latitude ?? errors.longitude} />
        <input type="hidden" name="latitude" value={location?.latitude ?? ""} />
        <input type="hidden" name="longitude" value={location?.longitude ?? ""} />
      </div>

      <div className="flex flex-col gap-2 text-sm">
        Photos (up to {MAX_IMAGES})
        {keepImages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {keepImages.map((url) => (
              <div key={url} className="relative h-16 w-16 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                <Image src={url} alt="" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveKeptImage(url)}
                  aria-label="Remove photo"
                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[10px] leading-none text-white hover:bg-black/80"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {remainingSlots > 0 && (
          <input
            ref={imagesInputRef}
            name="images"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImagesChange}
            className="text-sm"
          />
        )}
        <FieldError messages={errors.images} />
        {previews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                <Image src={src} alt="" fill className="object-cover" unoptimized />
                <button
                  type="button"
                  onClick={() => handleRemoveNewImage(i)}
                  aria-label="Remove photo"
                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[10px] leading-none text-white hover:bg-black/80"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Saving…" : isEditing ? "Save changes" : "Post item"}
      </button>
    </form>
  );
}
