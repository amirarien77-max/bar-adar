import type { UserRole } from './types'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'מנהל',
  procurement: 'איש רכש',
  user: 'משתמש',
}

export function canManageInventory(role: UserRole | undefined | null): boolean {
  return role === 'admin' || role === 'procurement'
}

export function isAdminRole(role: UserRole | undefined | null): boolean {
  return role === 'admin'
}
