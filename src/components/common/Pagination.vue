<script setup lang="ts">
/**
 * 通用分页组件。
 * 业务页统一通过该组件承接分页参数与变更事件，避免每个列表页都直接拼写 Element Plus 分页布局和参数回传逻辑。
 */
interface PaginationChangePayload {
  currentPage: number
  pageSize: number
}

const props = withDefaults(
  defineProps<{
    currentPage: number
    pageSize: number
    total: number
    pageSizes?: number[]
    disabled?: boolean
  }>(),
  {
    pageSizes: () => [10, 20, 50, 100],
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:current-page': [value: number]
  'update:page-size': [value: number]
  change: [payload: PaginationChangePayload]
}>()

function handleCurrentChange(currentPage: number) {
  emit('update:current-page', currentPage)
  emit('change', { currentPage, pageSize: props.pageSize })
}

function handleSizeChange(pageSize: number) {
  emit('update:page-size', pageSize)
  emit('change', { currentPage: props.currentPage, pageSize })
}
</script>

<template>
  <div class="pagination-wrapper">
    <el-pagination
      :current-page="currentPage"
      :page-size="pageSize"
      :page-sizes="pageSizes"
      :total="total"
      :disabled="disabled"
      background
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="handleCurrentChange"
      @size-change="handleSizeChange"
    />
  </div>
</template>

<style scoped lang="scss">
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}
</style>
