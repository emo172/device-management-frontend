<script setup lang="ts">
import { RouterView } from 'vue-router'

/**
 * 基础设施阶段先提供一个稳定的应用壳层，
 * 避免在路由与业务页面尚未接入前出现脚手架默认文案或空白页。
 */
const appTitle = import.meta.env.VITE_APP_TITLE || '智能设备管理系统'
</script>

<template>
  <RouterView v-slot="{ Component }">
    <component :is="Component" v-if="Component" />
    <main v-else class="app-shell">
      <section class="app-shell__panel">
        <p class="app-shell__eyebrow">Chunk 1 / 基础设施搭建</p>
        <h1 class="app-shell__title">{{ appTitle }}</h1>
        <p class="app-shell__description">
          当前工作树已经完成依赖、样式系统、类型基线与请求层骨架，后续业务模块会在后续 Chunk
          逐步接入。
        </p>
      </section>
    </main>
  </RouterView>
</template>

<style scoped lang="scss">
.app-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 32px;
}

.app-shell__panel {
  width: min(720px, 100%);
  padding: 40px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(16px);
}

.app-shell__eyebrow {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--app-color-primary);
}

.app-shell__title {
  margin: 0;
  font-size: clamp(32px, 5vw, 48px);
  line-height: 1.1;
  color: var(--app-text-primary);
}

.app-shell__description {
  margin: 18px 0 0;
  font-size: 16px;
  line-height: 1.8;
  color: var(--app-text-secondary);
}
</style>
