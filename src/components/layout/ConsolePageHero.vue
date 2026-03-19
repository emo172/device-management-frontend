<script setup lang="ts">
import { useSlots } from 'vue'

/**
 * 控制台页面 Hero 壳层。
 * 统一承接页面主标题、辅助说明和右侧操作区，避免列表页、仪表盘各自维护不一致的首屏结构。
 */
interface ConsolePageHeroProps {
  /** 页面眉标，通常用于承接英文域名或模块英文名。 */
  eyebrow?: string
  /** 页面主标题，直接对应当前业务域标题。 */
  title: string
  /** 页面描述，用于解释当前页职责或角色边界。 */
  description?: string
}

defineProps<ConsolePageHeroProps>()

const slots = useSlots()
</script>

<template>
  <section class="console-page-hero">
    <div class="console-page-hero__copy">
      <p v-if="eyebrow" class="console-page-hero__eyebrow">{{ eyebrow }}</p>
      <h1 class="console-page-hero__title">{{ title }}</h1>
      <p v-if="description" class="console-page-hero__description">{{ description }}</p>
      <div v-if="slots.default" class="console-page-hero__content">
        <slot />
      </div>
    </div>

    <div v-if="slots.actions" class="console-page-hero__actions">
      <slot name="actions" />
    </div>

    <div v-if="slots.meta" class="console-page-hero__meta">
      <slot name="meta" />
    </div>
  </section>
</template>

<style scoped lang="scss">
@use '@/assets/styles/console-shell' as shell;

.console-page-hero {
  @include shell.console-surface();

  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  padding: 28px 32px;
  border-radius: var(--app-radius-lg);
}

.console-page-hero__copy {
  min-width: 0;
}

.console-page-hero__eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--app-accent-amber);
}

.console-page-hero__title {
  margin: 0;
  font-family: var(--app-font-family-display);
  font-size: clamp(30px, 3vw, 40px);
  line-height: 1.12;
  color: var(--app-ink-950);
}

.console-page-hero__description,
.console-page-hero__content {
  margin-top: 14px;
  color: var(--app-text-secondary);
  line-height: 1.7;
}

.console-page-hero__actions {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.console-page-hero__meta {
  grid-column: 1 / -1;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
