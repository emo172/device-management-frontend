<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import AuthLayout from '@/layouts/AuthLayout.vue'
import BlankLayout from '@/layouts/BlankLayout.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

/**
 * 根组件只负责根据路由 meta.layout 选择页面壳层。
 * 这样业务页面本身无需关心自己被放进哪种布局，也避免在路由模块外再维护一套路由到布局的映射关系。
 */
const route = useRoute()

const layoutMap = {
  auth: AuthLayout,
  blank: BlankLayout,
  default: DefaultLayout,
}

const currentLayout = computed(
  () => layoutMap[route.meta.layout as keyof typeof layoutMap] || DefaultLayout,
)
</script>

<template>
  <component :is="currentLayout">
    <RouterView />
  </component>
</template>
