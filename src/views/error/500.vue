<script setup lang="ts">
import { computed } from 'vue'
import { isNavigationFailure, useRouter } from 'vue-router'

import { useAppStore } from '@/stores/modules/app'
import ViewPlaceholder from '@/views/common/ViewPlaceholder.vue'

/**
 * 500 服务异常页。
 * 当前页负责消费全局 fatalError 快照，并把“重试 / 返回首页”统一约束为安全导航：
 * 只有真正离开 `/500` 时才清理快照，避免导航被中止后把排障上下文提前丢掉。
 */
const router = useRouter()
const appStore = useAppStore()

/**
 * Vue Router 的导航中止通常以 resolved NavigationFailure 返回，而不是抛异常。
 * 因此这里必须同时排除“抛错失败”和“已 resolve 但被取消/中止”的情况，
 * 只有确认真正离开 500 页面后，才能安全清理当前 fatalError 快照。
 */
async function clearFatalErrorAfterSuccessfulNavigation(target: string) {
  try {
    const result = await router.push(target)

    if (isNavigationFailure(result)) {
      return
    }

    appStore.clearFatalError()
  } catch {
    // 真正抛错时同样要保留原错误快照，避免 500 页失去排障上下文。
  }
}

/**
 * 当上游尚未写入错误快照时，页面仍需给出可理解的兜底文案，避免 500 页再次出现空白状态。
 */
const pageContent = computed(() => {
  const fatalError = appStore.fatalError

  return {
    title: fatalError?.title ?? '系统暂时无法完成当前操作',
    description:
      fatalError?.description ?? '请返回首页后重新进入目标模块；若问题持续出现，请联系管理员排查。',
    source: fatalError?.source ?? 'unknown',
    retryTarget: fatalError?.retryTarget,
  }
})

/**
 * 联合类型收紧后，只有明确可重试时才暴露目标路径，避免模板和事件处理误读无效组合。
 */
const retryPath = computed(() => {
  const retryTarget = pageContent.value.retryTarget

  if (!retryTarget || !retryTarget.retryable) {
    return null
  }

  return retryTarget.path
})

/**
 * 返回首页代表用户放弃当前故障上下文，必须同步清理全局错误快照，避免后续跳转误读旧状态。
 */
async function handleGoHome() {
  await clearFatalErrorAfterSuccessfulNavigation('/dashboard')
}

/**
 * 重试只支持跳回上游记录的路由路径。
 * 若没有可重试目标，则按钮不展示，避免用户重复触发无法恢复的故障流程。
 */
async function handleRetry() {
  const targetPath = retryPath.value

  if (!targetPath) {
    return
  }

  await clearFatalErrorAfterSuccessfulNavigation(targetPath)
}
</script>

<template>
  <ViewPlaceholder eyebrow="500" :title="pageContent.title" :description="pageContent.description">
    <template #actions>
      <p class="error-page__source">错误来源：{{ pageContent.source }}</p>
      <button
        v-if="retryPath"
        type="button"
        class="error-page__action error-page__action--secondary"
        data-testid="retry-action"
        @click="handleRetry"
      >
        重试
      </button>
      <button
        type="button"
        class="error-page__action"
        data-testid="go-home-action"
        @click="handleGoHome"
      >
        返回首页
      </button>
    </template>
  </ViewPlaceholder>
</template>

<style scoped lang="scss">
.error-page__source {
  margin: 0 auto 0 0;
  font-size: 13px;
  color: var(--app-text-secondary);
}

.error-page__action {
  padding: 10px 18px;
  border: none;
  border-radius: 999px;
  background: var(--app-color-primary);
  color: #fff;
  font: inherit;
  cursor: pointer;
}

.error-page__action--secondary {
  background: rgba(15, 23, 42, 0.08);
  color: var(--app-text-primary);
}
</style>
