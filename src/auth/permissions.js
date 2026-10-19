export const ROLE = Object.freeze({ USER: 'user', AUTHORITY: 'authority' });

const permissions = {
  user: ['risk:read', 'report:create', 'report:read-own', 'profile:read-own', 'profile:update-own'],
  authority: ['risk:read', 'report:create', 'report:read-assigned', 'report:update-assigned', 'profile:read-own', 'profile:update-own'],
};

export function hasPermission(role, permission) {
  return Boolean(role && permissions[role]?.includes(permission));
}

export function canAccessAuthorityDashboard(role) {
  return role === ROLE.AUTHORITY;
}
