"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Session } from "next-auth";
import { useSingleFlightAction } from "@/hooks/useSingleFlightAction";
import { createListing } from "@/lib/actions/listings";
import {
  CATEGORY_LABELS,
  LISTING_CATEGORIES,
  listingFieldsSchema,
  validateListingImages,
  MAX_IMAGES,
  LISTING_POST_FEE_KES,
} from "@/lib/validations/listing";
import { LocationPicker } from "@/components/LocationPicker";
import { Modal } from "@/components/ui/Modal";
import { FormAlert } from "@/components/ui/FormAlert";
import { FieldError } from "@/components/ui/FieldError";
import { SignInPrompt } from "@/components/ui/SignInPrompt";
import type { LatLng } from "@/components/map/LeafletMap";

const MAX_POLL_ATTEMPTS = 20;

export function PostSection({ session }: { session: Session | null }) {
  const router = useRouter();
  const [state, formAction, pending] = useSingleFlightAction(createListing);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [address, setAddress] = useState("");
  const [clientErrors, setClientErrors] = useState<Record<string, string[]>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [opening, startOpening] = useTransition();
  const [listingStatus, setListingStatus] = useState<string | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [seenListingId, setSeenListingId] = useState<string | null>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);

  const activeListingId = state?.ok ? (state.data?.listingId ?? null) : null;
  if (activeListingId && activeListingId !== seenListingId) {
    setSeenListingId(activeListingId);
    setListingStatus("PENDING");
    setPollTimedOut(false);
  }

  useEffect(() => {
    if (!activeListingId) return;
    let attempts = 0;
    const pollId = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/listings/${activeListingId}/status`);
        if (res.ok) {
          const data = await res.json();
          setListingStatus(data.status);
          if (data.status !== "PENDING") {
            clearInterval(pollId);
            return;
          }
        }
      } catch {
        // transient network error while polling; the next tick retries
      }
      if (attempts >= MAX_POLL_ATTEMPTS) {
        clearInterval(pollId);
        setPollTimedOut(true);
      }
    }, 3000);
    return () => clearInterval(pollId);
  }, [activeListingId]);

  if (!session) {
    return <SignInPrompt message="Sign in to post a listing." />;
  }

  function handleAddPostClick() {
    startOpening(() => {
      if (!session?.user.phone) {
        router.push("/settings");
        return;
      }
      setFormOpen(true);
    });
  }

  if (!formOpen) {
    return (
      <button
        type="button"
        onClick={handleAddPostClick}
        disabled={opening}
        className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {opening ? "Loading…" : "Add post"}
      </button>
    );
  }

  function handleImagesChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setImages(files);
    setPreviews(files.map((file) => URL.createObjectURL(file)));
  }

  function handleRemoveImage(index: number) {
    const nextImages = images.filter((_, i) => i !== index);
    URL.revokeObjectURL(previews[index]);
    setImages(nextImages);
    setPreviews((prev) => prev.filter((_, i) => i !== index));

    const dataTransfer = new DataTransfer();
    nextImages.forEach((file) => dataTransfer.items.add(file));
    if (imagesInputRef.current) imagesInputRef.current.files = dataTransfer.files;
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
    const imageError = validateListingImages(images);

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

  return (
    <Modal onClose={() => setFormOpen(false)}>
      <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
        <h2 className="text-base font-semibold">New listing</h2>
        <FormAlert ok={state?.ok} message={state?.message} />

        <label className="flex flex-col gap-1 text-sm">
          Title
          <input
            name="title"
            required
            minLength={3}
            maxLength={100}
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
              defaultValue=""
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
            defaultValue={1}
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
            defaultValue={session.user.phone ?? ""}
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
          <input
            ref={imagesInputRef}
            name="images"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImagesChange}
            className="text-sm"
          />
          <FieldError messages={errors.images} />
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <Image src={src} alt="" fill className="object-cover" unoptimized />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
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
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Starting payment…" : `Pay KES ${LISTING_POST_FEE_KES} & post`}
        </button>

        {listingStatus && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-sm">
            {listingStatus === "PENDING" && pollTimedOut && (
              <p className="text-red-600 dark:text-red-400">
                We couldn&apos;t confirm your payment. If you didn&apos;t get a prompt on your phone, the request
                failed to reach it — try again.
              </p>
            )}
            {listingStatus === "PENDING" && !pollTimedOut && (
              <p>Check your phone and enter your M-Pesa PIN to complete the KES {LISTING_POST_FEE_KES} payment…</p>
            )}
            {listingStatus === "AVAILABLE" && (
              <p className="text-emerald-600 dark:text-emerald-400">Payment received. Your listing is now live.</p>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
