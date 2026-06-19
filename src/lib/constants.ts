import type { ProductStatus } from './types'

export const STATUS_OPTIONS: ProductStatus[] = ['יש', 'מעט', 'אין בכלל', 'הוזמן']

export const STATUS_LABELS: Record<ProductStatus, string> = {
  'יש': 'יש במלאי',
  'מעט': 'מעט',
  'אין בכלל': 'אין בכלל',
  'הוזמן': 'הוזמן',
}

export const STATUS_COLORS: Record<ProductStatus, string> = {
  'יש': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  'מעט': 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  'אין בכלל': 'bg-red-500/20 text-red-400 border-red-500/40',
  'הוזמן': 'bg-blue-500/20 text-blue-400 border-blue-500/40',
}

export const LOGO_URL =
  'https://static.wixstatic.com/media/e57dd3_5bb182b2ef424c3ab139b7ef2606bc28~mv2.png/v1/crop/x_147,y_80,w_706,h_784/fill/w_120,h_133,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/LOGO_barAdar-05.png'

export function isLockedForUser(status: ProductStatus): boolean {
  return status === 'מעט' || status === 'אין בכלל'
}

export function isLowStockStatus(status: ProductStatus): boolean {
  return status === 'מעט' || status === 'אין בכלל'
}
