export type ClientMover = {
  id: string;
  vehicleType: string;
  description: string | null;
  phone: string;
  image: string;
  active: boolean;
  latitude: number;
  longitude: number;
  address: string | null;
  distanceKm: number | null;
  createdAt: string | Date;
  owner: { id: string; name: string | null; image: string | null };
};
