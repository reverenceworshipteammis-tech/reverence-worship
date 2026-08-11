export const SUPER_ADMIN_ROLE_NAME = "super-admin";

export function hasSuperAdminRole(roleNames: string[]) {
  return roleNames.some((roleName) => roleName.toLowerCase() === SUPER_ADMIN_ROLE_NAME);
}

export function excludeSuperAdminUserWhere() {
  return {
    roles: {
      none: {
        role: { name: SUPER_ADMIN_ROLE_NAME },
      },
    },
  } as const;
}
