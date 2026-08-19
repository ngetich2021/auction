import "server-only";
import { prisma } from "@/lib/db";
import { LISTING_POST_FEE_KES } from "@/lib/validations/listing";
import type { ListingCategory, Prisma } from "@prisma/client";

const EARTH_RADIUS_KM = 6371;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function boundingBox(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
  return {
    latitude: { gte: lat - latDelta, lte: lat + latDelta },
    longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
  };
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

export async function getListings(filter: ListingFilter = {}) {
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
    ...(filter.near ? boundingBox(filter.near.latitude, filter.near.longitude, filter.near.radiusKm) : {}),
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

  const filtered = filter.near
    ? withDistance.filter((l) => (l.distanceKm ?? Infinity) <= filter.near!.radiusKm)
    : withDistance;

  filtered.sort((a, b) => {
    if (a.isBoosted !== b.isBoosted) return a.isBoosted ? -1 : 1;
    if (filter.near) return (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return filtered.slice(0, take);
}

export async function getListingCount() {
  return prisma.listing.count({ where: { status: "AVAILABLE" } });
}

export async function getListingById(id: string) {
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
}

export type ListingPaymentStatus = "PAID" | "AWAITING_PAYMENT" | "FAILED";

export async function getMyListings(sellerId: string) {
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
}

export async function getOrdersForBuyer(buyerId: string) {
  const orders = await prisma.order.findMany({
    where: { buyerId },
    include: { listing: { select: { id: true, title: true, images: true } } },
    orderBy: { createdAt: "desc" },
  });
  return orders.map((order) => ({
    ...order,
    listing: { ...order.listing, images: parseListingImages(order.listing.images) },
  }));
}

export async function getOrdersForSeller(sellerId: string) {
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
}

export async function getUserAdvertisements(ownerId: string) {
  return prisma.advertisement.findMany({
    where: { ownerId },
    include: { listing: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActivePromoVideos() {
  const ads = await prisma.advertisement.findMany({
    where: { status: "ACTIVE", endsAt: { gt: new Date() }, videoUrl: { not: null } },
    include: { listing: { select: { id: true, title: true, price: true, category: true } } },
    orderBy: { startsAt: "desc" },
    take: 10,
  });

  return ads.map((ad, index) => ({
    id: ad.id,
    number: index + 1,
    title: ad.listing.title,
    videoUrl: ad.videoUrl!,
    videoSource: ad.videoSource!,
    listingId: ad.listing.id,
    price: ad.listing.price,
    category: ad.listing.category,
  }));
}

export type MoverFilter = {
  near?: { latitude: number; longitude: number; radiusKm: number };
};

export async function getMovers(filter: MoverFilter = {}) {
  const near = filter.near;

  const movers = await prisma.mover.findMany({
    where: {
      active: true,
      ...(near ? boundingBox(near.latitude, near.longitude, near.radiusKm) : {}),
    },
    include: { owner: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const withDistance = movers.map((mover) => ({
    ...mover,
    distanceKm: near ? haversineKm(near.latitude, near.longitude, mover.latitude, mover.longitude) : null,
  }));

  const filtered = near ? withDistance.filter((m) => (m.distanceKm ?? Infinity) <= near.radiusKm) : withDistance;

  filtered.sort((a, b) =>
    near ? (a.distanceKm ?? 0) - (b.distanceKm ?? 0) : b.createdAt.getTime() - a.createdAt.getTime()
  );

  return filtered;
}

export async function getMyMovers(ownerId: string) {
  const movers = await prisma.mover.findMany({
    where: { ownerId },
    include: { owner: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  });
  return movers.map((mover) => ({ ...mover, distanceKm: null as number | null }));
}

export async function getAdminStats() {
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
}

export async function getAllUsersForAdmin() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
  });
}

export async function getAllListingsForAdmin() {
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
}

export async function getAllOrdersForAdmin() {
  return prisma.order.findMany({
    include: {
      listing: { select: { title: true } },
      buyer: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getAllAdvertisementsForAdmin() {
  return prisma.advertisement.findMany({
    include: {
      listing: { select: { title: true } },
      owner: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

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

export async function getAllPaymentsForAdmin(): Promise<AdminPayment[]> {
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
}
