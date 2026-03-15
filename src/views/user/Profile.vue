<script setup lang="ts">
import ViewPlaceholder from '@/views/common/ViewPlaceholder.vue'

/**
 * 个人中心占位页。
 * 先提供稳定路由给头部用户菜单与守卫链路使用，具体资料编辑和密码修改将在后续 Chunk 实现。
 */
</script>

<template>
  <ViewPlaceholder
    eyebrow="User / Profile"
    title="个人中心待接入完整资料表单"
    description="当前页面先承接头部菜单入口与受保护路由访问，后续 Chunk 会补齐个人资料编辑、密码修改与角色信息展示。"
  />
</template>
