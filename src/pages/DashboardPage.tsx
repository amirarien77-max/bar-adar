import { useEffect, useState, type ReactNode } from 'react'
import {
  Lock,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { StatusBadge } from '../components/StatusBadge'
import { isLockedForUser, isLowStockStatus } from '../lib/constants'
import { collectCategories, groupProductsByCategory } from '../lib/categories'
import { notifyLowStock } from '../lib/notifications'
import type { DashboardFilter, Product, ProductStatus } from '../lib/types'

export function DashboardPage() {
  const { user, isAdmin } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<DashboardFilter>('all')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [orderProduct, setOrderProduct] = useState<Product | null>(null)

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*, reporter:profiles!reported_by(full_name, email)')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (!error && data) {
      setProducts(data as Product[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()

    const channel = supabase
      .channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase()) ||
      (p.supplier?.toLowerCase().includes(search.toLowerCase()) ?? false)

    if (!matchesSearch) return false
    if (filter === 'missing') return p.status === 'מעט' || p.status === 'אין בכלל'
    if (filter === 'pending') return p.status === 'הוזמן'
    return true
  })

  const filterButtons: { key: DashboardFilter; label: string }[] = [
    { key: 'all', label: 'הכל' },
    { key: 'missing', label: 'חסר במלאי' },
    { key: 'pending', label: 'הזמנות ממתינות' },
  ]

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק את המוצר?')) return
    await supabase.from('products').delete().eq('id', id)
    fetchProducts()
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const grouped = groupProductsByCategory(filtered)
  const existingCategories = collectCategories(products)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-bar-cream">רשימת המלאי</h2>
          <p className="text-sm text-bar-cream/50">{filtered.length} מוצרים</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-bar-gold px-4 py-2 text-sm font-semibold text-bar-dark transition-colors hover:bg-bar-gold-light"
          >
            <Plus className="h-4 w-4" />
            הוספת מוצר
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bar-cream/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי קטגוריה, שם או ספק..."
            className="w-full rounded-lg border border-bar-border bg-bar-surface py-2.5 pr-10 pl-4 text-sm text-bar-cream placeholder:text-bar-cream/30 focus:border-bar-gold focus:outline-none"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-bar-border bg-bar-surface p-1">
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-bar-gold/15 text-bar-gold'
                  : 'text-bar-cream/60 hover:text-bar-cream'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Package className="h-8 w-8 animate-pulse text-bar-gold" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-bar-border bg-bar-surface py-16 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-bar-cream/30" />
          <p className="text-bar-cream/50">לא נמצאו מוצרים</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-bar-border">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-bar-border bg-bar-surface text-bar-cream/60">
                <th className="px-4 py-3 text-right font-medium w-36">קטגוריה</th>
                <th className="px-4 py-3 text-right font-medium">מוצר</th>
                <th className="px-4 py-3 text-right font-medium">ספק</th>
                <th className="px-4 py-3 text-right font-medium">כמות</th>
                <th className="px-4 py-3 text-right font-medium">סטטוס</th>
                <th className="px-4 py-3 text-right font-medium">תאריך הגעה</th>
                <th className="px-4 py-3 text-right font-medium">דווח ע״י</th>
                <th className="px-4 py-3 text-right font-medium">עדכון אחרון</th>
                <th className="px-4 py-3 text-right font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(([category, categoryProducts]) =>
                categoryProducts.map((product, index) => {
                  const locked = !isAdmin && isLockedForUser(product.status)
                  return (
                    <tr
                      key={product.id}
                      className={`border-b border-bar-border/50 transition-colors ${
                        locked ? 'bg-bar-elevated/30 opacity-70' : 'hover:bg-bar-surface/50'
                      }`}
                    >
                      {index === 0 && (
                        <td
                          rowSpan={categoryProducts.length}
                          className="border-l border-bar-border/30 bg-bar-surface/40 px-4 py-3 align-top font-semibold text-bar-gold"
                        >
                          <div className="sticky top-20">{category}</div>
                        </td>
                      )}
                      <td className="px-4 py-3 font-medium text-bar-cream">
                        <div className="flex items-center gap-2">
                          {locked && <Lock className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
                          {product.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-bar-cream/70">{product.supplier ?? '—'}</td>
                      <td className="px-4 py-3 text-bar-cream">{product.quantity}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={product.status} />
                      </td>
                      <td className="px-4 py-3 text-bar-cream/70">
                        {product.arrival_status ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-bar-cream/70">
                        {product.reporter?.full_name ?? product.reporter?.email ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-bar-cream/50 text-xs">
                        {formatDate(product.last_status_update)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {!locked && (
                            <button
                              onClick={() => setEditingProduct(product)}
                              className="rounded p-1.5 text-bar-cream/60 hover:bg-bar-elevated hover:text-bar-gold"
                              title="עדכון"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {isAdmin &&
                            (product.status === 'מעט' || product.status === 'אין בכלל') && (
                              <button
                                onClick={() => setOrderProduct(product)}
                                className="rounded p-1.5 text-blue-400 hover:bg-blue-500/10"
                                title="סמן כהוזמן"
                              >
                                <ShoppingCart className="h-4 w-4" />
                              </button>
                            )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="rounded p-1.5 text-red-400/60 hover:bg-red-500/10 hover:text-red-400"
                              title="מחיקה"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                }),
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          categories={existingCategories}
          isAdmin={isAdmin}
          userId={user?.id}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setEditingProduct(null)
            fetchProducts()
          }}
        />
      )}

      {showAddModal && (
        <AddProductModal
          categories={existingCategories}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false)
            fetchProducts()
          }}
        />
      )}

      {orderProduct && (
        <OrderModal
          product={orderProduct}
          onClose={() => setOrderProduct(null)}
          onSaved={() => {
            setOrderProduct(null)
            fetchProducts()
          }}
        />
      )}
    </div>
  )
}

interface EditProductModalProps {
  product: Product
  categories: string[]
  isAdmin: boolean
  userId?: string
  onClose: () => void
  onSaved: () => void
}

function EditProductModal({ product, categories, isAdmin, userId, onClose, onSaved }: EditProductModalProps) {
  const { profile } = useAuth()
  const [status, setStatus] = useState<ProductStatus>(product.status)
  const [category, setCategory] = useState(product.category ?? 'כללי')
  const [quantity, setQuantity] = useState(product.quantity)
  const [arrivalStatus, setArrivalStatus] = useState(product.arrival_status ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userStatuses: ProductStatus[] = ['מעט', 'אין בכלל']
  const adminStatuses: ProductStatus[] = ['יש', 'מעט', 'אין בכלל', 'הוזמן']
  const availableStatuses = isAdmin ? adminStatuses : userStatuses

  const needsQuantity = status === 'מעט' || status === 'אין בכלל'

  const handleSave = async () => {
    if (needsQuantity && quantity <= 0) {
      setError('יש להזין כמות נדרשת')
      return
    }

    setSaving(true)
    setError(null)

    const updates: Record<string, unknown> = {
      status,
      quantity: needsQuantity || isAdmin ? quantity : product.quantity,
    }

    if (isAdmin) {
      updates.arrival_status = arrivalStatus || null
      updates.category = category.trim() || 'כללי'
    }

    if (needsQuantity) {
      updates.reported_by = userId
    }

    const { error: updateError } = await supabase
      .from('products')
      .update(updates)
      .eq('id', product.id)

    if (updateError) {
      setError('שגיאה בעדכון. ייתכן שהפריט נעול.')
      setSaving(false)
      return
    }

    const becameLowStock = isLowStockStatus(status) && !isLowStockStatus(product.status)
    if (becameLowStock) {
      await notifyLowStock({
        product_id: product.id,
        product_name: product.name,
        status: status as 'מעט' | 'אין בכלל',
        quantity,
        supplier: product.supplier,
        reported_by_name: profile?.full_name ?? profile?.email ?? null,
      })
    }

    onSaved()
  }

  return (
    <Modal title={`עדכון: ${product.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-bar-cream/70">סטטוס</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProductStatus)}
            className="w-full rounded-lg border border-bar-border bg-bar-elevated px-3 py-2 text-bar-cream focus:border-bar-gold focus:outline-none"
          >
            {availableStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {(needsQuantity || isAdmin) && (
          <div>
            <label className="mb-1.5 block text-sm text-bar-cream/70">
              {needsQuantity ? 'כמות נדרשת' : 'כמות'}
            </label>
            <input
              type="number"
              min={needsQuantity ? 1 : 0}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full rounded-lg border border-bar-border bg-bar-elevated px-3 py-2 text-bar-cream focus:border-bar-gold focus:outline-none"
            />
          </div>
        )}

        {isAdmin && (
          <div>
            <label className="mb-1.5 block text-sm text-bar-cream/70">קטגוריה</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="edit-product-categories"
              className="w-full rounded-lg border border-bar-border bg-bar-elevated px-3 py-2 text-bar-cream focus:border-bar-gold focus:outline-none"
            />
            <datalist id="edit-product-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        )}

        {isAdmin && (
          <div>
            <label className="mb-1.5 block text-sm text-bar-cream/70">תאריך/סטטוס הגעה</label>
            <input
              type="text"
              value={arrivalStatus}
              onChange={(e) => setArrivalStatus(e.target.value)}
              placeholder="לדוגמה: 25/06/2026 או 'בדרך'"
              className="w-full rounded-lg border border-bar-border bg-bar-elevated px-3 py-2 text-bar-cream focus:border-bar-gold focus:outline-none"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-bar-gold py-2 font-semibold text-bar-dark hover:bg-bar-gold-light disabled:opacity-60"
          >
            שמירה
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-bar-border px-4 py-2 text-bar-cream/70 hover:bg-bar-elevated"
          >
            ביטול
          </button>
        </div>
      </div>
    </Modal>
  )
}

function AddProductModal({
  categories,
  onClose,
  onSaved,
}: {
  categories: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [supplier, setSupplier] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim() || !category.trim()) return
    setSaving(true)
    await supabase.from('products').insert({
      name: name.trim(),
      category: category.trim(),
      supplier: supplier.trim() || null,
    })
    onSaved()
  }

  return (
    <Modal title="הוספת מוצר חדש" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-bar-cream/70">קטגוריה</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="product-categories"
            placeholder="לדוגמה: משקאות, ציוד חד פעמי"
            className="w-full rounded-lg border border-bar-border bg-bar-elevated px-3 py-2 text-bar-cream focus:border-bar-gold focus:outline-none"
          />
          <datalist id="product-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-bar-cream/70">שם מוצר</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-bar-border bg-bar-elevated px-3 py-2 text-bar-cream focus:border-bar-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-bar-cream/70">ספק</label>
          <input
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className="w-full rounded-lg border border-bar-border bg-bar-elevated px-3 py-2 text-bar-cream focus:border-bar-gold focus:outline-none"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !category.trim()}
            className="flex-1 rounded-lg bg-bar-gold py-2 font-semibold text-bar-dark hover:bg-bar-gold-light disabled:opacity-60"
          >
            הוספה
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-bar-border px-4 py-2 text-bar-cream/70 hover:bg-bar-elevated"
          >
            ביטול
          </button>
        </div>
      </div>
    </Modal>
  )
}

function OrderModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product
  onClose: () => void
  onSaved: () => void
}) {
  const [arrivalStatus, setArrivalStatus] = useState('')
  const [saving, setSaving] = useState(false)

  const handleOrder = async () => {
    setSaving(true)
    await supabase
      .from('products')
      .update({
        status: 'הוזמן' as ProductStatus,
        arrival_status: arrivalStatus || null,
      })
      .eq('id', product.id)
    onSaved()
  }

  return (
    <Modal title={`הזמנה: ${product.name}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-bar-cream/60">
          כמות מבוקשת: <span className="font-semibold text-bar-cream">{product.quantity}</span>
        </p>
        <div>
          <label className="mb-1.5 block text-sm text-bar-cream/70">תאריך הגעה משוער / הערות</label>
          <input
            value={arrivalStatus}
            onChange={(e) => setArrivalStatus(e.target.value)}
            placeholder="לדוגמה: יום ראשון 22/06"
            className="w-full rounded-lg border border-bar-border bg-bar-elevated px-3 py-2 text-bar-cream focus:border-bar-gold focus:outline-none"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleOrder}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            <ShoppingCart className="h-4 w-4" />
            סמן כהוזמן
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-bar-border px-4 py-2 text-bar-cream/70 hover:bg-bar-elevated"
          >
            ביטול
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-bar-border bg-bar-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-bar-cream">{title}</h3>
          <button onClick={onClose} className="text-bar-cream/50 hover:text-bar-cream">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
