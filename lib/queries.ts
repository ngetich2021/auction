import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { LISTING_POST_FEE_KES } from "@/lib/validations/listing";
import { FREE_VISIBILITY_RADIUS_KM } from "@/lib/validations/badge";
import { haversineKm } from "@/lib/geo";
import type { ListingCategory, Prisma } from "@prisma/client";

function boundingBox(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
  return {
    latitude: { gte: lat - latDelta, lte: lat + latDelta },
    longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
  };
}

// Free (unbadged) listings are only discoverable within FREE_VISIBILITY_RADIUS_KM of the
// viewer's chosen location; a blue-star badge lifts that cap up to whatever radius the viewer
// searched with. Callers only invoke this once `near` is set — with no location picked at all,
// the query itself restricts results to badged listings (see each getX's `where` clause).
function withinFreeRadius(item: { distanceKm: number | null; badge: boolean }, near: { radiusKm: number }): boolean {
  const maxRadiusKm = item.badge ? near.radiusKm : Math.min(near.radiusKm, FREE_VISIBILITY_RADIUS_KM);
  return (item.distanceKm ?? Infinity) <= maxRadiusKm;
}

export function parseListingImages(images: string): string[] {
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export type ListingFilter = {
  category?: ListingCategory;
  search?: string;
  near?: { latitude: number; longitude: number; radiusKm: number };
  take?: number;
};

const listingWithRelations = {
  seller: { select: { id: true, name: true, image: true } },
  ads: { where: { status: "ACTIVE" as const, endsAt: { gt: new Date() } }, take: 1 },
};

// Never leak M-Pesa checkout/receipt internals through public-facing listing reads.
function omitPaymentFields<T extends { mpesaCheckoutRequestId?: unknown; mpesaReceipt?: unknown; failureReason?: unknown }>(
  listing: T
): Omit<T, "mpesaCheckoutRequestId" | "mpesaReceipt" | "failureReason"> {
  const rest: Partial<T> = { ...listing };
  delete rest.mpesaCheckoutRequestId;
  delete rest.mpesaReceipt;
  delete rest.failureReason;
  return rest as Omit<T, "mpesaCheckoutRequestId" | "mpesaReceipt" | "failureReason">;
}

const REVALIDATE_SECONDS = 5;

export const getListings = unstable_cache(
  async (filter: ListingFilter = {}) => {
    const take = filter.take ?? 40;

    const where: Prisma.ListingWhereInput = {
      status: "AVAILABLE",
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.search
        ? {
            OR: [
              { title: { contains: filter.search } },
              { description: { contains: filter.search } },
            ],
          }
        : {}),
      // With no location picked there's no "near" to measure the free 500m radius against, so
      // only badged (paid, sitewide-visible) listings are discoverable.
      ...(filter.near ? boundingBox(filter.near.latitude, filter.near.longitude, filter.near.radiusKm) : { badge: true }),
    };

    const listings = await prisma.listing.findMany({
      where,
      include: listingWithRelations,
      orderBy: { createdAt: "desc" },
      take: take * 2,
    });

    const withDistance = listings.map((listing) => ({
      ...omitPaymentFields(listing),
      images: parseListingImages(listing.images),
      isBoosted: listing.ads.length > 0,
      distanceKm: filter.near
        ? haversineKm(filter.near.latitude, filter.near.longitude, listing.latitude, listing.longitude)
        : null,
    }));

    const filtered = filter.near ? withDistance.filter((l) => withinFreeRadius(l, filter.near!)) : withDistance;

    filtered.sort((a, b) => {
      if (a.isBoosted !== b.isBoosted) return a.isBoosted ? -1 : 1;
      if (filter.near) return (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return filtered.slice(0, take);
  },
  ["listings"],
  { revalidate: REVALIDATE_SECONDS, tags: ["listings"] }
);

export const getListingById = unstable_cache(
  async (id: string) => {
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: listingWithRelations,
    });
    if (!listing) return null;
    return {
      ...omitPaymentFields(listing),
      images: parseListingImages(listing.images),
      isBoosted: listing.ads.length > 0,
      distanceKm: null,
    };
  },
  ["listing-by-id"],
  { revalidate: REVALIDATE_SECONDS, tags: ["listings"] }
);

export type ListingPaymentStatus = "PAID" | "AWAITING_PAYMENT" | "FAILED";

export const getMyListings = unstable_cache(
  async (sellerId: string) => {
    const listings = await prisma.listing.findMany({
      where: { sellerId },
      include: listingWithRelations,
      orderBy: { createdAt: "desc" },
    });
    return listings.map((listing) => {
      const paymentStatus: ListingPaymentStatus = listing.mpesaReceipt
        ? "PAID"
        : listing.failureReason
          ? "FAILED"
          : "AWAITING_PAYMENT";
      return {
        ...omitPaymentFields(listing),
        images: parseListingImages(listing.images),
        isBoosted: listing.ads.length > 0,
        distanceKm: null as number | null,
        paymentStatus,
      };
    });
  },
  ["my-listings"],
  { revalidate: REVALIDATE_SECONDS, tags: ["listings"] }
);

export const getOrdersForBuyer = unstable_cache(
  async (buyerId: string) => {
    const orders = await prisma.order.findMany({
      where: { buyerId },
      include: { listing: { select: { id: true, title: true, images: true } } },
      orderBy: { createdAt: "desc" },
    });
    return orders.map((order) => ({
      ...order,
      listing: { ...order.listing, images: parseListingImages(order.listing.images) },
    }));
  },
  ["orders-for-buyer"],
  { revalidate: REVALIDATE_SECONDS, tags: ["orders"] }
);

export const getOrdersForSeller = unstable_cache(
  async (sellerId: string) => {
    const orders = await prisma.order.findMany({
      where: { listing: { sellerId } },
      include: {
        listing: { select: { id: true, title: true, images: true } },
        buyer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return orders.map((order) => ({
      ...order,
      listing: { ...order.listing, images: parseListingImages(order.listing.images) },
    }));
  },
  ["orders-for-seller"],
  { revalidate: REVALIDATE_SECONDS, tags: ["orders"] }
);

export const getUserAdvertisements = unstable_cache(
  async (ownerId: string) =>
    prisma.advertisement.findMany({
      where: { ownerId },
      include: { listing: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ["user-advertisements"],
  { revalidate: REVALIDATE_SECONDS, tags: ["advertisements"] }
);

export const getActivePromoVideos = unstable_cache(
  async () => {
    const ads = await prisma.advertisement.findMany({
      where: { status: "ACTIVE", endsAt: { gt: new Date() }, videoUrl: { not: null } },
      include: { listing: { include: listingWithRelations } },
      orderBy: { startsAt: "desc" },
      take: 10,
    });

    return ads.map((ad, index) => ({
      id: ad.id,
      number: index + 1,
      videoUrl: ad.videoUrl!,
      listing: {
        ...omitPaymentFields(ad.listing),
        images: parseListingImages(ad.listing.images),
        isBoosted: true,
        distanceKm: null as number | null,
      },
    }));
  },
  ["active-promo-videos"],
  { revalidate: REVALIDATE_SECONDS, tags: ["advertisements"] }
);

export type MoverFilter = {
  near?: { latitude: number; longitude: number; radiusKm: number };
};

export const getMovers = unstable_cache(
  async (filter: MoverFilter = {}) => {
    const near = filter.near;

    const movers = await prisma.mover.findMany({
      where: {
        active: true,
        // With no location picked there's no "near" to measure the free 500m radius against, so
        // only badged (paid, sitewide-visible) listings are discoverable.
        ...(near ? boundingBox(near.latitude, near.longitude, near.radiusKm) : { badge: true }),
      },
      include: { owner: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: 60,
    });

    const withDistance = movers.map((mover) => ({
      ...mover,
      distanceKm: near ? haversineKm(near.latitude, near.longitude, mover.latitude, mover.longitude) : null,
    }));

    const filtered = near ? withDistance.filter((m) => withinFreeRadius(m, near)) : withDistance;

    filtered.sort((a, b) =>
      near ? (a.distanceKm ?? 0) - (b.distanceKm ?? 0) : b.createdAt.getTime() - a.createdAt.getTime()
    );

    return filtered;
  },
  ["movers"],
  { revalidate: REVALIDATE_SECONDS, tags: ["movers"] }
);

export const getMyMovers = unstable_cache(
  async (ownerId: string) => {
    const movers = await prisma.mover.findMany({
      where: { ownerId },
      include: { owner: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" },
    });
    return movers.map((mover) => ({ ...mover, distanceKm: null as number | null }));
  },
  ["my-movers"],
  { revalidate: REVALIDATE_SECONDS, tags: ["movers"] }
);

export type OfferFilter = {
  near?: { latitude: number; longitude: number; radiusKm: number };
};

export const getOffers = unstable_cache(
  async (filter: OfferFilter = {}) => {
    const near = filter.near;

    const offers = await prisma.offer.findMany({
      where: {
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        // With no location picked there's no "near" to measure the free 500m radius against, so
        // only badged (paid, sitewide-visible) listings are discoverable.
        ...(near ? boundingBox(near.latitude, near.longitude, near.radiusKm) : { badge: true }),
      },
      include: { owner: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: 60,
    });

    const withDistance = offers.map((offer) => ({
      ...offer,
      distanceKm: near ? haversineKm(near.latitude, near.longitude, offer.latitude, offer.longitude) : null,
    }));

    const filtered = near ? withDistance.filter((o) => withinFreeRadius(o, near)) : withDistance;

    filtered.sort((a, b) =>
      near ? (a.distanceKm ?? 0) - (b.distanceKm ?? 0) : b.createdAt.getTime() - a.createdAt.getTime()
    );

    return filtered;
  },
  ["offers"],
  { revalidate: REVALIDATE_SECONDS, tags: ["offers"] }
);

export const getMyOffers = unstable_cache(
  async (ownerId: string) => {
    const offers = await prisma.offer.findMany({
      where: { ownerId },
      include: { owner: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" },
    });
    return offers.map((offer) => ({ ...offer, distanceKm: null as number | null }));
  },
  ["my-offers"],
  { revalidate: REVALIDATE_SECONDS, tags: ["offers"] }
);

export type EateryFilter = {
  near?: { latitude: number; longitude: number; radiusKm: number };
};

export const getEateries = unstable_cache(
  async (filter: EateryFilter = {}) => {
    const near = filter.near;

    const eateries = await prisma.eatery.findMany({
      where: {
        active: true,
        // With no location picked there's no "near" to measure the free 500m radius against, so
        // only badged (paid, sitewide-visible) listings are discoverable.
        ...(near ? boundingBox(near.latitude, near.longitude, near.radiusKm) : { badge: true }),
      },
      include: { owner: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: 60,
    });

    const withDistance = eateries.map((eatery) => ({
      ...eatery,
      distanceKm: near ? haversineKm(near.latitude, near.longitude, eatery.latitude, eatery.longitude) : null,
    }));

    const filtered = near ? withDistance.filter((e) => withinFreeRadius(e, near)) : withDistance;

    filtered.sort((a, b) =>
      near ? (a.distanceKm ?? 0) - (b.distanceKm ?? 0) : b.createdAt.getTime() - a.createdAt.getTime()
    );

    return filtered;
  },
  ["eateries"],
  { revalidate: REVALIDATE_SECONDS, tags: ["eateries"] }
);

export const getMyEateries = unstable_cache(
  async (ownerId: string) => {
    const eateries = await prisma.eatery.findMany({
      where: { ownerId },
      include: { owner: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" },
    });
    return eateries.map((eatery) => ({ ...eatery, distanceKm: null as number | null }));
  },
  ["my-eateries"],
  { revalidate: REVALIDATE_SECONDS, tags: ["eateries"] }
);

export const getAdminStats = unstable_cache(
  async () => {
    const [userCount, listingCount, orderCount, paidOrders, activeAds, pendingApprovals, listingFees] =
      await Promise.all([
        prisma.user.count(),
        prisma.listing.count(),
        prisma.order.count(),
        prisma.order.aggregate({ where: { status: "PAID" }, _sum: { totalAmount: true } }),
        prisma.advertisement.count({ where: { status: "ACTIVE" } }),
        prisma.advertisement.count({ where: { status: "PENDING_APPROVAL" } }),
        prisma.listing.count({ where: { mpesaReceipt: { not: null } } }),
      ]);
    const adRevenue = await prisma.advertisement.aggregate({
      where: { status: { in: ["PENDING_APPROVAL", "ACTIVE", "EXPIRED"] } },
      _sum: { amount: true },
    });
    return {
      userCount,
      listingCount,
      orderCount,
      totalRevenue: paidOrders._sum.totalAmount ?? 0,
      activeAds,
      pendingApprovals,
      listingFeeRevenue: listingFees * LISTING_POST_FEE_KES,
      adRevenue: adRevenue._sum.amount ?? 0,
    };
  },
  ["admin-stats"],
  { revalidate: REVALIDATE_SECONDS, tags: ["admin-stats"] }
);

export const getAllUsersForAdmin = unstable_cache(
  async () =>
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        customRoleId: true,
        customRole: { select: { id: true, name: true } },
      },
    }),
  ["admin-users"],
  { revalidate: REVALIDATE_SECONDS, tags: ["admin-users"] }
);

export const getAllListingsForAdmin = unstable_cache(
  async () => {
    const listings = await prisma.listing.findMany({
      include: { seller: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    return listings.map((listing) => {
      const paymentStatus: ListingPaymentStatus = listing.mpesaReceipt
        ? "PAID"
        : listing.failureReason
          ? "FAILED"
          : "AWAITING_PAYMENT";
      return { ...listing, images: parseListingImages(listing.images), paymentStatus };
    });
  },
  ["admin-listings"],
  { revalidate: REVALIDATE_SECONDS, tags: ["admin-listings"] }
);

export const getAllOrdersForAdmin = unstable_cache(
  async () =>
    prisma.order.findMany({
      include: {
        listing: { select: { title: true } },
        buyer: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ["admin-orders"],
  { revalidate: REVALIDATE_SECONDS, tags: ["admin-orders"] }
);

export const getAllAdvertisementsForAdmin = unstable_cache(
  async () =>
    prisma.advertisement.findMany({
      include: {
        listing: { select: { title: true } },
        owner: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ["admin-adverts"],
  { revalidate: REVALIDATE_SECONDS, tags: ["admin-adverts"] }
);

export const getAllRolesForAdmin = unstable_cache(
  async () => {
    const roles = await prisma.customRole.findMany({
      include: { permissions: { select: { resource: true, action: true } }, _count: { select: { users: true } } },
      orderBy: { createdAt: "asc" },
    });
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      userCount: role._count.users,
      permissions: role.permissions,
    }));
  },
  ["admin-roles"],
  { revalidate: REVALIDATE_SECONDS, tags: ["admin-roles"] }
);

export const getAllMoversForAdmin = unstable_cache(
  async () =>
    prisma.mover.findMany({
      include: { owner: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ["admin-movers"],
  { revalidate: REVALIDATE_SECONDS, tags: ["admin-movers"] }
);

export const getAllOffersForAdmin = unstable_cache(
  async () =>
    prisma.offer.findMany({
      include: { owner: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ["admin-offers"],
  { revalidate: REVALIDATE_SECONDS, tags: ["admin-offers"] }
);

export const getAllEateriesForAdmin = unstable_cache(
  async () =>
    prisma.eatery.findMany({
      include: { owner: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ["admin-eateries"],
  { revalidate: REVALIDATE_SECONDS, tags: ["admin-eateries"] }
);

export type AdminPayment = {
  id: string;
  type: "Listing fee" | "Order" | "Advertisement";
  description: string;
  amount: number;
  payer: string;
  status: string;
  receipt: string | null;
  createdAt: Date;
};

export const getAllPaymentsForAdmin = unstable_cache(
  async (): Promise<AdminPayment[]> => {
    const [listings, orders, ads] = await Promise.all([
      prisma.listing.findMany({
        where: { mpesaCheckoutRequestId: { not: null } },
        include: { seller: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.order.findMany({
        include: { listing: { select: { title: true } }, buyer: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.advertisement.findMany({
        include: { listing: { select: { title: true } }, owner: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

    const listingPayments: AdminPayment[] = listings.map((l) => ({
      id: `listing-${l.id}`,
      type: "Listing fee",
      description: l.title,
      amount: LISTING_POST_FEE_KES,
      payer: l.seller.name ?? l.seller.email,
      status: l.mpesaReceipt ? "PAID" : l.failureReason ? "FAILED" : "PENDING",
      receipt: l.mpesaReceipt,
      createdAt: l.createdAt,
    }));

    const orderPayments: AdminPayment[] = orders.map((o) => ({
      id: `order-${o.id}`,
      type: "Order",
      description: o.listing.title,
      amount: o.totalAmount,
      payer: o.buyer.name ?? o.buyer.email,
      status: o.status,
      receipt: o.mpesaReceipt,
      createdAt: o.createdAt,
    }));

    const adPayments: AdminPayment[] = ads.map((a) => ({
      id: `ad-${a.id}`,
      type: "Advertisement",
      description: a.listing.title,
      amount: a.amount,
      payer: a.owner.name ?? a.owner.email,
      status: a.status,
      receipt: a.mpesaReceipt,
      createdAt: a.createdAt,
    }));

    return [...listingPayments, ...orderPayments, ...adPayments].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  },
  ["admin-payments"],
  { revalidate: REVALIDATE_SECONDS, tags: ["admin-payments"] }
);
