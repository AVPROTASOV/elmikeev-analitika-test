import { ref, computed, watch, toValue } from 'vue'
import { http } from '../lib/http'
import dayjs from 'dayjs'
import type { PaginatedResponse } from '../types/paginated'

type AnyDict = Record<string, any>

function clean(obj: AnyDict) {
  const out: AnyDict = {}
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    out[k] = v
  })
  return out
}

export function usePaginatedEndpoint<T extends AnyDict>(
  endpoint: string,
  filters: { // reactive
    dateFrom?: string
    dateTo?: string
    page?: number
    limit?: number
    search?: string
    extra?: AnyDict
  } | (() => AnyDict)
) {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const rows = ref<T[]>([])
  const meta = ref<{ current_page: number; per_page: number; total?: number; last_page?: number }>({
    current_page: 1,
    per_page: 50,
  })

  const paramsRef = computed(() => {
    const f = typeof filters === 'function' ? filters() : filters
    return {
      page: f.page ?? meta.value.current_page,
      limit: f.limit ?? meta.value.per_page,
      dateFrom: f.dateFrom,
      dateTo: f.dateTo,
      ...(f.search ? { search: f.search } : {}),
      ...(f.extra || {}),
    }
  })

  async function fetchNow() {
    loading.value = true
    error.value = null
    try {
      const { data } = await http.get<PaginatedResponse<T>>(endpoint, { params: clean(paramsRef.value) })
      if (Array.isArray((data as any).data)) {
        rows.value = data.data
        meta.value = {
          current_page: data?.meta?.current_page ?? paramsRef.value.page ?? 1,
          per_page: data?.meta?.per_page ?? paramsRef.value.limit ?? 50,
          total: data?.meta?.total,
          last_page: data?.meta?.last_page,
        }
      } else if (Array.isArray(data as any)) {
        // на всякий — если прилетит просто массив
        rows.value = data as any
      } else {
        // иногда кладут под другим ключом
        const firstArrayKey = Object.keys(data).find((k) => Array.isArray((data as any)[k]))
        rows.value = firstArrayKey ? (data as any)[firstArrayKey] : []
      }
    } catch (e: any) {
      error.value = e?.response?.data?.message || e.message || 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  watch(paramsRef, fetchNow, { immediate: true, deep: true })

  function setPage(p: number) {
    meta.value.current_page = p
  }
  function setLimit(l: number) {
    meta.value.per_page = l
    meta.value.current_page = 1
  }

  return { rows, meta, loading, error, fetchNow, setPage, setLimit }
}
