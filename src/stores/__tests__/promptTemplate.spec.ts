import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { PromptTemplateType } from '@/enums/PromptTemplateType'

const {
  createPromptTemplateMock,
  deletePromptTemplateMock,
  getPromptTemplateDetailMock,
  getPromptTemplateListMock,
  updatePromptTemplateMock,
} = vi.hoisted(() => ({
  createPromptTemplateMock: vi.fn(),
  deletePromptTemplateMock: vi.fn(),
  getPromptTemplateDetailMock: vi.fn(),
  getPromptTemplateListMock: vi.fn(),
  updatePromptTemplateMock: vi.fn(),
}))

vi.mock('@/api/prompt-templates', () => ({
  createPromptTemplate: createPromptTemplateMock,
  deletePromptTemplate: deletePromptTemplateMock,
  getPromptTemplateDetail: getPromptTemplateDetailMock,
  getPromptTemplateList: getPromptTemplateListMock,
  updatePromptTemplate: updatePromptTemplateMock,
}))

import { usePromptTemplateStore } from '../modules/promptTemplate'

describe('prompt template store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    createPromptTemplateMock.mockReset()
    deletePromptTemplateMock.mockReset()
    getPromptTemplateDetailMock.mockReset()
    getPromptTemplateListMock.mockReset()
    updatePromptTemplateMock.mockReset()
  })

  it('loads template list and selected template detail', async () => {
    getPromptTemplateListMock.mockResolvedValue([
      {
        id: 'template-1',
        name: '意图识别模板',
        code: 'intent-recognition',
        content: '识别用户意图',
        type: PromptTemplateType.INTENT_RECOGNITION,
        description: '识别模板',
        variables: '{"message":"用户输入"}',
        active: true,
        version: '1.0.0',
        createdAt: '2026-03-01T10:00:00',
        updatedAt: '2026-03-02T10:00:00',
      },
    ])
    getPromptTemplateDetailMock.mockResolvedValue({
      id: 'template-1',
      name: '意图识别模板',
      code: 'intent-recognition',
      content: '识别用户意图',
      type: PromptTemplateType.INTENT_RECOGNITION,
      description: '识别模板',
      variables: '{"message":"用户输入"}',
      active: true,
      version: '1.0.0',
      createdAt: '2026-03-01T10:00:00',
      updatedAt: '2026-03-02T10:00:00',
    })

    const store = usePromptTemplateStore()
    await store.fetchPromptTemplateList()
    await store.fetchPromptTemplateDetail('template-1')

    expect(store.templateList).toHaveLength(1)
    expect(store.currentTemplate?.id).toBe('template-1')
  })

  it('clears stale template context when backend returns empty list', async () => {
    getPromptTemplateListMock.mockResolvedValue([])

    const store = usePromptTemplateStore()
    store.currentTemplateId = 'template-old'
    store.currentTemplate = {
      id: 'template-old',
      name: '旧模板',
      code: 'old-template',
      content: '旧内容',
      type: PromptTemplateType.RESULT_FEEDBACK,
      description: '旧描述',
      variables: null,
      active: false,
      version: '1.0.0',
      createdAt: '2026-03-01T10:00:00',
      updatedAt: '2026-03-02T10:00:00',
    }

    await store.fetchPromptTemplateList()

    expect(store.currentTemplateId).toBe('')
    expect(store.currentTemplate).toBeNull()
  })

  it('creates updates and deletes template while syncing current context', async () => {
    const store = usePromptTemplateStore()
    store.templateList = [
      {
        id: 'template-1',
        name: '意图识别模板',
        code: 'intent-recognition',
        content: '识别用户意图',
        type: PromptTemplateType.INTENT_RECOGNITION,
        description: '识别模板',
        variables: '{"message":"用户输入"}',
        active: true,
        version: '1.0.0',
        createdAt: '2026-03-01T10:00:00',
        updatedAt: '2026-03-02T10:00:00',
      },
    ]
    createPromptTemplateMock.mockResolvedValue({
      id: 'template-2',
      name: '结果反馈模板',
      code: 'result-feedback',
      content: '输出反馈结果',
      type: PromptTemplateType.RESULT_FEEDBACK,
      description: '结果反馈',
      variables: null,
      active: false,
      version: '1.0.0',
      createdAt: '2026-03-01T10:00:00',
      updatedAt: '2026-03-02T10:00:00',
    })
    updatePromptTemplateMock.mockResolvedValue({
      id: 'template-2',
      name: '结果反馈模板-已更新',
      code: 'result-feedback',
      content: '输出反馈结果',
      type: PromptTemplateType.RESULT_FEEDBACK,
      description: '结果反馈',
      variables: null,
      active: false,
      version: '1.0.1',
      createdAt: '2026-03-01T10:00:00',
      updatedAt: '2026-03-03T10:00:00',
    })
    deletePromptTemplateMock.mockResolvedValue(undefined)

    await store.createPromptTemplate({
      name: '结果反馈模板',
      code: 'result-feedback',
      content: '输出反馈结果',
      type: PromptTemplateType.RESULT_FEEDBACK,
      description: '结果反馈',
      variables: null,
      active: false,
      version: '1.0.0',
    })
    await store.updatePromptTemplate('template-2', {
      name: '结果反馈模板-已更新',
      code: 'result-feedback',
      content: '输出反馈结果',
      type: PromptTemplateType.RESULT_FEEDBACK,
      description: '结果反馈',
      variables: null,
      active: false,
      version: '1.0.1',
    })
    await store.deletePromptTemplate('template-2')

    expect(store.templateList).toHaveLength(1)
    expect(store.currentTemplate).toBeNull()
  })
})
