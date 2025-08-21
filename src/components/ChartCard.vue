<template>
  <div style="height: 340px">
    <v-chart :option="finalOption" autoresize />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { use } from 'echarts/core'
import VChart from 'vue-echarts'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent, DataZoomComponent } from 'echarts/components'

use([CanvasRenderer, LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, DataZoomComponent])

const props = withDefaults(defineProps<{
  /** Простой режим: [{ date, sum?, count? }] */
  series?: Array<{ date: string; sum?: number; count?: number }>
  /** Полный контроль — отдаёшь готовый ECharts option */
  option?: any
  title?: string
}>(), {
  series: () => [] as any[],
  option: undefined,
  title: undefined,
})

const finalOption = computed(() => {
  // Если дали кастомный опшен — отрисуем его как есть
  if (props.option) {
    // добавим заголовок, если передан title
    if (props.title && !props.option.title) {
      return { ...props.option, title: { text: props.title } }
    }
    return props.option
  }

  const s = props.series || []
  const x = s.map((it) => it?.date ?? '')
  const hasSum = s.some((it) => typeof it?.sum === 'number')
  const sumData = s.map((it) => (typeof it?.sum === 'number' ? it.sum : 0))
  const countData = s.map((it) => (typeof it?.count === 'number' ? it.count : 0))

  return {
    title: props.title ? { text: props.title } : undefined,
    tooltip: { trigger: 'axis' },
    legend: { data: hasSum ? ['sum', 'count'] : ['count'] },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: x },
    yAxis: { type: 'value' },
    series: [
      ...(hasSum ? [{ name: 'sum', type: 'bar', data: sumData }] : []),
      { name: 'count', type: 'line', data: countData },
    ],
  }
})
</script>
