import { flushPromises, mount } from '@vue/test-utils'
import { setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PromptTemplateType } from '@/enums/PromptTemplateType'
import { UserRole } from '@/enums/UserRole'
import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { usePromptTemplateStore } from '@/stores/modules/promptTemplate'

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

const successMock = vi.fn()
const warningMock = vi.fn()
const adminViewModules = import.meta.glob('../*.vue')

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void

  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve
  })

  return { promise, resolve }
}

vi.mock('@/api/prompt-templates', () => ({
  createPromptTemplate: createPromptTemplateMock,
  deletePromptTemplate: deletePromptTemplateMock,
  getPromptTemplateDetail: getPromptTemplateDetailMock,
  getPromptTemplateList: getPromptTemplateListMock,
  updatePromptTemplate: updatePromptTemplateMock,
}))

vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal<typeof import('element-plus')>()

  return {
    ...actual,
    ElMessage: {
      success: successMock,
      warning: warningMock,
    },
  }
})

async function loadView(componentName: string) {
  const loader = adminViewModules[`../${componentName}.vue`]

  if (!loader) {
    return {
      module: null,
      error: new Error(`${componentName}.vue is missing`),
    }
  }

  try {
    return {
      module: (await loader()) as { default: object },
      error: null,
    }
  } catch (error) {
    return {
      module: null,
      error,
    }
  }
}

describe('PromptTemplate view', () => {
  beforeEach(() => {
    createPromptTemplateMock.mockReset()
    deletePromptTemplateMock.mockReset()
    getPromptTemplateDetailMock.mockReset()
    getPromptTemplateListMock.mockReset()
    updatePromptTemplateMock.mockReset()
    successMock.mockReset()
    warningMock.mockReset()
    setActivePinia(createAppPinia())
  })

  it('系统管理员可查看模板列表、切换详情、保存编辑并删除停用模板', async () => {
    const { module, error } = await loadView('PromptTemplate')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'system-admin@example.com',
      phone: '13800138000',
      realName: '系统管理员',
      role: UserRole.SYSTEM_ADMIN,
      userId: 'system-admin-1',
      username: 'system-admin',
    })

    const templateList = [
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
      {
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
      },
    ]

    getPromptTemplateListMock.mockResolvedValue(templateList)
    getPromptTemplateDetailMock.mockImplementation(async (templateId: string) => {
      const template = templateList.find((item) => item.id === templateId)

      if (!template) {
        throw new Error('template not found')
      }

      return { ...template }
    })
    updatePromptTemplateMock.mockImplementation(async (templateId: string, payload) => ({
      ...templateList[1],
      ...payload,
      id: templateId,
      updatedAt: '2026-03-03T10:00:00',
      createdAt: '2026-03-01T10:00:00',
    }))
    deletePromptTemplateMock.mockResolvedValue(undefined)

    const wrapper = mount(module.default)

    await flushPromises()

    expect(getPromptTemplateListMock).toHaveBeenCalled()
    expect(getPromptTemplateDetailMock).toHaveBeenCalledWith('template-1')
    expect(wrapper.find('.console-table-section').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('Prompt 模板管理')

    await wrapper.get('[data-testid="prompt-template-card-template-2"]').trigger('click')
    await flushPromises()

    expect(getPromptTemplateDetailMock).toHaveBeenLastCalledWith('template-2')

    await wrapper.get('[data-testid="template-name"]').setValue('结果反馈模板-更新版')
    await wrapper.get('[data-testid="template-version"]').setValue('1.0.1')
    await wrapper.get('[data-testid="save-template"]').trigger('click')
    await flushPromises()

    expect(updatePromptTemplateMock).toHaveBeenCalledWith(
      'template-2',
      expect.objectContaining({
        name: '结果反馈模板-更新版',
        version: '1.0.1',
      }),
    )
    expect(successMock).toHaveBeenCalledWith('模板已保存')

    await wrapper.get('[data-testid="delete-template"]').trigger('click')
    await flushPromises()

    expect(deletePromptTemplateMock).toHaveBeenCalledWith('template-2')
  }, 30000)

  it('列表为空时会清空旧模板上下文，避免继续编辑过期数据', async () => {
    const { module, error } = await loadView('PromptTemplate')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const promptTemplateStore = usePromptTemplateStore()
    promptTemplateStore.currentTemplateId = 'template-old'
    promptTemplateStore.currentTemplate = {
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
    getPromptTemplateListMock.mockResolvedValue([])

    const wrapper = mount(module.default)
    await flushPromises()

    expect(promptTemplateStore.currentTemplateId).toBe('')
    expect(promptTemplateStore.currentTemplate).toBeNull()
    expect((wrapper.get('[data-testid="template-name"]').element as HTMLInputElement).value).toBe(
      '',
    )
  })

  it('详情加载中会禁用保存按钮，避免把旧表单误写到新模板', async () => {
    const { module, error } = await loadView('PromptTemplate')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const detailDeferred = createDeferred<{
      id: string
      name: string
      code: string
      content: string
      type: PromptTemplateType
      description: string
      variables: string
      active: boolean
      version: string
      createdAt: string
      updatedAt: string
    }>()

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
    getPromptTemplateDetailMock.mockReturnValue(detailDeferred.promise)

    const wrapper = mount(module.default)
    await flushPromises()

    expect(
      (wrapper.get('[data-testid="save-template"]').element as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(
      (wrapper.get('[data-testid="new-template"]').element as HTMLButtonElement).disabled,
    ).toBe(true)

    detailDeferred.resolve({
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
    await flushPromises()

    expect(
      (wrapper.get('[data-testid="save-template"]').element as HTMLButtonElement).disabled,
    ).toBe(false)
  })

  it('模板详情加载失败时会锁定保存按钮，避免空表单覆盖已有模板', async () => {
    const { module, error } = await loadView('PromptTemplate')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

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
      {
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
      },
    ])
    getPromptTemplateDetailMock
      .mockResolvedValueOnce({
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
      .mockRejectedValueOnce(new Error('detail failed'))

    const wrapper = mount(module.default)
    await flushPromises()

    await wrapper.get('[data-testid="prompt-template-card-template-2"]').trigger('click')
    await flushPromises()

    expect(
      (wrapper.get('[data-testid="save-template"]').element as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(wrapper.text()).toContain('模板详情加载失败')
  })

  it('重新进入页面且模板列表加载失败时，会先清空旧模板上下文避免误编辑旧数据', async () => {
    const { module, error } = await loadView('PromptTemplate')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const promptTemplateStore = usePromptTemplateStore()
    promptTemplateStore.currentTemplateId = 'template-old'
    promptTemplateStore.currentTemplate = {
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
    getPromptTemplateListMock.mockRejectedValueOnce(new Error('list failed'))

    mount(module.default)
    await flushPromises()

    expect(promptTemplateStore.currentTemplateId).toBe('')
    expect(promptTemplateStore.currentTemplate).toBeNull()
  })
})
