<script setup lang="ts">
/**
 * 通用业务占位页。
 * Chunk 3 需要先把路由与布局体系跑通，但大量业务模块仍在后续 Chunk 开发，因此先用统一占位页承接未落地视图，避免路由提前引用不存在的页面文件。
 */
defineProps<{
  eyebrow: string
  title: string
  description: string
}>()
</script>

<template>
  <section class="view-placeholder">
    <div class="view-placeholder__surface">
      <p class="view-placeholder__eyebrow">{{ eyebrow }}</p>
      <h1 class="view-placeholder__title">{{ title }}</h1>
      <p class="view-placeholder__description">{{ description }}</p>
      <div v-if="$slots.actions" class="view-placeholder__actions">
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.view-placeholder {
  display: grid;
}

.view-placeholder__surface {
  padding: 32px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(244, 247, 251, 0.92));
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.08);
}

.view-placeholder__eyebrow {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--app-color-primary);
}

.view-placeholder__title {
  margin: 0;
  font-size: clamp(28px, 4vw, 38px);
  line-height: 1.2;
  color: var(--app-text-primary);
}

.view-placeholder__description {
  max-width: 720px;
  margin: 16px 0 0;
  font-size: 15px;
  line-height: 1.8;
  color: var(--app-text-secondary);
}

.view-placeholder__actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}
</style>
