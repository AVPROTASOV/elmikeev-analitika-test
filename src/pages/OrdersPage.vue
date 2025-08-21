<template>
  <section class="space-y-3">
    <header class="toolbar">
      <!-- 1-я строка: дата -->
      <div class="toolbar__row">
        <DateRangeFilter v-model="range" />
      </div>

      <PerPageSelect v-model="limit" />
      <ColumnsPicker v-model="hidden" :all-keys="allKeys" />
      <el-button type="primary" :loading="loading || chartLoading" @click="refetch">Refresh</el-button>
    </header>

    <el-alert v-if="error" type="error" :title="error" show-icon />
    <el-alert v-if="chartError" type="warning" :title="chartError" show-icon />

    <!-- Комбинированный график: сумма (бар) + количество (линия) -->
    <ChartCard v-if="chartSeries.length" :option="option" :title="chartTitle" />

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

// ── таблица (пагинация независима от графика)
const { rows, meta, loading, error, fetchNow, setPage, setLimit } =
  usePaginatedEndpoint<Record<string, any>>('/orders', () => ({
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

// ── отдельная выборка для графика
const chartRows = ref<Record<string, any>[]>([])
const chartLoading = ref(false)
const chartError = ref<string | null>(null)

async function fetchChartRows() {
  chartLoading.value = true
  chartError.value = null
  chartRows.value = []

  for (const L of CHART_FETCH_LIMITS) {
    try {
      const { data } = await http.get('/orders', {
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
      // иначе пробуем следующий меньший лимит
    }
  }

  chartLoading.value = false
}

// обновляем график при изменении периода/поиска
watch([dateFrom, dateTo, search], fetchChartRows, { immediate: true })

// ── агрегация графика — по chartRows (НЕ по rows)
const daily = computed(() =>
  buildDailySumSeries(chartRows.value, ['forPay', 'totalPrice', 'payment', 'sum', 'amount'])
)
const chartSeries = computed(() => daily.value.data)
const chartTitle = computed(() =>
  daily.value.key ? `Заказы: сумма и количество по дням (${daily.value.key})` : 'Заказы: количество по дням'
)

// ── опция для ECharts
const option = computed(() => {
  const data = chartSeries.value
  const x = data.map((d) => d.date)
  const sumArr = data.map((d) => (typeof d.sum === 'number' ? +d.sum.toFixed(2) : 0))
  const cntArr = data.map((d) => (typeof d.count === 'number' ? d.count : 0))

  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (val: any) => (typeof val === 'number' ? val.toLocaleString() : val),
      axisPointer: { type: 'shadow' },
    },
    legend: { data: ['Сумма', 'Количество'] },
    grid: { left: 50, right: 50, top: 50, bottom: 70 },
    xAxis: { type: 'category', data: x },
    yAxis: [
      {
        type: 'value',
        name: 'Сумма',
        axisLabel: { formatter: (v: number) => v.toLocaleString() },
        splitLine: { show: true },
      },
      {
        type: 'value',
        name: 'Кол-во',
        axisLabel: { formatter: (v: number) => v.toLocaleString() },
        splitLine: { show: false },
      },
    ],
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 32 }],
    series: [
      { name: 'Сумма', type: 'bar', data: sumArr, yAxisIndex: 0, barMaxWidth: 28, markLine: { data: [{ type: 'average', name: 'ср.' }] } },
      { name: 'Количество', type: 'line', data: cntArr, yAxisIndex: 1, smooth: true, symbolSize: 6 },
    ],
  }
})

// ── колонки hide
const hidden = ref<string[]>([])
const allKeys = computed(() => Object.keys(rows.value?.[0] || {}))

function onPage(p: number) { page.value = p; setPage(p) }
function refetch() { fetchNow(); fetchChartRows() }
watch(limit, (l) => { setLimit(l); page.value = 1 })
</script>
