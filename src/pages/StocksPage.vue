<template>
  <section class="space-y-3">
    <header class="toolbar">
      <PerPageSelect v-model="limit" />

      <el-select v-model="groupBy" placeholder="Группировка" style="width: 220px">
        <el-option v-for="g in groupOptions" :key="g" :label="g" :value="g" />
      </el-select>

      <ColumnsPicker v-model="hidden" :all-keys="allKeys" />
      <el-button type="primary" :loading="loading || chartLoading" @click="refetch">Refresh</el-button>
    </header>

    <el-alert v-if="error" type="error" :title="error" show-icon />
    <el-alert v-if="chartError" type="warning" :title="chartError" show-icon />

    <ChartCard v-if="barOption.series[0].data.length" :option="barOption" :title="chartTitle" />

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
import PerPageSelect from '../components/PerPageSelect.vue'
import ColumnsPicker from '../components/ColumnsPickerLite.vue'
import DataTable from '../components/DataTable.vue'
import ChartCard from '../components/ChartCard.vue'
import { usePaginatedEndpoint } from '../composables/usePaginatedEndpoint'
import { http } from '../lib/http'

const CHART_FETCH_LIMITS = [500, 200] as const
const todayYmd = dayjs().format('YYYY-MM-DD')

const search = ref('')
const page = ref(1)
const limit = ref(50)

const groupOptions = ['warehouseName', 'brand', 'subject', 'supplierArticle'] as const
const groupBy = ref<string>(groupOptions[0])

const { rows, meta, loading, error, fetchNow, setPage, setLimit } =
  usePaginatedEndpoint<Record<string, any>>('/stocks', () => ({
    dateFrom: todayYmd,
    page: page.value,
    limit: limit.value,
    search: search.value || undefined,
  }))

const total = computed(() =>
  meta.value.total ?? page.value * limit.value + (rows.value.length === limit.value ? limit.value : rows.value.length)
)

const chartRows = ref<Record<string, any>[]>([])
const chartLoading = ref(false)
const chartError = ref<string | null>(null)

async function fetchChartRows() {
  chartLoading.value = true
  chartError.value = null
  chartRows.value = []

  for (const L of CHART_FETCH_LIMITS) {
    try {
      const { data } = await http.get('/stocks', {
        params: { dateFrom: todayYmd, page: 1, limit: L, search: search.value || undefined },
      })
      chartRows.value =
        Array.isArray((data as any).data)
          ? (data as any).data
          : Array.isArray(data)
          ? (data as any)
          : (() => {
              const key = Object.keys(data || {}).find((k) => Array.isArray((data as any)[k]))
              return key ? (data as any)[key] : []
            })()
      break
    } catch (e: any) {
      const limitErr = !!e?.response?.data && 'limit' in e.response.data
      if (!limitErr) {
        chartError.value = e?.response?.data?.message || e.message || 'Chart load error'
        break
      }
    }
  }

  chartLoading.value = false
}
watch(search, fetchChartRows, { immediate: true })

function toNum(v: any): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

const agg = computed(() => {
  const m = new Map<string, number>()
  const src = chartRows.value || []
  for (const r of src) {
    const name = String(r?.[groupBy.value] ?? '—')
    const q = toNum(r?.quantity)
    m.set(name, (m.get(name) || 0) + q)
  }
  return Array.from(m.entries())
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 15)
})

const chartTitle = computed(() => `Топ по "${groupBy.value}" — quantity`)

const barOption = computed(() => {
  const names = agg.value.map(d => d.name).reverse()
  const vals  = agg.value.map(d => d.quantity).reverse()
  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v: any) => (typeof v === 'number' ? v.toLocaleString() : v),
      axisPointer: { type: 'shadow' }
    },
    grid: { left: 140, right: 30, top: 50, bottom: 50 },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 20 }],
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: names },
    series: [
      { type: 'bar', data: vals, barMaxWidth: 28, label: { show: true, position: 'right' } }
    ]
  }
})

const hidden = ref<string[]>([])
const allKeys = computed(() => Object.keys(rows.value?.[0] || {}))

function onPage(p: number) { page.value = p; setPage(p) }
function refetch() { fetchNow(); fetchChartRows() }
watch(limit, (l) => { setLimit(l); page.value = 1 })
</script>
