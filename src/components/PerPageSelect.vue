<template>
  <el-select v-model="val" style="width: 110px">
    <el-option v-for="n in options" :key="n" :label="String(n)" :value="n" />
  </el-select>
</template>

<script lang="ts" setup>
const modelValue = defineModel<number>({ default: 50 })
const options = [25, 50, 100, 200, 500]
const val = modelValue
</script>
