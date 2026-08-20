"use client";

import Image from "next/image";
import type { ChangeEvent, FormEvent } from "react";
import { useRef, useState } from "react";
import { useSingleFlightAction } from "@/hooks/useSingleFlightAction";
import { createMover } from "@/lib/actions/movers";
import { moverFieldsSchema, validateMoverImage } from "@/lib/validations/mover";
import { LocationPicker } from "@/components/LocationPicker";
import { FormAlert } from "@/components/ui/FormAlert";
import { FieldError } from "@/components/ui/FieldError";
import type { LatLng } from "@/components/map/LeafletMap";

export function MoverForm({ defaultPhone }: { defaultPhone: string }) {
  const [state, formAction, pending] = useSingleFlightAction(createMover);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [address, setAddress] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [clientErrors, setClientErrors] = useState<Record<string, string[]>>({});
  const imageInputRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImage(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  function handleRemoveImage() {
    if (preview) URL.revokeObjectURL(preview);
    setImage(null);
    setPreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const formData = new FormData(e.currentTarget);
    const fieldsResult = moverFieldsSchema.safeParse({
      vehicleType: formData.get("vehicleType"),
      description: formData.get("description"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      latitude: location?.latitude,
      longitude: location?.longitude,
    });
    const imageError = validateMoverImage(image);

    if (!fieldsResult.success || imageError) {
      e.preventDefault();
      setClientErrors({
        ...(fieldsResult.success ? {} : fieldsResult.error.flatten().fieldErrors),
        ...(imageError ? { image: [imageError] } : {}),
      });
      return;
    }
    setClientErrors({});
  }

  const errors: Record<string, string[] | undefined> = { ...clientErrors, ...state?.errors };

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <h3 className="text-sm font-semibold">List your vehicle</h3>
      <FormAlert ok={state?.ok} message={state?.message} />

      <label className="flex flex-col gap-1 text-sm">
        Vehicle type
        <input
          name="vehicleType"
          required
          minLength={2}
          maxLength={60}
          placeholder="e.g. Pickup, Canter, Lorry"
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
        />
        <FieldError messages={errors.vehicleType} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Description (optional)
        <textarea
          name="description"
          maxLength={300}
          rows={2}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
        />
        <FieldError messages={errors.description} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Phone number
        <input
          name="phone"
          type="tel"
          required
          placeholder="07XXXXXXXX"
          defaultValue={defaultPhone}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
        />
        <FieldError messages={errors.phone} />
      </label>

      <div className="flex flex-col gap-1 text-sm">
        Location
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
        Vehicle photo
        <input
          ref={imageInputRef}
          name="image"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="text-sm"
        />
        <FieldError messages={errors.image} />
        {preview && (
          <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <Image src={preview} alt="" fill className="object-cover" unoptimized />
            <button
              type="button"
              onClick={handleRemoveImage}
              aria-label="Remove photo"
              className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[10px] leading-none text-white hover:bg-black/80"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Posting…" : "List vehicle"}
      </button>
    </form>
  );
}
