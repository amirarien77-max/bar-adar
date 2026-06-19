import type { Product } from './types'

const UNCATEGORIZED = 'כללי'

export function groupProductsByCategory(products: Product[]): [string, Product[]][] {
  const groups = new Map<string, Product[]>()

  for (const product of products) {
    const category = product.category?.trim() || UNCATEGORIZED
    const list = groups.get(category) ?? []
    list.push(product)
    groups.set(category, list)
  }

  return [...groups.entries()].sort(([a], [b]) => {
    if (a === UNCATEGORIZED) return 1
    if (b === UNCATEGORIZED) return -1
    return a.localeCompare(b, 'he')
  })
}

export function collectCategories(products: Product[]): string[] {
  const set = new Set(products.map((p) => p.category?.trim() || UNCATEGORIZED))
  return [...set].sort((a, b) => a.localeCompare(b, 'he'))
}
