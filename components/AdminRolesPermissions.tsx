"use client";

import { useState } from "react";
import { useSingleFlightAction } from "@/hooks/useSingleFlightAction";
import { createRole, deleteRole, togglePermission } from "@/lib/actions/roles";
import { RESOURCES, PERMISSION_ACTIONS, type ResourceId, type PermissionAction } from "@/lib/permissions";
import { Modal } from "@/components/ui/Modal";
import { FormAlert } from "@/components/ui/FormAlert";
import { FieldError } from "@/components/ui/FieldError";
import { Checkbox } from "@/components/ui/checkbox";

export type AdminRole = {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
  permissions: { resource: string; action: string }[];
};

export function RolesModal({ roles, onClose }: { roles: AdminRole[]; onClose: () => void }) {
  const [createState, createAction, creating] = useSingleFlightAction(createRole);
  const [deleteState, deleteAction, deleting] = useSingleFlightAction(deleteRole);

  function handleDelete(roleId: string) {
    if (!confirm("Delete this role? Users assigned to it will lose its permissions.")) return;
    const formData = new FormData();
    formData.set("roleId", roleId);
    deleteAction(formData);
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col gap-4 p-4">
        <h3 className="text-base font-semibold">Custom roles</h3>
        <FormAlert ok={createState?.ok} message={createState?.message} />
        <FormAlert ok={deleteState?.ok} message={deleteState?.message} />

        <div className="flex flex-col gap-2">
          {roles.length === 0 && <p className="text-sm text-zinc-500">No custom roles yet.</p>}
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{role.name}</p>
                {role.description && <p className="text-xs text-zinc-500">{role.description}</p>}
                <p className="text-xs text-zinc-400">
                  {role.userCount} user{role.userCount === 1 ? "" : "s"} · {role.permissions.length} permission
                  {role.permissions.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(role.id)}
                disabled={deleting}
                className="shrink-0 rounded-full bg-red-50 dark:bg-red-950 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-300 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        <form action={createAction} className="flex flex-col gap-3 border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <h4 className="text-sm font-semibold">Add a role</h4>
          <label className="flex flex-col gap-1 text-sm">
            Name
            <input
              name="name"
              required
              placeholder="e.g. Accountant"
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
            />
            <FieldError messages={createState?.errors?.name} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Description (optional)
            <input
              name="description"
              placeholder="What this role is for"
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={creating}
            className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {creating ? "Adding…" : "Add role"}
          </button>
        </form>
      </div>
    </Modal>
  );
}

function PermissionCheckbox({
  roleId,
  resource,
  action,
  checked,
}: {
  roleId: string;
  resource: ResourceId;
  action: PermissionAction;
  checked: boolean;
}) {
  const [, toggleAction, pending] = useSingleFlightAction(togglePermission);

  function handleChange(value: boolean) {
    const formData = new FormData();
    formData.set("roleId", roleId);
    formData.set("resource", resource);
    formData.set("action", action);
    formData.set("enabled", value ? "true" : "false");
    toggleAction(formData);
  }

  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(value) => handleChange(!!value)}
      disabled={pending}
      aria-label={`${resource} ${action}`}
    />
  );
}

export function PermissionsModal({ roles, onClose }: { roles: AdminRole[]; onClose: () => void }) {
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? "");
  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col gap-4 p-4">
        <h3 className="text-base font-semibold">Permissions</h3>
        {roles.length === 0 ? (
          <p className="text-sm text-zinc-500">Create a role first, then assign its permissions here.</p>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-sm">
              Role
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>

            {selectedRole && (
              <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="max-md:sticky max-md:left-0 max-md:z-20 max-md:bg-white dark:max-md:bg-zinc-900 px-3 py-2 text-left font-medium">
                        Route
                      </th>
                      {PERMISSION_ACTIONS.map((action) => (
                        <th key={action} className="px-3 py-2 text-center font-medium">
                          {action}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {RESOURCES.map((resource) => (
                      <tr key={resource.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                        <td className="max-md:sticky max-md:left-0 max-md:z-20 max-md:bg-white dark:max-md:bg-zinc-900 px-3 py-2">{resource.label}</td>
                        {PERMISSION_ACTIONS.map((action) => {
                          const checked = selectedRole.permissions.some(
                            (p) => p.resource === resource.id && p.action === action
                          );
                          return (
                            <td key={action} className="px-3 py-2 text-center">
                              <PermissionCheckbox
                                roleId={selectedRole.id}
                                resource={resource.id}
                                action={action}
                                checked={checked}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-zinc-500">
              A role with any permission checked gets admin access, scoped to only the routes and CRUD actions
              checked above.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
