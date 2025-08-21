<template>
  <div class="table-wrapper">
    <el-table
      :data="displayedRows"
      border
      size="small"
      height="auto"
      :default-sort="defaultSortForEl"
      @sort-change="onElSort"
    >
      <el-table-column
        v-for="col in columns"
        :key="col"
        :prop="col"
        :label="col"
        sortable="custom"
        min-width="140"
      >
        <!-- Заголовок + мини-фильтр -->
        <template #header>
          <div class="th">
            <span class="th__label">{{ col }}</span>
            <el-input
              v-model="filters[col]"
              size="small"
              clearable
              placeholder="фильтр"
              class="th__filter"
              @clear="onFilterCleared(col)"
            />
          </div>
        </template>
        <!-- Ячейка (слегка форматаем числа) -->
        <template #default="{ row }">
          <span>{{ formatCell(row[col]) }}</span>
        </template>
      </el-table-column>
    </el-table>

    <!-- Статус при пустом наборе -->
    <div v-if="!displayedRows.length" class="empty-hint">
      Нет данных по текущим фильтрам.
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue'

type Row = Record<string, any>

const props = defineProps<{
  data: Row[]
  exclude?: string[]        // ключи, которые нужно скрыть
}>()

/* ===== Колонки ===== */
const columns = computed(() => {
  const first = props.data?.[0] || {}
  const keys = Object.keys(first)
  const exclude = new Set(props.exclude || [])
  return keys.filter(k => !exclude.has(k))
})

/* ===== Фильтры по колонкам (подстрока) ===== */
const filters = reactive<Record<string, string>>({})
watch(columns, (cols) => {
  // подчищаем лишние ключи в filters при смене колонок
  Object.keys(filters).forEach((k) => { if (!cols.includes(k)) delete filters[k] })
  // добавляем недостающие
  cols.forEach((k) => { if (!(k in filters)) filters[k] = '' })
}, { immediate: true })

function onFilterCleared(col: string) { filters[col] = '' }

/* ===== Сортировка ===== */
type Order = 'asc' | 'desc' | null
const sortKey = ref<string | null>(null)
const sortOrder = ref<Order>(null)

/** Клик по заголовку от Element Plus */
function onElSort(payload: { prop: string; order: 'ascending' | 'descending' | null }) {
  sortKey.value = payload.prop || null
  sortOrder.value = payload.order === 'ascending' ? 'asc'
                   : payload.order === 'descending' ? 'desc'
                   : null
}

// нужно, чтобы подсветка стрелочки в el-table совпадала с состоянием
const defaultSortForEl = computed(() => {
  if (!sortKey.value || !sortOrder.value) return {}
  return { prop: sortKey.value, order: sortOrder.value === 'asc' ? 'ascending' : 'descending' }
})

/* ===== Утилиты форматирования/сравнения ===== */
function isNum(x: any): x is number { return typeof x === 'number' && Number.isFinite(x) }
function toNum(x: any): number | null {
  if (isNum(x)) return x
  if (typeof x === 'string' && x.trim() !== '') {
    const n = Number(x.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}
function formatCell(v: any) {
  if (isNum(v)) return v % 1 === 0 ? v : v.toFixed(2)
  return v
}

/* ===== Применение фильтров и сортировки к входным данным ===== */
const filteredRows = computed(() => {
  const fKeys = columns.value
  if (!props.data?.length) return []
  return props.data.filter((row) => {
    return fKeys.every((k) => {
      const q = (filters[k] ?? '').toString().trim().toLowerCase()
      if (!q) return true
      const cell = row[k]
      const s = (cell == null ? '' : String(cell)).toLowerCase()
      return s.includes(q)
    })
  })
})

const displayedRows = computed(() => {
  const arr = filteredRows.value.slice()
  const key = sortKey.value
  const ord = sortOrder.value
  if (!key || !ord) return arr

  const aNum = toNum(arr[0]?.[key])
  const isNumeric = aNum !== null

  arr.sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (isNumeric) {
      const na = toNum(av) ?? Number.NEGATIVE_INFINITY
      const nb = toNum(bv) ?? Number.NEGATIVE_INFINITY
      return ord === 'asc' ? na - nb : nb - na
    } else {
      const sa = (av == null ? '' : String(av)).toLowerCase()
      const sb = (bv == null ? '' : String(bv)).toLowerCase()
      if (sa === sb) return 0
      return ord === 'asc' ? (sa < sb ? -1 : 1) : (sa > sb ? -1 : 1)
    }
  })
  return arr
})
</script>

<style scoped>
.table-wrapper {
  width: 100%;
}
.th {
  display: grid;
  grid-template-rows: auto auto;
  gap: 6px;
}
.th__label {
  font-weight: 600;
}
.th__filter :deep(.el-input__wrapper) {
  padding: 0 6px;
}
.empty-hint {
  padding: 10px 12px;
  color: #6b7280; /* gray-500 */
  font-size: 13px;
}
</style>
