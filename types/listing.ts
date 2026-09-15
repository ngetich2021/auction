export type ListingCategory =
  | "ELECTRONICS"
  | "VEHICLES"
  | "FURNITURE_HOME"
  | "FASHION"
  | "APPLIANCES"
  | "MACHINERY_EQUIPMENT"
  | "SPORTS_LEISURE"
  | "OFFICE_BUSINESS"
  | "OTHER";
export type ListingStatus = "AVAILABLE" | "PENDING" | "SOLD" | "REMOVED";

export type ClientListing = {
  id: string;
  title: string;
  description: string;
  category: ListingCategory;
  price: number;
  quantity: number;
  images: string[];
  status: ListingStatus;
  badge: boolean;
  latitude: number;
  longitude: number;
  address: string | null;
  phone: string | null;
  sellerId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  isBoosted: boolean;
  distanceKm: number | null;
  seller: { id: string; name: string | null; image: string | null };
  paymentStatus?: "PAID" | "AWAITING_PAYMENT" | "FAILED";
};
