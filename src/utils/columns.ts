import type { ColumnDef } from '../types/columns'

/** Плоский объект: user.name -> 'user.name' */
export function flattenRow(row: Record<string, any>, prefix = ''): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(row || {})) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenRow(v, key))
    } else {
      out[key] = v
    }
  }
  return out
}

/** Покрытие колонки (доля непустых значений) */
export function coverage(rows: Record<string, any>[], key: string): number {
  if (!rows?.length) return 0
  let cnt = 0
  for (const r of rows) {
    const v = r?.[key]
    if (v !== null && v !== undefined && v !== '') cnt++
  }
  return cnt / rows.length
}

/**
 * Оставляем только те колонки, которые реально присутствуют и имеют покрытие >= threshold.
 * Если preset пуст — вернём автонабор из самых «плотных» ключей (топ-12).
 */
export function filterColumnsByCoverage(
  rows: Record<string, any>[],
  preset: ColumnDef[] | null,
  threshold = 0.2,
  autoTop = 12
): ColumnDef[] {
  if (!rows?.length) return preset || []

  // нормализуем первые 300 строк для стабильной оценки
  const sample = rows.slice(0, 300)

  if (preset && preset.length) {
    const keys = new Set<string>(Object.keys(sample[0] || {}))
    const filtered = preset.filter((c) => keys.has(c.key) && coverage(sample, c.key) >= threshold)
    // если «вымыли» всё — дайте хотя бы 6 самых плотных из пресета
    if (!filtered.length) {
      const scored = preset
        .map((c) => ({ col: c, cov: coverage(sample, c.key) }))
        .sort((a, b) => b.cov - a.cov)
        .slice(0, Math.min(6, preset.length))
        .map((x) => x.col)
      return scored
    }
    return filtered
  }

  // авто-режим (если пресета нет)
  const keySet = new Set<string>()
  for (const r of sample) Object.keys(r || {}).forEach((k) => keySet.add(k))
  const keys = Array.from(keySet)
  const scored = keys
    .map((k) => ({ key: k, cov: coverage(sample, k) }))
    .filter((x) => x.cov >= threshold)
    .sort((a, b) => b.cov - a.cov)
    .slice(0, autoTop)

  return scored.map((x) => ({ key: x.key, label: prettify(x.key) }))
}

export function prettify(key: string): string {
  // 'priceWithDiscount' -> 'Price With Discount'; 'user.name' -> 'User.name'
  const base = key.split('.').map((p) =>
    p.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ')
  ).join('.')
  return base.charAt(0).toUpperCase() + base.slice(1)
}

/** Утилита: просто фильтруем пресет по наличию ключа (без покрытия) */
export function filterExistingColumns(rows: Record<string, any>[], defs: ColumnDef[]): ColumnDef[] {
  if (!rows?.length) return defs
  const keys = new Set(Object.keys(rows[0] || {}))
  return defs.filter((d) => keys.has(d.key))
}
