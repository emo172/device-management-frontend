<script setup lang="ts">
/**
 * 冲突与规则提醒组件。
 * 方案 1 没有后端独立冲突检测接口，因此创建页需要同时承接“本地规则提醒”和“提交后端返回的冲突错误”，
 * 让用户知道当前是前端校验问题还是后端最终裁决问题。
 */
withDefaults(
  defineProps<{
    localWarnings?: string[]
    serverConflictMessage?: string
  }>(),
  {
    localWarnings: () => [],
    serverConflictMessage: '',
  },
)
</script>

<template>
  <div v-if="localWarnings.length || serverConflictMessage" class="conflict-warning">
    <el-alert
      v-for="warning in localWarnings"
      :key="warning"
      :title="warning"
      type="warning"
      :closable="false"
      show-icon
    />
    <el-alert
      v-if="serverConflictMessage"
      :title="serverConflictMessage"
      type="error"
      :closable="false"
      show-icon
    />
  </div>
</template>

<style scoped lang="scss">
.conflict-warning {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
