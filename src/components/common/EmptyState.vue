<script setup lang="ts">
import ConsoleFeedbackSurface from '@/components/layout/ConsoleFeedbackSurface.vue'

/**
 * 通用空状态组件。
 * 设备列表、分类树和详情扩展区在无数据时统一用该组件提示，减少页面层重复拼装说明文案与动作按钮。
 */
defineProps<{
  title: string
  description: string
  actionText?: string
}>()

defineEmits<{
  action: []
}>()
</script>

<template>
  <ConsoleFeedbackSurface class="empty-state empty-state__surface">
    <el-empty>
      <template #description>
        <div class="empty-state__content">
          <h3 class="empty-state__title">{{ title }}</h3>
          <p class="empty-state__description">{{ description }}</p>
          <el-button v-if="actionText" class="empty-action" type="primary" @click="$emit('action')">
            {{ actionText }}
          </el-button>
        </div>
      </template>
    </el-empty>
  </ConsoleFeedbackSurface>
</template>

<style scoped lang="scss">
.empty-state {
  border: 1px dashed var(--app-border-soft);
  // 公共空状态默认服务多个业务域，底色保持中性 surface，避免组件先天带入 info 语义。
  background: var(--app-surface-card-strong);
}

.empty-state__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.empty-state__title {
  margin: 0;
  font-size: 18px;
  color: var(--app-text-primary);
}

.empty-state__description {
  margin: 0;
  max-width: 420px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--app-text-secondary);
}
</style>
