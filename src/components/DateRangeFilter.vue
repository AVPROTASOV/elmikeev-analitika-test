<template>
  <el-date-picker
    v-model="range"
    type="daterange"
    range-separator="-"
    start-placeholder="From"
    end-placeholder="To"
    format="YYYY-MM-DD"
    value-format="YYYY-MM-DD"
    :unlink-panels="true"
    :clearable="true"
    :shortcuts="shortcuts"
    class="drp"
  />
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import dayjs from 'dayjs'

const modelValue = defineModel<[string, string] | null>({ default: null })

const range = computed({
  get: () => modelValue.value,
  set: (v) => (modelValue.value = v),
})

const shortcuts = [
  {
    text: '7d',
    value: () => {
      const end = dayjs()
      const start = end.subtract(6, 'day')
      return [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')]
    },
  },
  {
    text: '30d',
    value: () => {
      const end = dayjs()
      const start = end.subtract(29, 'day')
      return [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')]
    },
  },
  {
    text: 'This month',
    value: () => {
      const start = dayjs().startOf('month')
      const end = dayjs().endOf('month')
      return [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')]
    },
  },
]
</script>

<style scoped>
/* Делает пикер компактным и не на всю ширину */
.drp {
  width: 300px;         /* подгоняй при желании: 280–340px */
}

/* Чуть уменьшаем внутренности для small */
:deep(.el-range-editor.el-input__inner) {
  padding: 6px 10px;
}
</style>
