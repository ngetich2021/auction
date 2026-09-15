"use client";

import Image from "next/image";
import type { ChangeEvent, FormEvent } from "react";
import { useRef, useState } from "react";
import { useSingleFlightAction } from "@/hooks/useSingleFlightAction";
import { createOffer, updateOffer } from "@/lib/actions/offers";
import { offerFieldsSchema, validateOfferImage } from "@/lib/validations/offer";
import { LocationPicker } from "@/components/LocationPicker";
import { FormAlert } from "@/components/ui/FormAlert";
import { FieldError } from "@/components/ui/FieldError";
import type { LatLng } from "@/components/map/LeafletMap";
import type { ClientOffer } from "@/types/offer";

const shopStepSchema = offerFieldsSchema.pick({ shopName: true, phone: true, address: true, latitude: true, longitude: true });

export function OfferForm({ defaultPhone, offer }: { defaultPhone: string; offer?: ClientOffer }) {
  const isEditing = !!offer;
  const [state, formAction, pending] = useSingleFlightAction(isEditing ? updateOffer : createOffer);
  const [step, setStep] = useState<1 | 2>(1);
  const [location, setLocation] = useState<LatLng | null>(
    offer ? { latitude: offer.latitude, longitude: offer.longitude } : null
  );
  const [address, setAddress] = useState(offer?.address ?? "");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [clientErrors, setClientErrors] = useState<Record<string, string[]>>({});
  const imageInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Editing skips the shop-then-offer wizard — both steps just render together on one screen.
  const wizard = !isEditing;
  const showShopStep = !wizard || step === 1;
  const showOfferStep = !wizard || step === 2;

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
      shopName: formData.get("shopName"),
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
    const fieldsResult = offerFieldsSchema.safeParse({
      shopName: formData.get("shopName"),
      title: formData.get("title"),
      description: formData.get("description"),
      discount: formData.get("discount"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      expiresAt: formData.get("expiresAt"),
      latitude: location?.latitude,
      longitude: location?.longitude,
    });
    const imageError = validateOfferImage(image, !isEditing);

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
          ? "Edit offer"
          : step === 1
            ? "Step 1 of 2 — Your shop"
            : "Step 2 of 2 — About the offer"}
      </h3>
      <FormAlert ok={state?.ok} message={state?.message} />
      {isEditing && <input type="hidden" name="offerId" value={offer.id} />}

      <div hidden={!showShopStep} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Shop name
          <input
            name="shopName"
            required
            minLength={2}
            maxLength={80}
            defaultValue={offer?.shopName}
            placeholder="e.g. Jamal Electronics"
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          />
          <FieldError messages={errors.shopName} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Phone number
          <input
            name="phone"
            type="tel"
            required
            placeholder="07XXXXXXXX"
            defaultValue={offer?.phone ?? defaultPhone}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          />
          <FieldError messages={errors.phone} />
        </label>

        <div className="flex flex-col gap-1 text-sm">
          Shop location
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
            Next: about the offer
          </button>
        )}
      </div>

      <div hidden={!showOfferStep} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Offer title
          <input
            name="title"
            required
            minLength={2}
            maxLength={100}
            defaultValue={offer?.title}
            placeholder="e.g. 20% off all electronics"
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          />
          <FieldError messages={errors.title} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Discount (optional)
          <input
            name="discount"
            maxLength={40}
            defaultValue={offer?.discount ?? ""}
            placeholder="e.g. 20% OFF, Buy 1 Get 1"
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          />
          <FieldError messages={errors.discount} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Description (optional)
          <textarea
            name="description"
            maxLength={300}
            rows={2}
            defaultValue={offer?.description ?? ""}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          />
          <FieldError messages={errors.description} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Offer ends (optional)
          <input
            name="expiresAt"
            type="date"
            defaultValue={
              offer?.expiresAt ? new Date(offer.expiresAt).toISOString().slice(0, 10) : undefined
            }
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          />
          <FieldError messages={errors.expiresAt} />
        </label>

        <div className="flex flex-col gap-2 text-sm">
          Offer photo {isEditing && <span className="text-xs text-zinc-400">(leave blank to keep current photo)</span>}
          <input
            ref={imageInputRef}
            name="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="text-sm"
          />
          <FieldError messages={errors.image} />
          {(preview || (isEditing && offer.image)) && (
            <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              <Image src={preview ?? offer!.image} alt="" fill className="object-cover" unoptimized={!!preview} />
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
            {pending ? "Saving…" : isEditing ? "Save changes" : "Announce offer"}
          </button>
        </div>
      </div>
    </form>
  );
}
