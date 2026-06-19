import * as XLSX from 'xlsx'
import type { StatusHistory } from './types'

interface ExportRow {
  'שם מוצר': string
  כמות: number | string
  'דווח על ידי': string
  'תאריך הוספה': string
  'תאריך עדכון אחרון': string
  סטטוס: string
}

export function exportToExcel(rows: StatusHistory[], filename = 'bar-adar-report') {
  const data: ExportRow[] = rows.map((row) => ({
    'שם מוצר': row.product_name,
    כמות: row.quantity ?? '',
    'דווח על ידי': row.changed_by_name ?? 'לא ידוע',
    'תאריך הוספה': formatDate(row.created_at),
    'תאריך עדכון אחרון': formatDate(row.created_at),
    סטטוס: row.status,
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'דוח מלאי')
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

export function exportToCsv(rows: StatusHistory[], filename = 'bar-adar-report') {
  const data: ExportRow[] = rows.map((row) => ({
    'שם מוצר': row.product_name,
    כמות: row.quantity ?? '',
    'דווח על ידי': row.changed_by_name ?? 'לא ידוע',
    'תאריך הוספה': formatDate(row.created_at),
    'תאריך עדכון אחרון': formatDate(row.created_at),
    סטטוס: row.status,
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const csv = XLSX.utils.sheet_to_csv(worksheet)
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
