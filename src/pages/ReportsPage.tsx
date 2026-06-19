import { useEffect, useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { exportToCsv, exportToExcel } from '../lib/export'
import { StatusBadge } from '../components/StatusBadge'
import type { DateFilter, StatusHistory } from '../lib/types'

export function ReportsPage() {
  const [history, setHistory] = useState<StatusHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilter>('week')

  useEffect(() => {
    fetchHistory()
  }, [dateFilter])

  const fetchHistory = async () => {
    setLoading(true)
    let query = supabase
      .from('status_history')
      .select('*')
      .order('created_at', { ascending: false })

    const now = new Date()
    if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      query = query.gte('created_at', weekAgo.toISOString())
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      query = query.gte('created_at', monthAgo.toISOString())
    }

    const { data, error } = await query
    if (!error && data) {
      setHistory(data as StatusHistory[])
    }
    setLoading(false)
  }

  const dateFilters: { key: DateFilter; label: string }[] = [
    { key: 'week', label: 'השבוע' },
    { key: 'month', label: 'חודש אחרון' },
    { key: 'all', label: 'הכל' },
  ]

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const exportFilename = `bar-adar-report-${dateFilter}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-bar-cream">דוחות ואנליטיקה</h2>
          <p className="text-sm text-bar-cream/50">היסטוריית שינויי סטטוס במלאי</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportToExcel(history, exportFilename)}
            disabled={history.length === 0}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
          >
            <FileSpreadsheet className="h-4 w-4" />
            ייצוא ל-Excel
          </button>
          <button
            onClick={() => exportToCsv(history, exportFilename)}
            disabled={history.length === 0}
            className="flex items-center gap-2 rounded-lg border border-bar-border bg-bar-surface px-4 py-2 text-sm font-medium text-bar-cream transition-colors hover:bg-bar-elevated disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            ייצוא ל-CSV
          </button>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg border border-bar-border bg-bar-surface p-1 w-fit">
        {dateFilters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setDateFilter(key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              dateFilter === key
                ? 'bg-bar-gold/15 text-bar-gold'
                : 'text-bar-cream/60 hover:text-bar-cream'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-bar-cream/50">טוען...</div>
      ) : history.length === 0 ? (
        <div className="rounded-xl border border-bar-border bg-bar-surface py-16 text-center text-bar-cream/50">
          אין נתונים לתקופה שנבחרה
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-bar-border">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-bar-border bg-bar-surface text-bar-cream/60">
                <th className="px-4 py-3 text-right font-medium">שם מוצר</th>
                <th className="px-4 py-3 text-right font-medium">כמות</th>
                <th className="px-4 py-3 text-right font-medium">סטטוס</th>
                <th className="px-4 py-3 text-right font-medium">דווח ע״י</th>
                <th className="px-4 py-3 text-right font-medium">תאריך</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-bar-border/50 hover:bg-bar-surface/50"
                >
                  <td className="px-4 py-3 font-medium text-bar-cream">{row.product_name}</td>
                  <td className="px-4 py-3 text-bar-cream">{row.quantity ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-bar-cream/70">
                    {row.changed_by_name ?? 'לא ידוע'}
                  </td>
                  <td className="px-4 py-3 text-bar-cream/50 text-xs">
                    {formatDate(row.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
