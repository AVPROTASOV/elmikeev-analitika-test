import dayjs from 'dayjs'

/** Кандидаты на поле даты */
const DATE_CANDIDATES = [
  'date',
  'lastChangeDate',
  'createDate',
  'supplierOperDate',
  'incomeDate',
  'saleDate',
  'orderDate',
]

/** Денежные/суммовые кандидаты для orders/sales/incomes */
const SUM_CANDIDATES_DEFAULT = [
  'forPay',
  'totalPrice',
  'priceWithDiscount',
  'retailAmount',
  'retailPrice',
  'saleSum',
  'payment',
  'sum',
  'amount',
]

/** Стоковые метрики */
const STOCK_VALUE_CANDIDATES = [
  'quantity',
  'qty',
  'quantityFull',
  'inStock',
  'stock',
  'stocks',
  'balance',
  'amount',
  'total',
]

/** Категория для стоков */
const STOCK_CATEGORY_CANDIDATES = ['warehouseName', 'subject', 'brand', 'supplierArticle']

/* -------------------- helpers -------------------- */

function toNumberLoose(v: any): number | null {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function isValidDate(v: any): boolean {
  if (v == null) return false
  const d = dayjs(v)
  if (d.isValid()) return true
  // fallback: часто приходит "YYYY-MM-DDTHH:mm:ss" => берём первые 10
  if (typeof v === 'string' && v.length >= 10) {
    return dayjs(v.slice(0, 10)).isValid()
  }
  return false
}

function normalizeDateToYMD(v: any): string {
  if (v == null) return 'unknown'
  const d = dayjs(v)
  if (d.isValid()) return d.format('YYYY-MM-DD')
  if (typeof v === 'string' && v.length >= 10) {
    const d2 = dayjs(v.slice(0, 10))
    if (d2.isValid()) return d2.format('YYYY-MM-DD')
  }
  return 'unknown'
}

/** выбрать ключ даты, который встречается чаще всего и валиден */
export function detectDateKey(rowsOrRow: Record<string, any> | Record<string, any>[]): string | null {
  const rows = Array.isArray(rowsOrRow) ? rowsOrRow : [rowsOrRow]
  if (!rows.length) return null
  const freq = new Map<string, number>()

  const keys = new Set<string>()
  for (const r of rows) Object.keys(r || {}).forEach(k => keys.add(k))

  const allKeys = Array.from(keys)
  const candidates = [...DATE_CANDIDATES, ...allKeys.filter(k => /date/i.test(k))]

  for (const k of candidates) {
    let ok = 0
    for (const r of rows) if (isValidDate(r?.[k])) ok++
    if (ok) freq.set(k, ok)
  }

  let best: string | null = null
  let bestCnt = 0
  for (const [k, cnt] of freq) {
    if (cnt > bestCnt) { best = k; bestCnt = cnt }
  }
  return best
}

/** найти первый реально используемый числовой ключ из списка, проходя по всему набору */
export function pickFirstExisting(rowsOrRow: Record<string, any> | Record<string, any>[], candidates: string[]): string | null {
  const rows = Array.isArray(rowsOrRow) ? rowsOrRow : [rowsOrRow]
  for (const k of candidates) {
    for (const r of rows) {
      const n = toNumberLoose(r?.[k])
      if (n != null) return k
    }
  }
  return null
}

/* -------------------- series builders -------------------- */

/** Старая серия (оставлена для совместимости) */
export function buildSeries(rows: Record<string, any>[]) {
  if (!rows?.length) return []
  const dateKey = detectDateKey(rows) || detectDateKey(rows[0])
  const sumKey = pickFirstExisting(rows, SUM_CANDIDATES_DEFAULT)

  const m = new Map<string, { count: number; sum?: number }>()
  for (const r of rows) {
    const d = normalizeDateToYMD(dateKey ? r[dateKey] : undefined)
    const prev = m.get(d) || { count: 0, sum: 0 }
    prev.count += 1
    const n = sumKey ? toNumberLoose(r[sumKey]) : null
    if (sumKey && n != null) prev.sum = (prev.sum || 0) + n
    m.set(d, prev)
  }

  return Array.from(m.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({ date, ...v }))
}

/**
 * Новая серия: сумма по дням (устойчива к числам-строкам и плавающим ключам).
 * Возвращает { key, data }, где data: [{ date, sum, count }]
 */
export function buildDailySumSeries(
  rows: Record<string, any>[],
  candidates: string[] = SUM_CANDIDATES_DEFAULT
) {
  if (!rows?.length) return { key: null, data: [] }
  const dateKey = detectDateKey(rows) || detectDateKey(rows[0])
  const sumKey = pickFirstExisting(rows, candidates)

  const m = new Map<string, { sum: number; count: number }>()
  for (const r of rows) {
    const d = normalizeDateToYMD(dateKey ? r[dateKey] : undefined)
    const prev = m.get(d) || { sum: 0, count: 0 }
    prev.count += 1
    const n = sumKey ? toNumberLoose(r[sumKey]) : null
    if (sumKey && n != null) prev.sum += n
    m.set(d, prev)
  }

  const data = Array.from(m.entries())
    .filter(([d]) => d !== 'unknown') // не рисуем «unknown» как дату
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({ date, ...v }))

  return { key: sumKey, data }
}

/**
 * Для stocks: суммирование по категории.
 * Если нет числовой метрики — считаем количество позиций (value=1).
 */
export function buildCategorySum(
  rows: Record<string, any>[],
  categoryKeyCandidates: string[] = STOCK_CATEGORY_CANDIDATES,
  valueKeyCandidates: string[] = STOCK_VALUE_CANDIDATES
) {
  if (!rows?.length) return { catKey: null, valKey: null, data: [] }
  const first = rows[0] || {}
  const availableCat = categoryKeyCandidates.find(k => k in first) || categoryKeyCandidates.find(k => rows.some(r => k in (r || {}))) || categoryKeyCandidates[0]
  const valKey = pickFirstExisting(rows, valueKeyCandidates)

  const m = new Map<string, number>()
  for (const r of rows) {
    const cat = String(r?.[availableCat] ?? '—')
    const n = valKey ? toNumberLoose(r?.[valKey]) : null
    m.set(cat, (m.get(cat) || 0) + (n ?? 1))
  }

  const data = Array.from(m.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15)

  return { catKey: availableCat, valKey, data }
}
