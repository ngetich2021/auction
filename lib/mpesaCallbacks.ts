import "server-only";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { AD_PRICE_PER_DAY_KES } from "@/lib/validations/advertisement";

// Shared by both the passive /api/mpesa/callback webhook and the active status-poll
// reconciliation path (lib/mpesa.ts queryStkPushStatus) — both resolve to the same
// succeeded/resultDesc/receiptNumber shape and must apply identical side effects.

export async function handleAdvertisementCallback(
  ad: { id: string; ownerId: string; listingId: string; pendingExtensionDays: number | null; endsAt: Date | null; amount: number },
  succeeded: boolean,
  resultDesc: string | undefined,
  receiptNumber: string | undefined
) {
  const isExtension = ad.pendingExtensionDays != null;

  if (!succeeded) {
    if (isExtension) {
      // The ad is already live; a failed extension payment shouldn't take it down.
      await prisma.advertisement.update({
        where: { id: ad.id },
        data: { pendingExtensionDays: null, failureReason: resultDesc ?? "Extension payment was not completed." },
      });
      return;
    }
    await prisma.advertisement.update({
      where: { id: ad.id },
      data: { status: "CANCELLED", failureReason: resultDesc ?? "Payment was not completed." },
    });
    return;
  }

  if (isExtension) {
    const days = ad.pendingExtensionDays!;
    const base = ad.endsAt && ad.endsAt > new Date() ? ad.endsAt : new Date();
    const endsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    await prisma.advertisement.update({
      where: { id: ad.id },
      data: {
        endsAt,
        amount: ad.amount + days * AD_PRICE_PER_DAY_KES,
        mpesaReceipt: receiptNumber ?? null,
        pendingExtensionDays: null,
        failureReason: null,
      },
    });

    const owner = await prisma.user.findUnique({ where: { id: ad.ownerId }, select: { email: true } });
    if (owner?.email) {
      await sendMail({
        to: owner.email,
        subject: "Your advertisement was extended",
        html: `<p>Your advertisement boost was extended by ${days} day(s). It now runs until ${endsAt.toLocaleDateString()}.</p>`,
      });
    }
    return;
  }

  // Payment succeeded, but the ad still needs an admin to review the content before it goes live.
  await prisma.advertisement.update({
    where: { id: ad.id },
    data: { status: "PENDING_APPROVAL", mpesaReceipt: receiptNumber ?? null },
  });

  const [listing, admins] = await Promise.all([
    prisma.listing.findUnique({ where: { id: ad.listingId }, select: { title: true } }),
    prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } }),
  ]);

  await Promise.all(
    admins.map((admin) =>
      sendMail({
        to: admin.email,
        subject: "An advertisement is awaiting your approval",
        html: `<p>A new advertisement for "${
          listing?.title ?? "a listing"
        }" was paid for and is waiting for approval before it goes live.</p><p>Review it in the admin dashboard.</p>`,
      })
    )
  );
}

// Shared shape for the near-identical blue-star badge callbacks below (Listing/Mover/Offer/Eatery).
async function applyBadgeCallback(
  model: { update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> },
  id: string,
  succeeded: boolean,
  resultDesc: string | undefined,
  receiptNumber: string | undefined
) {
  if (!succeeded) {
    await model.update({
      where: { id },
      data: { badgeFailureReason: resultDesc ?? "Payment was not completed." },
    });
    return;
  }
  await model.update({
    where: { id },
    data: { badge: true, badgeReceipt: receiptNumber ?? null, badgeFailureReason: null },
  });
}

export function handleListingBadgeCallback(
  listing: { id: string },
  succeeded: boolean,
  resultDesc: string | undefined,
  receiptNumber: string | undefined
) {
  return applyBadgeCallback(prisma.listing, listing.id, succeeded, resultDesc, receiptNumber);
}

export function handleMoverBadgeCallback(
  mover: { id: string },
  succeeded: boolean,
  resultDesc: string | undefined,
  receiptNumber: string | undefined
) {
  return applyBadgeCallback(prisma.mover, mover.id, succeeded, resultDesc, receiptNumber);
}

export function handleOfferBadgeCallback(
  offer: { id: string },
  succeeded: boolean,
  resultDesc: string | undefined,
  receiptNumber: string | undefined
) {
  return applyBadgeCallback(prisma.offer, offer.id, succeeded, resultDesc, receiptNumber);
}

export function handleEateryBadgeCallback(
  eatery: { id: string },
  succeeded: boolean,
  resultDesc: string | undefined,
  receiptNumber: string | undefined
) {
  return applyBadgeCallback(prisma.eatery, eatery.id, succeeded, resultDesc, receiptNumber);
}
