<template>
  <section class="space-y-3">
    <header class="toolbar">
      <div class="toolbar__row">
        <DateRangeFilter v-model="range" />
      </div>

      <PerPageSelect v-model="limit" />
      <ColumnsPicker v-model="hidden" :all-keys="allKeys" />
      <el-button type="primary" :loading="loading || chartLoading" @click="refetch">Refresh</el-button>
    </header>

    <el-alert v-if="error" type="error" :title="error" show-icon />

    <!-- график по отдельной выборке chartRows -->
    <ChartCard v-if="series.length" :series="series" :title="chartTitle" />

    <DataTable :data="rows" :exclude="hidden" />

    <div class="flex justify-end">
      <el-pagination
        :current-page="page"
        :page-size="limit"
        :total="total"
        layout="prev, pager, next"
        @current-change="onPage"
      />
    </div>
  </section>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import DateRangeFilter from '../components/DateRangeFilter.vue'
import PerPageSelect from '../components/PerPageSelect.vue'
import ColumnsPicker from '../components/ColumnsPickerLite.vue'
import DataTable from '../components/DataTable.vue'
import ChartCard from '../components/ChartCard.vue'
import { usePaginatedEndpoint } from '../composables/usePaginatedEndpoint'
import { buildDailySumSeries } from '../utils/agg'
import { http } from '../lib/http'

const CHART_FETCH_LIMITS = [500, 200] as const

// ── фильтры
const range = ref<[string, string]>([
  dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
  dayjs().format('YYYY-MM-DD'),
])
const [dateFrom, dateTo] = [computed(() => range.value?.[0]), computed(() => range.value?.[1])]
const search = ref('')
const page = ref(1)
const limit = ref(50)

// ── таблица (пагинация)
const { rows, meta, loading, error, fetchNow, setPage, setLimit } =
  usePaginatedEndpoint<Record<string, any>>('/sales', () => ({
    dateFrom: dateFrom.value,
    dateTo: dateTo.value,
    page: page.value,
    limit: limit.value,
    search: search.value || undefined,
  }))

const total = computed(
  () =>
    meta.value.total ??
    page.value * limit.value +
      (rows.value.length === limit.value ? limit.value : rows.value.length)
)

// ── отдельная выборка под график (НЕ зависит от пагинации)
const chartRows = ref<Record<string, any>[]>([])
const chartLoading = ref(false)
const chartError = ref<string | null>(null)

async function fetchChartRows() {
  chartLoading.value = true
  chartError.value = null
  chartRows.value = []

  for (const L of CHART_FETCH_LIMITS) {
    try {
      const { data } = await http.get('/sales', {
        params: {
          dateFrom: dateFrom.value,
          dateTo: dateTo.value,
          page: 1,
          limit: L,
          search: search.value || undefined,
        },
      })
      const arr =
        Array.isArray((data as any).data)
          ? (data as any).data
          : Array.isArray(data)
          ? (data as any)
          : (() => {
              const key = Object.keys(data || {}).find((k) => Array.isArray((data as any)[k]))
              return key ? (data as any)[key] : []
            })()
      chartRows.value = arr
      break
    } catch (e: any) {
      const limitErr = !!e?.response?.data && 'limit' in e.response.data
      if (!limitErr) {
        chartError.value = e?.response?.data?.message || e.message || 'Chart load error'
        break
      }
      // пробуем следующий меньший лимит
    }
  }

  chartLoading.value = false
}

// обновлять график при изменении периода/поиска
watch([dateFrom, dateTo, search], fetchChartRows, { immediate: true })

// ── агрегация для графика — именно по chartRows
const daily = computed(() =>
  buildDailySumSeries(chartRows.value, ['forPay', 'retailAmount', 'totalPrice', 'saleSum', 'amount', 'payment', 'sum', 'retailPrice'])
)
const series = computed(() => daily.value.data)
const chartTitle = computed(() =>
  daily.value.key ? `Продажи: сумма и количество по дням (${daily.value.key})` : 'Продажи: количество по дням'
)

// ── управление колонками
const hidden = ref<string[]>([])
const allKeys = computed(() => Object.keys(rows.value?.[0] || {}))

function onPage(p: number) { page.value = p; setPage(p) }
function refetch() { fetchNow(); fetchChartRows() }
watch(limit, (l) => { setLimit(l); page.value = 1 })
</script>
