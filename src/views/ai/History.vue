<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

import EmptyState from '@/components/common/EmptyState.vue'
import { useAiSpeechPlayback } from '@/composables/useAiSpeechPlayback'
import { AI_HISTORY_PLAY_TEST_ID } from '@/constants/ai'
import ConversationShell from '@/components/layout/ConversationShell.vue'
import { useAiStore } from '@/stores/modules/ai'
import { formatDateTime } from '@/utils/date'

/**
 * AI 历史页。
 * 后端当前只提供“历史摘要列表 + 单条详情”，因此页面采用左侧会话列表、右侧详情预览的结构，
 * 既满足页内可用交互，又不假设存在整段会话消息回放接口。
 */
const aiStore = useAiStore()
const speechPlayback = useAiSpeechPlayback()
const activeHistoryId = ref<string | null>(null)
let historySelectionToken = 0

async function loadHistoryList() {
  try {
    await aiStore.fetchHistoryList()
  } catch {
    // 请求层已经统一提示，这里只阻止历史加载链路出现未处理拒绝。
  }
}

async function handleSelectHistory(historyId: string) {
  const previousHistoryId = activeHistoryId.value
  const currentSelectionToken = historySelectionToken + 1
  historySelectionToken = currentSelectionToken

  try {
    const historyDetail = await aiStore.fetchHistoryDetail(historyId)

    /**
     * 历史详情请求可能因为连续点击被新请求覆盖。
     * 页面层再用一次选择令牌兜底，确保旧请求即使返回了自己的详情，也不会把最新一次点击的高亮抢回去。
     */
    if (currentSelectionToken !== historySelectionToken) {
      return
    }

    if (historyDetail?.id === historyId) {
      activeHistoryId.value = historyId
      return
    }

    activeHistoryId.value = previousHistoryId
  } catch {
    if (currentSelectionToken !== historySelectionToken) {
      return
    }

    // 请求层已经统一提示，这里只回退高亮，避免详情请求失败后左侧选中态先跳走、右侧却仍停留旧内容。
    activeHistoryId.value = previousHistoryId
  }
}

onMounted(() => {
  aiStore.clearCurrentHistory()
  activeHistoryId.value = null
  void loadHistoryList()
})

watch(
  () => aiStore.currentHistory?.id,
  (currentHistoryId, previousHistoryId) => {
    if (currentHistoryId !== previousHistoryId) {
      speechPlayback.stopPlayback()
    }
  },
)

function handleToggleHistoryPlayback() {
  const historyId = aiStore.currentHistory?.id

  if (!historyId) {
    return
  }

  void speechPlayback.togglePlayback(historyId)
}
</script>

<template>
  <section class="ai-history-view">
    <header class="ai-history-view__hero">
      <div>
        <p class="ai-history-view__eyebrow">会话历史</p>
        <h1 class="ai-history-view__title">历史会话</h1>
        <p class="ai-history-view__description">
          这里回看你已经发起过的 AI 记录。点击某条摘要后，右侧会展示那一轮用户输入、AI
          回复、执行结果与错误信息；播放语音时会按需根据当前 AI 回复生成，不长期保存原始录音。
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
              <dd>
                <div class="ai-history-view__response-block">
                  <p class="ai-history-view__response-text">{{ aiStore.currentHistory.aiResponse }}</p>
                  <!-- 历史语音入口只放在右侧详情区，点击后按需把当前 AI 回复合成为语音，避免左侧摘要列表每行都引入额外交互噪音。 -->
                  <button
                    :data-testid="AI_HISTORY_PLAY_TEST_ID"
                    class="ai-history-view__play-button"
                    type="button"
                    @click="handleToggleHistoryPlayback"
                  >
                    {{
                      speechPlayback.getPlaybackState(aiStore.currentHistory.id).isLoading
                        ? '加载语音中...'
                        : speechPlayback.getPlaybackState(aiStore.currentHistory.id).isPlaying
                          ? '停止播放'
                          : '播放语音'
                    }}
                  </button>
                </div>
                <p
                  v-if="speechPlayback.getPlaybackState(aiStore.currentHistory.id).errorMessage"
                  class="ai-history-view__playback-error"
                >
                  {{ speechPlayback.getPlaybackState(aiStore.currentHistory.id).errorMessage }}
                </p>
              </dd>
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
  border: 1px solid var(--app-border-soft);
  border-radius: 28px;
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-card);
}

.ai-history-view__hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
  background:
    radial-gradient(circle at top right, var(--app-tone-success-surface-strong), transparent 34%),
    radial-gradient(circle at bottom left, var(--app-tone-warning-surface), transparent 28%),
    linear-gradient(135deg, var(--app-surface-card-strong), var(--app-surface-card));
}

.ai-history-view__eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--app-tone-success-text);
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
  border: 1px solid var(--app-tone-success-border);
  background: var(--app-surface-overlay);
  color: var(--app-tone-success-text);
  text-decoration: none;
  box-shadow: var(--app-shadow-solid);
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
  border: 1px solid var(--app-border-soft);
  border-radius: 20px;
  background: var(--app-surface-overlay);
  cursor: pointer;
}

.ai-history-view__history-item--active {
  // 历史选中态需要和会话详情形成同一条视觉线索，所以这里把边框与底色都映射到主题 token。
  border-color: var(--app-tone-brand-border);
  background: linear-gradient(
    135deg,
    var(--app-tone-success-surface),
    var(--app-surface-card-strong)
  );
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
  background: var(--app-surface-muted);
  border: 1px solid var(--app-border-soft);
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

.ai-history-view__response-block {
  display: grid;
  gap: 12px;
}

.ai-history-view__response-text {
  margin: 0;
}

.ai-history-view__play-button {
  justify-self: flex-start;
  border: 1px solid var(--app-detail-action-border);
  border-radius: var(--app-radius-sm);
  background: var(--app-detail-action-surface);
  color: var(--app-detail-action-text);
  font: inherit;
  font-size: 13px;
  line-height: 1.4;
  padding: 6px 10px;
  cursor: pointer;
}

.ai-history-view__play-button:hover {
  background: var(--app-detail-action-surface-strong);
  color: var(--app-detail-action-text-strong);
}

.ai-history-view__play-button:focus-visible {
  outline: none;
  box-shadow: var(--app-detail-action-focus-ring);
}

.ai-history-view__playback-error {
  margin: 10px 0 0;
  color: var(--app-tone-danger-text);
  font-size: 13px;
  line-height: 1.6;
}
</style>
