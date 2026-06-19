import { supabase } from './supabase'
import type { ProductStatus } from './types'

export interface LowStockNotificationPayload {
  product_id: string
  product_name: string
  status: ProductStatus
  quantity: number
  supplier?: string | null
  reported_by_name?: string | null
}

export async function notifyLowStock(
  payload: LowStockNotificationPayload,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('notify-low-stock', {
    body: payload,
  })

  if (error) {
    console.error('Failed to send low stock notification:', error.message)
    return { ok: false, error: error.message }
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const message = String((data as { error: string }).error)
    console.error('Low stock notification error:', message)
    return { ok: false, error: message }
  }

  return { ok: true }
}
