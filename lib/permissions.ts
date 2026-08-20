export const RESOURCES = [
  { id: "users", label: "Users" },
  { id: "listings", label: "Listings" },
  { id: "adverts", label: "Adverts" },
  { id: "orders", label: "Orders" },
  { id: "payments", label: "Payments" },
] as const;

export type ResourceId = (typeof RESOURCES)[number]["id"];

export const PERMISSION_ACTIONS = ["CREATE", "READ", "UPDATE", "DELETE"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type SessionPermission = { resource: string; action: string };

export function hasPermission(
  permissions: SessionPermission[] | undefined,
  resource: ResourceId,
  action: PermissionAction
): boolean {
  return !!permissions?.some((p) => p.resource === resource && p.action === action);
}
