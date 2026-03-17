<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, watch } from 'vue'

import { PromptTemplateType, PromptTemplateTypeLabel } from '@/enums/PromptTemplateType'
import { usePromptTemplateStore } from '@/stores/modules/promptTemplate'

const VERSION_PATTERN = /^\s*[0-9]+(\.[0-9]+){0,2}\s*$/

/**
 * Prompt 模板管理页。
 * 模板资产会直接影响 AI 规则降级与未来真实模型接入，因此编辑页必须围绕真实模板详情、字段校验和启停约束构建，而不是只做一个静态列表。
 */
const promptTemplateStore = usePromptTemplateStore()

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
const currentTemplateId = computed(() => promptTemplateStore.currentTemplateId)
const currentTemplate = computed(() => promptTemplateStore.currentTemplate)
const canDeleteCurrentTemplate = computed(
  () =>
    !!currentTemplateId.value && !currentTemplate.value?.active && !promptTemplateStore.deleting,
)

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
  await promptTemplateStore.fetchPromptTemplateDetail(templateId)
}

function handleCreateNew() {
  promptTemplateStore.prepareNewTemplate()
}

async function handleSave() {
  if (promptTemplateStore.detailLoading || promptTemplateStore.submitting) {
    return
  }

  const payload = validatePayload()

  if (!payload) {
    return
  }

  if (currentTemplateId.value) {
    await promptTemplateStore.updatePromptTemplate(currentTemplateId.value, payload)
  } else {
    await promptTemplateStore.createPromptTemplate(payload)
  }

  ElMessage.success('模板已保存')
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
  await promptTemplateStore.deletePromptTemplate(deletedTemplateId)

  const fallbackTemplate = promptTemplateStore.templateList[0]

  if (fallbackTemplate) {
    await promptTemplateStore.fetchPromptTemplateDetail(fallbackTemplate.id)
  } else {
    promptTemplateStore.prepareNewTemplate()
  }

  ElMessage.success('模板已删除')
}

onMounted(async () => {
  const templateList = await promptTemplateStore.fetchPromptTemplateList()

  if (templateList[0]) {
    await promptTemplateStore.fetchPromptTemplateDetail(templateList[0].id)
  }
})
</script>

<template>
  <section class="prompt-template-view">
    <header class="prompt-template-view__hero">
      <div>
        <p class="prompt-template-view__eyebrow">System / Prompt Assets</p>
        <h1 class="prompt-template-view__title">Prompt 模板管理</h1>
        <p class="prompt-template-view__description">
          管理 AI
          规则降级和未来模型接入所依赖的模板资产，确保模板正文、类型、版本和启停状态都有明确审计入口。
        </p>
      </div>

      <div class="prompt-template-view__hero-actions">
        <button data-testid="new-template" type="button" @click="handleCreateNew">新建模板</button>
        <button
          data-testid="save-template"
          type="button"
          :disabled="promptTemplateStore.detailLoading || promptTemplateStore.submitting"
          @click="handleSave"
        >
          保存模板
        </button>
        <button
          data-testid="delete-template"
          type="button"
          :disabled="!canDeleteCurrentTemplate || promptTemplateStore.detailLoading"
          @click="handleDelete"
        >
          删除模板
        </button>
      </div>
    </header>

    <section class="prompt-template-view__body">
      <aside class="prompt-template-view__list-panel">
        <h2>模板列表</h2>
        <button
          v-for="template in promptTemplateStore.templateList"
          :key="template.id"
          :data-testid="`prompt-template-card-${template.id}`"
          :class="[
            'prompt-template-card',
            { 'prompt-template-card--active': template.id === currentTemplateId },
          ]"
          type="button"
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
      </aside>

      <section class="prompt-template-view__editor-panel">
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
          <textarea data-testid="template-description" v-model="formState.description" rows="4" />
        </label>

        <label class="prompt-template-view__switch-field">
          <input data-testid="template-active" v-model="formState.active" type="checkbox" />
          <span>启用模板</span>
        </label>
      </section>
    </section>
  </section>
</template>

<style scoped lang="scss">
.prompt-template-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.prompt-template-view__hero,
.prompt-template-view__list-panel,
.prompt-template-view__editor-panel {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
}

.prompt-template-view__hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
  background:
    radial-gradient(circle at top right, rgba(249, 115, 22, 0.14), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(255, 247, 237, 0.92));
}

.prompt-template-view__eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #c2410c;
}

.prompt-template-view__title {
  margin: 0;
  color: var(--app-text-primary);
}

.prompt-template-view__description {
  margin: 12px 0 0;
  line-height: 1.7;
  color: var(--app-text-secondary);
}

.prompt-template-view__hero-actions {
  display: flex;
  gap: 10px;
  align-self: flex-start;
}

.prompt-template-view__hero-actions button,
.prompt-template-card {
  cursor: pointer;
}

.prompt-template-view__body {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 20px;
}

.prompt-template-view__list-panel,
.prompt-template-view__editor-panel {
  padding: 22px;
}

.prompt-template-card {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.9);
  text-align: left;
}

.prompt-template-card--active {
  border-color: rgba(194, 65, 12, 0.35);
  background: rgba(255, 237, 213, 0.66);
}

.prompt-template-card p {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--app-text-secondary);
}

.prompt-template-card__meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #9a3412;
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
.prompt-template-view textarea,
.prompt-template-view__hero-actions button {
  border: 1px solid rgba(203, 213, 225, 0.9);
  border-radius: 16px;
  padding: 12px 14px;
  font: inherit;
}

.prompt-template-view textarea {
  resize: vertical;
}

.prompt-template-view__switch-field {
  flex-direction: row;
  align-items: center;
}

.prompt-template-view__switch-field input {
  width: auto;
}
</style>
