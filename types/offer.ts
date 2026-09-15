export type ClientOffer = {
  id: string;
  shopName: string;
  title: string;
  description: string | null;
  discount: string | null;
  phone: string;
  image: string;
  active: boolean;
  badge: boolean;
  latitude: number;
  longitude: number;
  address: string | null;
  expiresAt: string | Date | null;
  distanceKm: number | null;
  createdAt: string | Date;
  activatedAt: string | Date;
  owner: { id: string; name: string | null; image: string | null };
};
