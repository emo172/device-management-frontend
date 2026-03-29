<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleFeedbackSurface from '@/components/layout/ConsoleFeedbackSurface.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import ConsoleTableSection from '@/components/layout/ConsoleTableSection.vue'
import { PromptTemplateType, PromptTemplateTypeLabel } from '@/enums/PromptTemplateType'
import { usePromptTemplateStore } from '@/stores/modules/promptTemplate'

const VERSION_PATTERN = /^\s*[0-9]+(\.[0-9]+){0,2}\s*$/

/**
 * Prompt 模板管理页。
 * 模板资产会直接影响 AI 规则降级与未来真实模型接入，因此编辑页必须围绕真实模板详情、字段校验和启停约束构建，而不是只做一个静态列表。
 */
const promptTemplateStore = usePromptTemplateStore()
const listLoadErrorMessage = ref('')
const templateDetailErrorMessage = ref('')
const pageInitializing = ref(false)

const formState = reactive({
  name: '',
  code: '',
  type: PromptTemplateType.INTENT_RECOGNITION,
  content: '',
  variables: '',
  description: '',
  version: '1.0.0',
  active: false,
})

const typeOptions = Object.values(PromptTemplateType)
const templateList = computed(() => promptTemplateStore.templateList)
const currentTemplateId = computed(() => promptTemplateStore.currentTemplateId)
const currentTemplate = computed(() => promptTemplateStore.currentTemplate)
const hasTemplateDetailError = computed(
  () => !!templateDetailErrorMessage.value && !!currentTemplateId.value,
)
const canDeleteCurrentTemplate = computed(
  () =>
    !!currentTemplate.value &&
    !currentTemplate.value.active &&
    !promptTemplateStore.submitting &&
    !promptTemplateStore.deleting &&
    !hasTemplateDetailError.value,
)
const templateCountText = computed(() => `${templateList.value.length} 个模板`)
const activeTemplateCount = computed(
  () => templateList.value.filter((template) => template.active).length,
)
const editorModeLabel = computed(() => (currentTemplateId.value ? '编辑现有模板' : '新建模板'))
const editorTitle = computed(() => (currentTemplateId.value ? '编辑模板' : '新建模板'))
const canCreateNewTemplate = computed(
  () =>
    !pageInitializing.value &&
    !promptTemplateStore.listLoading &&
    !promptTemplateStore.detailLoading &&
    !promptTemplateStore.submitting &&
    !promptTemplateStore.deleting,
)
const canSaveCurrentTemplate = computed(() => {
  if (
    pageInitializing.value ||
    promptTemplateStore.detailLoading ||
    promptTemplateStore.submitting
  ) {
    return false
  }

  if (hasTemplateDetailError.value) {
    return false
  }

  if (currentTemplateId.value) {
    return !!currentTemplate.value
  }

  return true
})
const editorDescription = computed(() => {
  if (promptTemplateStore.detailLoading && currentTemplateId.value) {
    return '正在拉取模板详情，旧表单会暂时冻结以避免误写入。'
  }

  if (hasTemplateDetailError.value) {
    return templateDetailErrorMessage.value
  }

  if (currentTemplate.value) {
    return `最近更新：${currentTemplate.value.updatedAt}`
  }

  return '填写完整字段后即可保存为新的 Prompt 模板资产。'
})
const currentTemplateTypeLabel = computed(
  () => PromptTemplateTypeLabel[currentTemplate.value?.type ?? formState.type],
)
const currentTemplateStatusLabel = computed(() => {
  if (hasTemplateDetailError.value) {
    return '详情未就绪'
  }

  if (currentTemplate.value) {
    return currentTemplate.value.active ? '启用中' : '已停用'
  }

  return formState.active ? '准备启用' : '准备停用'
})

watch(
  currentTemplate,
  (template) => {
    if (!template) {
      formState.name = ''
      formState.code = ''
      formState.type = PromptTemplateType.INTENT_RECOGNITION
      formState.content = ''
      formState.variables = ''
      formState.description = ''
      formState.version = '1.0.0'
      formState.active = false
      return
    }

    formState.name = template.name
    formState.code = template.code
    formState.type = template.type
    formState.content = template.content
    formState.variables = template.variables || ''
    formState.description = template.description || ''
    formState.version = template.version
    formState.active = template.active
  },
  { immediate: true },
)

function resetListErrorState() {
  listLoadErrorMessage.value = ''
}

function resetDetailErrorState() {
  templateDetailErrorMessage.value = ''
}

function validatePayload() {
  /**
   * 版本号与变量 JSON 的校验必须在前端显式执行。
   * 这样管理员在提交前就能知道是“版本格式不对”还是“变量 JSON 非法”，避免把所有校验都推给后端后只看到笼统失败提示。
   */
  if (!formState.name.trim()) {
    ElMessage.warning('模板名称不能为空')
    return null
  }

  if (formState.name.trim().length > 100) {
    ElMessage.warning('模板名称长度不能超过 100 个字符')
    return null
  }

  if (!formState.code.trim()) {
    ElMessage.warning('模板代码不能为空')
    return null
  }

  if (formState.code.trim().length > 50) {
    ElMessage.warning('模板代码长度不能超过 50 个字符')
    return null
  }

  if (!formState.content.trim()) {
    ElMessage.warning('模板内容不能为空')
    return null
  }

  if (formState.description.trim().length > 500) {
    ElMessage.warning('模板描述长度不能超过 500 个字符')
    return null
  }

  if (!VERSION_PATTERN.test(formState.version.trim())) {
    ElMessage.warning('模板版本必须使用数字版本格式，例如 1、1.0 或 1.0.0')
    return null
  }

  if (formState.variables.trim()) {
    try {
      JSON.parse(formState.variables)
    } catch {
      ElMessage.warning('模板变量必须是合法 JSON')
      return null
    }
  }

  return {
    name: formState.name.trim(),
    code: formState.code.trim(),
    type: formState.type,
    content: formState.content.trim(),
    variables: formState.variables.trim() || null,
    description: formState.description.trim() || null,
    version: formState.version.trim(),
    active: formState.active,
  }
}

async function handleSelectTemplate(templateId: string) {
  if (promptTemplateStore.submitting || promptTemplateStore.deleting) {
    return
  }

  if (
    templateId === currentTemplateId.value &&
    !!currentTemplate.value &&
    !hasTemplateDetailError.value
  ) {
    return
  }

  resetDetailErrorState()

  try {
    await promptTemplateStore.fetchPromptTemplateDetail(templateId)
  } catch {
    /**
     * 详情失败后必须锁定保存按钮，避免管理员面对空白默认表单时误以为这是新模板并覆盖已有模板。
     */
    templateDetailErrorMessage.value = '模板详情加载失败，请重新选择模板或稍后重试。'
  }
}

function handleCreateNew() {
  if (!canCreateNewTemplate.value) {
    return
  }

  resetDetailErrorState()
  promptTemplateStore.prepareNewTemplate()
}

async function handleSave() {
  if (!canSaveCurrentTemplate.value) {
    return
  }

  const payload = validatePayload()

  if (!payload) {
    return
  }

  try {
    if (currentTemplateId.value) {
      await promptTemplateStore.updatePromptTemplate(currentTemplateId.value, payload)
    } else {
      await promptTemplateStore.createPromptTemplate(payload)
    }

    resetDetailErrorState()
    ElMessage.success('模板已保存')
  } catch {
    // 请求层已经提示失败原因，这里只阻止保存链路抛出未处理拒绝。
  }
}

async function handleDelete() {
  /**
   * 后端只允许删除停用模板，因此删除按钮必须跟着当前模板启停态与请求状态联动禁用。
   * 这样可以把“启用模板不可删”的业务约束前置到界面层，减少管理员误操作后再等待接口拒绝。
   */
  if (!currentTemplateId.value || !canDeleteCurrentTemplate.value) {
    return
  }

  const deletedTemplateId = currentTemplateId.value

  try {
    await promptTemplateStore.deletePromptTemplate(deletedTemplateId)

    const fallbackTemplate = promptTemplateStore.templateList[0]

    if (fallbackTemplate) {
      await handleSelectTemplate(fallbackTemplate.id)
    } else {
      promptTemplateStore.prepareNewTemplate()
    }

    ElMessage.success('模板已删除')
  } catch {
    // 请求层已经提示失败原因，这里只阻止删除链路抛出未处理拒绝。
  }
}

onMounted(async () => {
  /**
   * Prompt 模板页属于页面级编辑上下文。
   * 每次进入时都要先清空上一次保留的模板详情与选中态，避免列表请求失败时继续误用旧模板执行保存或删除。
   */
  promptTemplateStore.resetState()
  resetListErrorState()
  resetDetailErrorState()
  pageInitializing.value = true

  try {
    const templateList = await promptTemplateStore.fetchPromptTemplateList()

    if (templateList[0]) {
      await handleSelectTemplate(templateList[0].id)
    }
  } catch {
    listLoadErrorMessage.value = '模板列表加载失败，请稍后重试。'
  } finally {
    pageInitializing.value = false
  }
})

onBeforeUnmount(() => {
  promptTemplateStore.resetState()
})
</script>

<template>
  <section class="prompt-template-view">
    <ConsolePageHero
      title="Prompt 模板管理"
      description="管理 AI 规则降级和未来模型接入所依赖的模板资产，确保模板正文、类型、版本和启停状态都有明确审计入口。"
      class="prompt-template-view__hero"
    >
      <template #actions>
        <button
          data-testid="new-template"
          class="prompt-template-view__hero-button prompt-template-view__hero-button--ghost"
          type="button"
          :disabled="!canCreateNewTemplate"
          @click="handleCreateNew"
        >
          新建模板
        </button>
        <button
          data-testid="save-template"
          class="prompt-template-view__hero-button prompt-template-view__hero-button--primary"
          type="button"
          :disabled="!canSaveCurrentTemplate"
          @click="handleSave"
        >
          保存模板
        </button>
        <button
          data-testid="delete-template"
          class="prompt-template-view__hero-button prompt-template-view__hero-button--danger"
          type="button"
          :disabled="!canDeleteCurrentTemplate || promptTemplateStore.detailLoading"
          @click="handleDelete"
        >
          删除模板
        </button>
      </template>

      <template #meta>
        <div class="prompt-template-view__meta-pill">
          <span>当前模式</span>
          <strong>{{ editorModeLabel }}</strong>
        </div>
        <div class="prompt-template-view__meta-pill">
          <span>启用模板</span>
          <strong>{{ activeTemplateCount }}</strong>
        </div>
        <div class="prompt-template-view__meta-pill">
          <span>当前类型</span>
          <strong>{{ currentTemplateTypeLabel }}</strong>
        </div>
      </template>
    </ConsolePageHero>

    <div class="prompt-template-view__layout">
      <ConsoleTableSection title="模板工作台" :count="templateCountText">
        <!-- 模板列表与编辑表单同屏展示，方便系统管理员快速切换并比对不同模板差异。 -->
        <div class="prompt-template-view__workspace">
          <aside class="prompt-template-view__list-panel">
            <div class="prompt-template-view__panel-heading">
              <div>
                <h3>模板列表</h3>
                <p>切换模板时会重新拉取详情，避免旧请求覆盖当前编辑表单。</p>
              </div>
            </div>

            <ConsoleFeedbackSurface v-if="promptTemplateStore.listLoading" state="loading">
              <p class="prompt-template-view__feedback-title">模板列表加载中</p>
              <p class="prompt-template-view__feedback-description">
                正在同步最新 Prompt 模板资产。
              </p>
            </ConsoleFeedbackSurface>

            <ConsoleFeedbackSurface v-else-if="listLoadErrorMessage" state="error">
              <p class="prompt-template-view__feedback-title">模板列表加载失败</p>
              <p class="prompt-template-view__feedback-description">
                {{ listLoadErrorMessage }}
              </p>
            </ConsoleFeedbackSurface>

            <ConsoleFeedbackSurface v-else-if="!templateList.length" state="empty">
              <p class="prompt-template-view__feedback-title">暂无模板</p>
              <p class="prompt-template-view__feedback-description">
                可直接点击“新建模板”开始维护 AI 规则资产。
              </p>
            </ConsoleFeedbackSurface>

            <div v-else class="prompt-template-view__list-stack">
              <button
                v-for="template in templateList"
                :key="template.id"
                :data-testid="`prompt-template-card-${template.id}`"
                :class="[
                  'prompt-template-card',
                  { 'prompt-template-card--active': template.id === currentTemplateId },
                ]"
                type="button"
                :disabled="promptTemplateStore.submitting || promptTemplateStore.deleting"
                @click="handleSelectTemplate(template.id)"
              >
                <div>
                  <strong>{{ template.name }}</strong>
                  <p>{{ template.code }}</p>
                  <p>版本 {{ template.version }}</p>
                </div>
                <div class="prompt-template-card__meta">
                  <span>{{ PromptTemplateTypeLabel[template.type] }}</span>
                  <span>{{ template.active ? '启用中' : '已停用' }}</span>
                </div>
              </button>
            </div>
          </aside>

          <section class="prompt-template-view__editor-panel">
            <div
              class="prompt-template-view__panel-heading prompt-template-view__panel-heading--editor"
            >
              <div>
                <h3>{{ editorTitle }}</h3>
                <p>{{ editorDescription }}</p>
              </div>
              <span class="prompt-template-view__status-badge">{{
                currentTemplateStatusLabel
              }}</span>
            </div>

            <ConsoleFeedbackSurface
              v-if="promptTemplateStore.detailLoading && currentTemplateId"
              state="loading"
            >
              <p class="prompt-template-view__feedback-title">模板详情加载中</p>
              <p class="prompt-template-view__feedback-description">
                保存按钮会保持禁用，直到新模板详情完全回填到表单。
              </p>
            </ConsoleFeedbackSurface>

            <ConsoleFeedbackSurface v-else-if="hasTemplateDetailError" state="error">
              <p class="prompt-template-view__feedback-title">模板详情加载失败</p>
              <p class="prompt-template-view__feedback-description">
                {{ templateDetailErrorMessage }}
              </p>
            </ConsoleFeedbackSurface>

            <template v-else>
              <div class="prompt-template-view__field-grid">
                <label>
                  <span>模板名称</span>
                  <input data-testid="template-name" v-model="formState.name" type="text" />
                </label>
                <label>
                  <span>模板编码</span>
                  <input data-testid="template-code" v-model="formState.code" type="text" />
                </label>
                <label>
                  <span>模板类型</span>
                  <select data-testid="template-type" v-model="formState.type">
                    <option v-for="type in typeOptions" :key="type" :value="type">
                      {{ PromptTemplateTypeLabel[type] }}
                    </option>
                  </select>
                </label>
                <label>
                  <span>版本号</span>
                  <input data-testid="template-version" v-model="formState.version" type="text" />
                </label>
              </div>

              <label class="prompt-template-view__block-field">
                <span>模板内容</span>
                <textarea data-testid="template-content" v-model="formState.content" rows="8" />
              </label>

              <label class="prompt-template-view__block-field">
                <span>模板变量 JSON</span>
                <textarea data-testid="template-variables" v-model="formState.variables" rows="5" />
              </label>

              <label class="prompt-template-view__block-field">
                <span>模板描述</span>
                <textarea
                  data-testid="template-description"
                  v-model="formState.description"
                  rows="4"
                />
              </label>

              <!-- 启用状态直接映射后端布尔字段，便于界面前置提示“启用模板不可删”的业务约束。 -->
              <label class="prompt-template-view__switch-field">
                <input data-testid="template-active" v-model="formState.active" type="checkbox" />
                <span>启用模板</span>
              </label>
            </template>
          </section>
        </div>
      </ConsoleTableSection>

      <!-- 删除限制来自后端启停约束，因此摘要区需要持续提示“启用模板不可删”。 -->
      <ConsoleAsidePanel
        title="模板状态摘要"
        description="Prompt 模板会影响 AI 意图识别、信息抽取与结果反馈链路，需严格维护版本与启停状态。"
      >
        <div class="prompt-template-view__aside-stack">
          <section class="prompt-template-view__aside-card">
            <p class="prompt-template-view__aside-label">当前编辑模式</p>
            <h3>{{ editorModeLabel }}</h3>
            <p>
              {{
                currentTemplate?.name || '当前未选择历史模板，保存后会生成新的 Prompt 模板资产。'
              }}
            </p>
          </section>

          <section class="prompt-template-view__metrics">
            <article class="prompt-template-view__metric">
              <span>模板总数</span>
              <strong>{{ templateList.length }}</strong>
            </article>
            <article class="prompt-template-view__metric">
              <span>启用模板</span>
              <strong>{{ activeTemplateCount }}</strong>
            </article>
            <article class="prompt-template-view__metric">
              <span>当前版本</span>
              <strong>{{ formState.version }}</strong>
            </article>
            <article class="prompt-template-view__metric">
              <span>当前类型</span>
              <strong>{{ currentTemplateTypeLabel }}</strong>
            </article>
          </section>

          <section class="prompt-template-view__aside-card">
            <h4>业务规则</h4>
            <ul class="prompt-template-view__rule-list">
              <li>模板版本必须使用数字格式，例如 1、1.0 或 1.0.0。</li>
              <li>模板变量若填写则必须是合法 JSON，避免运行时变量注入失败。</li>
              <li>启用中的模板不可删除，需先停用再执行删除操作。</li>
            </ul>
          </section>
        </div>

        <template #footer>
          <p class="prompt-template-view__footer-note">
            {{
              currentTemplate
                ? `最近更新时间：${currentTemplate.updatedAt}`
                : '新建模板尚未产生创建与更新时间。'
            }}
          </p>
        </template>
      </ConsoleAsidePanel>
    </div>
  </section>
</template>

<style scoped lang="scss">
.prompt-template-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.prompt-template-view__hero {
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, var(--app-tone-warning-surface-strong), transparent 34%),
    radial-gradient(circle at bottom left, var(--app-tone-brand-surface), transparent 28%),
    linear-gradient(135deg, var(--app-surface-card-strong), var(--app-tone-warning-surface));
}

.prompt-template-view__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  align-items: start;
}

.prompt-template-view__meta-pill {
  min-width: 132px;
  padding: 12px 16px;
  border: 1px solid var(--app-border-glass);
  border-radius: 18px;
  background: var(--app-surface-glass);
  backdrop-filter: blur(12px);
}

.prompt-template-view__meta-pill span,
.prompt-template-view__field-grid label span,
.prompt-template-view__block-field span,
.prompt-template-view__aside-label {
  display: block;
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--app-tone-warning-text);
}

.prompt-template-view__meta-pill strong,
.prompt-template-view__panel-heading h3,
.prompt-template-view__aside-card h3,
.prompt-template-view__aside-card h4,
.prompt-template-view__metric strong {
  margin: 0;
  color: var(--app-text-primary);
}

.prompt-template-view__panel-heading p,
.prompt-template-card p,
.prompt-template-view__feedback-description,
.prompt-template-view__aside-card p,
.prompt-template-view__rule-list,
.prompt-template-view__footer-note {
  margin: 0;
  line-height: 1.7;
  color: var(--app-text-secondary);
}

.prompt-template-view__hero-button {
  border: 1px solid var(--app-border-soft);
  border-radius: 16px;
  padding: 12px 16px;
  font: inherit;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.prompt-template-view__hero-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--app-shadow-card);
}

.prompt-template-view__hero-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.prompt-template-view__hero-button--ghost {
  background: var(--app-surface-card);
  color: var(--app-text-primary);
}

.prompt-template-view__hero-button--primary {
  border-color: var(--app-tone-warning-border);
  background: linear-gradient(135deg, var(--app-tone-warning-solid), var(--app-tone-warning-text));
  color: var(--app-text-primary);
}

.prompt-template-view__hero-button--danger {
  border-color: var(--app-tone-danger-border);
  background: var(--app-tone-danger-surface);
  color: var(--app-tone-danger-text-strong);
}

.prompt-template-view__workspace {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 20px;
}

.prompt-template-view__list-panel,
.prompt-template-view__editor-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
  border: 1px solid var(--app-border-soft);
  border-radius: 24px;
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-card);
}

.prompt-template-view__list-panel {
  min-width: 0;
}

.prompt-template-view__panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.prompt-template-view__panel-heading--editor {
  padding-bottom: 4px;
  border-bottom: 1px solid var(--app-border-soft);
}

.prompt-template-view__status-badge {
  display: inline-flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 999px;
  background: var(--app-tone-warning-surface);
  color: var(--app-tone-warning-text);
  font-size: 13px;
  white-space: nowrap;
}

.prompt-template-view__list-stack {
  display: grid;
  gap: 12px;
}

.prompt-template-card {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--app-border-soft);
  border-radius: 20px;
  background: linear-gradient(180deg, var(--app-surface-card-strong), var(--app-surface-card));
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.prompt-template-card:hover,
.prompt-template-card--active {
  transform: translateY(-1px);
  border-color: var(--app-tone-warning-border);
  box-shadow: var(--app-shadow-card);
}

.prompt-template-card__meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--app-tone-warning-text-strong);
  white-space: nowrap;
}

.prompt-template-view__field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.prompt-template-view__field-grid label,
.prompt-template-view__block-field,
.prompt-template-view__switch-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prompt-template-view__block-field,
.prompt-template-view__switch-field {
  margin-top: 18px;
}

.prompt-template-view input,
.prompt-template-view select,
.prompt-template-view textarea {
  border: 1px solid var(--app-border-soft);
  border-radius: 16px;
  padding: 12px 14px;
  background: var(--app-surface-card-strong);
  color: var(--app-text-primary);
  font: inherit;
}

.prompt-template-view textarea {
  resize: vertical;
}

.prompt-template-view__switch-field {
  flex-direction: row;
  align-items: center;
}

.prompt-template-view__switch-field span {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: var(--app-text-primary);
}

.prompt-template-view__switch-field input {
  width: auto;
}

.prompt-template-view__feedback-title {
  margin: 0;
  font-size: 18px;
  color: var(--app-text-primary);
}

.prompt-template-view__aside-stack {
  display: grid;
  gap: 16px;
}

.prompt-template-view__aside-card,
.prompt-template-view__metric {
  padding: 18px;
  border: 1px solid var(--app-border-glass);
  border-radius: 20px;
  background: var(--app-surface-glass);
}

.prompt-template-view__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.prompt-template-view__metric {
  display: grid;
  gap: 10px;
}

.prompt-template-view__metric span {
  font-size: 13px;
  color: var(--app-text-secondary);
}

.prompt-template-view__rule-list {
  padding-left: 18px;
}

.prompt-template-view__footer-note {
  width: 100%;
  font-size: 13px;
}

@media (max-width: 1280px) {
  .prompt-template-view__layout {
    grid-template-columns: 1fr;
  }

  .prompt-template-view__workspace {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .prompt-template-view__field-grid,
  .prompt-template-view__metrics {
    grid-template-columns: 1fr;
  }
}
</style>
