// Staff are delegated access per area. "manage" includes "view". Admins can do everything.
export const AREAS = ['orders', 'abstracts', 'shop'] as const;
export type Area = (typeof AREAS)[number];
export type Level = 'view' | 'manage';

export const ALL_PERMISSIONS = AREAS.flatMap((a) => [`${a}:view`, `${a}:manage`]);

export const can = (
  user: { role: string; permissions: string[] } | undefined,
  area: Area,
  level: Level
): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions.includes(`${area}:manage`) || (level === 'view' && user.permissions.includes(`${area}:view`));
};

// Keeps stored permissions tidy: drops unknown values and the view entry implied by manage.
export const normalizePermissions = (perms: string[]): string[] => {
  const set = new Set(perms.filter((p) => ALL_PERMISSIONS.includes(p)));
  for (const a of AREAS) if (set.has(`${a}:manage`)) set.add(`${a}:view`);
  return ALL_PERMISSIONS.filter((p) => set.has(p));
};
