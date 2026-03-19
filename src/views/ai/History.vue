<script setup lang="ts">
import { onMounted, ref } from 'vue'

import EmptyState from '@/components/common/EmptyState.vue'
import ConversationShell from '@/components/layout/ConversationShell.vue'
import { useAiStore } from '@/stores/modules/ai'
import { formatDateTime } from '@/utils/date'

/**
 * AI 历史页。
 * 后端当前只提供“历史摘要列表 + 单条详情”，因此页面采用左侧会话列表、右侧详情预览的结构，
 * 既满足页内可用交互，又不假设存在整段会话消息回放接口。
 */
const aiStore = useAiStore()
const activeHistoryId = ref<string | null>(null)

async function loadHistoryList() {
  try {
    await aiStore.fetchHistoryList()
  } catch {
    // 请求层已经统一提示，这里只阻止历史加载链路出现未处理拒绝。
  }
}

async function handleSelectHistory(historyId: string) {
  activeHistoryId.value = historyId

  try {
    await aiStore.fetchHistoryDetail(historyId)
  } catch {
    // 请求层已经统一提示，这里避免点击历史摘要时抛出未处理拒绝。
  }
}

onMounted(() => {
  aiStore.clearCurrentHistory()
  activeHistoryId.value = null
  void loadHistoryList()
})
</script>

<template>
  <section class="ai-history-view">
    <header class="ai-history-view__hero">
      <div>
        <p class="ai-history-view__eyebrow">Conversation History</p>
        <h1 class="ai-history-view__title">历史会话</h1>
        <p class="ai-history-view__description">
          这里回看你已经发起过的 AI 记录。点击某条摘要后，右侧会展示那一轮用户输入、AI
          回复、执行结果与错误信息。
        </p>
      </div>

      <div class="ai-history-view__hero-actions">
        <RouterLink class="ai-history-view__back-link" to="/ai">返回对话页</RouterLink>
        <el-button @click="loadHistoryList">刷新历史</el-button>
      </div>
    </header>

    <ConversationShell class="ai-history-view__shell">
      <template #sidebar>
        <article class="ai-history-view__list-card">
          <div class="ai-history-view__panel-header">
            <div>
              <h2>历史摘要</h2>
              <p>共 {{ aiStore.historyList.length }} 条</p>
            </div>
          </div>

          <EmptyState
            v-if="!aiStore.historyList.length && !aiStore.loading"
            title="暂无历史会话"
            description="发起至少一轮 AI 对话后，这里才会出现可回看的历史记录。"
          />

          <div v-else class="ai-history-view__list">
            <button
              v-for="item in aiStore.historyList"
              :key="item.id"
              :data-history-id="item.id"
              class="ai-history-view__history-item"
              :class="{ 'ai-history-view__history-item--active': activeHistoryId === item.id }"
              @click="handleSelectHistory(item.id)"
            >
              <strong>{{ item.userInput }}</strong>
              <span>意图：{{ item.intent }}</span>
              <span>执行：{{ item.executeResult }}</span>
              <time>{{ formatDateTime(item.createdAt) }}</time>
            </button>
          </div>
        </article>
      </template>

      <template #main>
        <article class="ai-history-view__detail-card">
          <div class="ai-history-view__panel-header">
            <div>
              <h2>详情预览</h2>
              <p>页内直接查看单条历史详情，不依赖额外弹窗。</p>
            </div>
          </div>

          <EmptyState
            v-if="!aiStore.currentHistory"
            title="选择一条历史记录"
            description="点击左侧摘要后，右侧会展示本轮 AI 的回复内容、结构化结果与错误提示。"
          />

          <dl v-else class="ai-history-view__detail-list">
            <div>
              <dt>用户输入</dt>
              <dd>{{ aiStore.currentHistory.userInput }}</dd>
            </div>
            <div>
              <dt>AI 回复</dt>
              <dd>{{ aiStore.currentHistory.aiResponse }}</dd>
            </div>
            <div>
              <dt>识别意图</dt>
              <dd>{{ aiStore.currentHistory.intent }}</dd>
            </div>
            <div>
              <dt>执行结果</dt>
              <dd>{{ aiStore.currentHistory.executeResult }}</dd>
            </div>
            <div>
              <dt>结构化信息</dt>
              <dd>{{ aiStore.currentHistory.extractedInfo || '无' }}</dd>
            </div>
            <div>
              <dt>错误信息</dt>
              <dd>{{ aiStore.currentHistory.errorMessage || '无' }}</dd>
            </div>
          </dl>
        </article>
      </template>
    </ConversationShell>
  </section>
</template>

<style scoped lang="scss">
.ai-history-view {
  display: grid;
  gap: 24px;
}

.ai-history-view__hero,
.ai-history-view__list-card,
.ai-history-view__detail-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 22px 54px rgba(15, 23, 42, 0.08);
}

.ai-history-view__hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
  background:
    radial-gradient(circle at top right, rgba(13, 148, 136, 0.16), transparent 34%),
    radial-gradient(circle at bottom left, rgba(245, 158, 11, 0.14), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.94));
}

.ai-history-view__eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #0f766e;
}

.ai-history-view__title,
.ai-history-view__panel-header h2 {
  margin: 0;
  color: var(--app-text-primary);
}

.ai-history-view__description,
.ai-history-view__panel-header p,
.ai-history-view__history-item span,
.ai-history-view__history-item time,
.ai-history-view__detail-list dt {
  color: var(--app-text-secondary);
}

.ai-history-view__description {
  margin: 14px 0 0;
  max-width: 760px;
  line-height: 1.8;
}

.ai-history-view__hero-actions {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.ai-history-view__back-link {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(15, 118, 110, 0.14);
  background: rgba(255, 255, 255, 0.92);
  color: #0f766e;
  text-decoration: none;
}

.ai-history-view__shell {
  display: grid;
  gap: 20px;
}

.ai-history-view__list-card,
.ai-history-view__detail-card {
  height: 100%;
}

.ai-history-view__panel-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.ai-history-view__panel-header p {
  margin: 8px 0 0;
}

.ai-history-view__list {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.ai-history-view__history-item {
  display: grid;
  gap: 6px;
  padding: 16px 18px;
  text-align: left;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
}

.ai-history-view__history-item--active {
  border-color: rgba(15, 118, 110, 0.28);
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.1), rgba(255, 255, 255, 0.98));
}

.ai-history-view__history-item strong,
.ai-history-view__detail-list dd {
  color: var(--app-text-primary);
}

.ai-history-view__detail-list {
  display: grid;
  gap: 16px;
  margin: 18px 0 0;
}

.ai-history-view__detail-list div {
  padding: 16px 18px;
  border-radius: 20px;
  background: rgba(248, 250, 252, 0.86);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.ai-history-view__detail-list dt,
.ai-history-view__detail-list dd {
  margin: 0;
}

.ai-history-view__detail-list dd {
  margin-top: 8px;
  line-height: 1.8;
  white-space: pre-wrap;
}
</style>
