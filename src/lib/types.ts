export type UserRole = 'admin' | 'procurement' | 'user'

export type ProductStatus = 'יש' | 'מעט' | 'אין בכלל' | 'הוזמן'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
}

export interface Product {
  id: string
  name: string
  category: string
  supplier: string | null
  quantity: number
  status: ProductStatus
  arrival_status: string | null
  reported_by: string | null
  created_at: string
  last_status_update: string
  reporter?: Profile | null
}

export interface StatusHistory {
  id: string
  product_id: string
  product_name: string
  quantity: number | null
  status: ProductStatus
  changed_by: string | null
  changed_by_name: string | null
  created_at: string
}

export type DashboardFilter = 'all' | 'missing' | 'pending'

export type DateFilter = 'week' | 'month' | 'all'
