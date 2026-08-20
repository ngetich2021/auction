import { z } from "zod";
import { RESOURCES, PERMISSION_ACTIONS } from "@/lib/permissions";

const RESOURCE_IDS = RESOURCES.map((r) => r.id) as [string, ...string[]];

export const createRoleSchema = z.object({
  name: z.string().trim().min(2, { error: "Name must be at least 2 characters" }).max(40),
  description: z.string().trim().max(200).optional().or(z.literal("")),
});

export const togglePermissionSchema = z.object({
  roleId: z.string().min(1),
  resource: z.enum(RESOURCE_IDS, { error: "Unknown resource" }),
  action: z.enum(PERMISSION_ACTIONS, { error: "Unknown action" }),
  enabled: z.enum(["true", "false"]),
});

export const assignUserRoleSchema = z.object({
  userId: z.string().min(1),
  customRoleId: z.string().min(1).optional().or(z.literal("")),
});
