export type ClientEatery = {
  id: string;
  name: string;
  foodType: string | null;
  description: string | null;
  phone: string;
  image: string;
  active: boolean;
  badge: boolean;
  latitude: number;
  longitude: number;
  address: string | null;
  distanceKm: number | null;
  createdAt: string | Date;
  activatedAt: string | Date;
  owner: { id: string; name: string | null; image: string | null };
};
