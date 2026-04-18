import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const usePermissionsStore = create(
  persist((set, get) => ({
  permissions: [],
  rolesPermissionsMap: {},

  setPermissions: (permissions = []) => set({ permissions }),

  setRolesPermissionsMap: (rolesPermissions = []) => {
    const map = Array.isArray(rolesPermissions)
      ? rolesPermissions.reduce((acc, role) => {
          if (role?.name) {
            acc[role.name] = role.permissions || [];
          }
          return acc;
        }, {})
      : rolesPermissions || {};
    set({ rolesPermissionsMap: map });
    return map;
  },

  derivePermissionsFromRoles: (roles = [], mapOverride) => {
    const rolesPermissionsMap = mapOverride || get().rolesPermissionsMap;
    const permissionSet = new Set();

    roles.forEach((role) => {
      const roleName = role?.name;
      if (!roleName) return;
      const rolePermissions = rolesPermissionsMap[roleName] || [];
      rolePermissions.forEach((permission) => permissionSet.add(permission));
    });

    const permissions = Array.from(permissionSet);
    set({ permissions });
    return permissions;
  },

  hasPermission: (permission) => {
    const { permissions } = get();
    return permissions.includes(permission);
  },

  hasAnyPermission: (permissionList) => {
    const { permissions } = get();
    return permissionList.some((perm) => permissions.includes(perm));
  },

  hasAllPermissions: (permissionList) => {
    const { permissions } = get();
    return permissionList.every((perm) => permissions.includes(perm));
  },
  clearPermissions: () => set({ permissions: [], rolesPermissionsMap: {} }),
  }), {
    name: 'recovera-permissions',
    partialize: (state) => ({
      permissions: state.permissions,
      rolesPermissionsMap: state.rolesPermissionsMap,
    }),
  })
);
