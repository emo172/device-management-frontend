import { defineStore } from 'pinia'

import * as promptTemplateApi from '@/api/prompt-templates'

interface PromptTemplateStoreState {
  templateList: promptTemplateApi.PromptTemplateResponse[]
  currentTemplate: promptTemplateApi.PromptTemplateResponse | null
  currentTemplateId: string
  listLoading: boolean
  detailLoading: boolean
  submitting: boolean
  deleting: boolean
  detailRequestVersion: number
}

function upsertTemplate(
  templateList: promptTemplateApi.PromptTemplateResponse[],
  template: promptTemplateApi.PromptTemplateResponse,
) {
  const existed = templateList.some((item) => item.id === template.id)

  if (!existed) {
    return [template, ...templateList]
  }

  return templateList.map((item) => (item.id === template.id ? template : item))
}

function createDefaultState(): PromptTemplateStoreState {
  return {
    templateList: [],
    currentTemplate: null,
    currentTemplateId: '',
    listLoading: false,
    detailLoading: false,
    submitting: false,
    deleting: false,
    detailRequestVersion: 0,
  }
}

/**
 * Prompt 模板管理 store。
 * 该模块独立承接模板资产列表、详情和写操作状态，避免与用户管理或角色授权共享上下文后相互污染。
 */
export const usePromptTemplateStore = defineStore('prompt-template', {
  state: (): PromptTemplateStoreState => createDefaultState(),

  actions: {
    async fetchPromptTemplateList() {
      this.listLoading = true

      try {
        const templateList = await promptTemplateApi.getPromptTemplateList()
        this.templateList = templateList

        if (
          !templateList.length ||
          !templateList.some((item) => item.id === this.currentTemplateId)
        ) {
          this.prepareNewTemplate()
        }

        return templateList
      } finally {
        this.listLoading = false
      }
    },

    /**
     * 模板详情切换时只允许最后一次请求回写，避免管理员快速切换模板后被旧请求覆盖编辑表单。
     */
    async fetchPromptTemplateDetail(templateId: string) {
      const requestVersion = this.detailRequestVersion + 1
      this.detailRequestVersion = requestVersion
      this.currentTemplateId = templateId
      this.currentTemplate = null
      this.detailLoading = true

      try {
        const template = await promptTemplateApi.getPromptTemplateDetail(templateId)

        if (requestVersion !== this.detailRequestVersion || templateId !== this.currentTemplateId) {
          return template
        }

        this.currentTemplate = template
        this.templateList = upsertTemplate(this.templateList, template)
        return template
      } finally {
        if (requestVersion === this.detailRequestVersion) {
          this.detailLoading = false
        }
      }
    },

    prepareNewTemplate() {
      this.detailRequestVersion += 1
      this.currentTemplateId = ''
      this.currentTemplate = null
      this.detailLoading = false
    },

    async createPromptTemplate(data: promptTemplateApi.PromptTemplateRequest) {
      this.submitting = true

      try {
        const template = await promptTemplateApi.createPromptTemplate(data)
        this.currentTemplateId = template.id
        this.currentTemplate = template
        this.templateList = upsertTemplate(this.templateList, template)
        return template
      } finally {
        this.submitting = false
      }
    },

    async updatePromptTemplate(templateId: string, data: promptTemplateApi.PromptTemplateRequest) {
      this.submitting = true

      try {
        const template = await promptTemplateApi.updatePromptTemplate(templateId, data)
        this.currentTemplateId = template.id
        this.currentTemplate = template
        this.templateList = upsertTemplate(this.templateList, template)
        return template
      } finally {
        this.submitting = false
      }
    },

    async deletePromptTemplate(templateId: string) {
      this.deleting = true

      try {
        await promptTemplateApi.deletePromptTemplate(templateId)
        this.templateList = this.templateList.filter((item) => item.id !== templateId)

        if (this.currentTemplateId === templateId) {
          this.prepareNewTemplate()
        }
      } finally {
        this.deleting = false
      }
    },

    resetState() {
      Object.assign(this, createDefaultState())
    },
  },
})
