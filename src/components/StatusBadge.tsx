import type { ProductStatus } from '../lib/types'
import { STATUS_COLORS, STATUS_LABELS } from '../lib/constants'

interface StatusBadgeProps {
  status: ProductStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
