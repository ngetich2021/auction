"use client";

import Image from "next/image";
import type { ChangeEvent, FormEvent } from "react";
import { useRef, useState } from "react";
import { useSingleFlightAction } from "@/hooks/useSingleFlightAction";
import { createEatery, updateEatery } from "@/lib/actions/eateries";
import { eateryFieldsSchema, validateEateryImage } from "@/lib/validations/eatery";
import { LocationPicker } from "@/components/LocationPicker";
import { FormAlert } from "@/components/ui/FormAlert";
import { FieldError } from "@/components/ui/FieldError";
import type { LatLng } from "@/components/map/LeafletMap";
import type { ClientEatery } from "@/types/eatery";

const shopStepSchema = eateryFieldsSchema.pick({ name: true, phone: true, address: true, latitude: true, longitude: true });

export function EateryForm({ defaultPhone, eatery }: { defaultPhone: string; eatery?: ClientEatery }) {
  const isEditing = !!eatery;
  const [state, formAction, pending] = useSingleFlightAction(isEditing ? updateEatery : createEatery);
  const [step, setStep] = useState<1 | 2>(1);
  const [location, setLocation] = useState<LatLng | null>(
    eatery ? { latitude: eatery.latitude, longitude: eatery.longitude } : null
  );
  const [address, setAddress] = useState(eatery?.address ?? "");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [clientErrors, setClientErrors] = useState<Record<string, string[]>>({});
  const imageInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Editing skips the shop-then-eatery wizard — both steps just render together on one screen.
  const wizard = !isEditing;
  const showShopStep = !wizard || step === 1;
  const showEateryStep = !wizard || step === 2;

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

  function handleNext() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const result = shopStepSchema.safeParse({
      name: formData.get("name"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      latitude: location?.latitude,
      longitude: location?.longitude,
    });
    if (!result.success) {
      setClientErrors(result.error.flatten().fieldErrors);
      return;
    }
    setClientErrors({});
    setStep(2);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const formData = new FormData(e.currentTarget);
    const fieldsResult = eateryFieldsSchema.safeParse({
      name: formData.get("name"),
      foodType: formData.get("foodType"),
      description: formData.get("description"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      latitude: location?.latitude,
      longitude: location?.longitude,
    });
    const imageError = validateEateryImage(image, !isEditing);

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
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <h3 className="text-sm font-semibold">
        {isEditing
          ? "Edit eatery"
          : step === 1
            ? "Step 1 of 2 — Your shop"
            : "Step 2 of 2 — About the eatery"}
      </h3>
      <FormAlert ok={state?.ok} message={state?.message} />
      {isEditing && <input type="hidden" name="eateryId" value={eatery.id} />}

      <div hidden={!showShopStep} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Eatery / shop name
          <input
            name="name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={eatery?.name}
            placeholder="e.g. Mama Njeri's Kitchen"
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          />
          <FieldError messages={errors.name} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Phone number
          <input
            name="phone"
            type="tel"
            required
            placeholder="07XXXXXXXX"
            defaultValue={eatery?.phone ?? defaultPhone}
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

        {wizard && (
          <button
            type="button"
            onClick={handleNext}
            className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Next: about the eatery
          </button>
        )}
      </div>

      <div hidden={!showEateryStep} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Food type (optional)
          <input
            name="foodType"
            maxLength={60}
            defaultValue={eatery?.foodType ?? ""}
            placeholder="e.g. Local dishes, Fast food, Bakery, Groceries"
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          />
          <FieldError messages={errors.foodType} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Description (optional)
          <textarea
            name="description"
            maxLength={300}
            rows={2}
            defaultValue={eatery?.description ?? ""}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          />
          <FieldError messages={errors.description} />
        </label>

        <div className="flex flex-col gap-2 text-sm">
          Photo {isEditing && <span className="text-xs text-zinc-400">(leave blank to keep current photo)</span>}
          <input
            ref={imageInputRef}
            name="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="text-sm"
          />
          <FieldError messages={errors.image} />
          {(preview || (isEditing && eatery.image)) && (
            <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              <Image src={preview ?? eatery!.image} alt="" fill className="object-cover" unoptimized={!!preview} />
              {preview && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  aria-label="Remove photo"
                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[10px] leading-none text-white hover:bg-black/80"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {wizard && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "Saving…" : isEditing ? "Save changes" : "List eatery"}
          </button>
        </div>
      </div>
    </form>
  );
}
