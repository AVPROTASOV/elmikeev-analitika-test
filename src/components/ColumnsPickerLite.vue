<template>
  <el-popover placement="bottom-start" trigger="click" width="280">
    <template #reference>
      <el-button plain>Колонки</el-button>
    </template>

    <div class="picker">
      <el-checkbox
        v-for="k in allKeys"
        :key="k"
        :label="k"
        :model-value="!hiddenSet.has(k)"
        @change="(checked:boolean) => toggle(k, checked)"
      />
      <div class="actions">
        <el-button size="small" @click="showAll">Показать все</el-button>
        <el-button size="small" @click="hideAll">Скрыть все</el-button>
      </div>
    </div>
  </el-popover>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
const modelValue = defineModel<string[]>({ default: [] })   // список скрытых
const props = defineProps<{ allKeys: string[] }>()

const hiddenSet = computed(() => new Set(modelValue.value))

function toggle(key: string, checked: boolean) {
  const set = new Set(modelValue.value)
  if (checked) set.delete(key)  // показать
  else set.add(key)             // скрыть
  modelValue.value = Array.from(set)
}
function showAll() { modelValue.value = [] }
function hideAll() { modelValue.value = [...props.allKeys] }
</script>

<style scoped>
.picker { display: grid; gap: 6px; }
.actions { margin-top: 8px; display: flex; gap: 8px; }
</style>
