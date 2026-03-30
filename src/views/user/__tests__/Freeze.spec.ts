import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const userViewModules = import.meta.glob('../*.vue')
const freezeUserMock = vi.fn()

const layoutStubs = {
  ConsoleDetailLayout: {
    template:
      '<div class="console-detail-layout"><div class="console-detail-layout__main"><slot name="main" /></div><aside class="console-detail-layout__aside"><slot name="aside" /></aside></div>',
  },
  ConsoleAsidePanel: {
    template: '<section class="console-aside-panel"><slot /></section>',
  },
  ConsoleFeedbackSurface: {
    template: '<section class="console-feedback-surface"><slot /></section>',
  },
}

const appSelectStub = {
  name: 'AppSelect',
  props: ['modelValue', 'disabled'],
  emits: ['update:modelValue'],
  template:
    '<div class="app-select-stub"><div data-testid="freeze-status-value">{{ modelValue }}</div><select class="app-select-stub__control" :value="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select></div>',
}

const elOptionStub = {
  props: ['label', 'value'],
  template: '<option :value="value">{{ label }}</option>',
}

function readUserViewSource(fileName: string) {
  return readFileSync(resolve(process.cwd(), `src/views/user/${fileName}`), 'utf-8')
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void

  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve
  })

  return { promise, resolve }
}

vi.mock('@/stores/modules/user', () => ({
  useUserStore: () => ({
    freezeUser: freezeUserMock,
  }),
}))

describe('user freeze dialog', () => {
  beforeEach(() => {
    freezeUserMock.mockReset()
  })

  it('冻结弹窗改为通过 AppSelect 收口状态选择器，不再直接消费 el-select', () => {
    const source = readUserViewSource('Freeze.vue')

    // 冻结弹窗已经纳入统一下拉迁移范围，源码必须直接依赖 AppSelect，避免页面继续绑定局部 select 壳层细节。
    expect(source).toContain("import AppSelect from '@/components/common/dropdown/AppSelect.vue'")
    expect(source).toContain('<AppSelect')
    expect(source).not.toContain('<el-select')
  })

  it('defaults restricted user to restricted handling instead of collapsing into frozen', async () => {
    const loader = userViewModules['../Freeze.vue']

    expect(loader).toBeTypeOf('function')

    if (!loader) {
      return
    }

    const module = (await loader()) as { default: object }

    const wrapper = mount(module.default, {
      props: {
        modelValue: true,
        user: {
          id: 'user-1',
          username: 'zhangsan',
          freezeStatus: 'RESTRICTED',
        },
      },
      global: {
        stubs: {
          ...layoutStubs,
          ElDialog: { template: '<div><slot /><slot name="footer" /></div>' },
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          AppSelect: appSelectStub,
          ElOption: elOptionStub,
          ElInput: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<textarea />',
          },
          ElButton: { template: '<button><slot /></button>' },
        },
      },
    })

    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
    expect(wrapper.get('[data-testid="freeze-status-value"]').text()).toBe('RESTRICTED')
  })

  it('defaults normal user to frozen handling when opening freeze dialog', async () => {
    const loader = userViewModules['../Freeze.vue']

    expect(loader).toBeTypeOf('function')

    if (!loader) {
      return
    }

    const module = (await loader()) as { default: object }

    const wrapper = mount(module.default, {
      props: {
        modelValue: true,
        user: {
          id: 'user-2',
          username: 'lisi',
          freezeStatus: 'NORMAL',
        },
      },
      global: {
        stubs: {
          ...layoutStubs,
          ElDialog: { template: '<div><slot /><slot name="footer" /></div>' },
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          AppSelect: appSelectStub,
          ElOption: elOptionStub,
          ElInput: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<textarea />',
          },
          ElButton: { template: '<button><slot /></button>' },
        },
      },
    })

    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
    expect(wrapper.get('[data-testid="freeze-status-value"]').text()).toBe('FROZEN')
  })

  it('提交冻结请求期间会锁定确认按钮，避免重复提交相同操作', async () => {
    const loader = userViewModules['../Freeze.vue']

    expect(loader).toBeTypeOf('function')

    if (!loader) {
      return
    }

    const submitDeferred = createDeferred<void>()
    freezeUserMock.mockReturnValueOnce(submitDeferred.promise)

    const module = (await loader()) as { default: object }

    const wrapper = mount(module.default, {
      props: {
        modelValue: true,
        user: {
          id: 'user-3',
          username: 'wangwu',
          freezeStatus: 'NORMAL',
        },
      },
      global: {
        stubs: {
          ...layoutStubs,
          ElDialog: { template: '<div><slot /><slot name="footer" /></div>' },
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          AppSelect: appSelectStub,
          ElOption: elOptionStub,
          ElInput: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<textarea data-testid="freeze-reason" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          ElButton: {
            props: ['disabled'],
            emits: ['click'],
            template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    await wrapper.get('[data-testid="freeze-reason"]').setValue('违规占用设备')

    const actionButtons = wrapper.findAll('button')

    expect(actionButtons[1]).toBeDefined()
    await actionButtons[1]!.trigger('click')

    expect(freezeUserMock).toHaveBeenCalledTimes(1)
    expect((actionButtons[1]!.element as HTMLButtonElement).disabled).toBe(true)

    await actionButtons[1]!.trigger('click')
    expect(freezeUserMock).toHaveBeenCalledTimes(1)

    submitDeferred.resolve()
    await flushPromises()
  })

  it('切换目标状态后会同步更新解冻文案并提交新的冻结状态载荷', async () => {
    const loader = userViewModules['../Freeze.vue']

    expect(loader).toBeTypeOf('function')

    if (!loader) {
      return
    }

    freezeUserMock.mockResolvedValueOnce(undefined)

    const module = (await loader()) as { default: object }

    const wrapper = mount(module.default, {
      props: {
        modelValue: true,
        user: {
          id: 'user-4',
          username: 'zhaoliu',
          freezeStatus: 'NORMAL',
        },
      },
      global: {
        stubs: {
          ...layoutStubs,
          ElDialog: { template: '<div><slot /><slot name="footer" /></div>' },
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          AppSelect: appSelectStub,
          ElOption: elOptionStub,
          ElInput: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<textarea />',
          },
          ElButton: {
            props: ['disabled'],
            emits: ['click'],
            template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    expect(wrapper.get('[data-testid="freeze-status-value"]').text()).toBe('FROZEN')

    await wrapper.get('.app-select-stub__control').setValue('NORMAL')

    expect(wrapper.get('[data-testid="freeze-status-value"]').text()).toBe('NORMAL')
    expect(wrapper.text()).toContain('解冻账号')
    expect(wrapper.text()).toContain('恢复正常时原因可留空，仅在需要补充处理说明时填写。')

    const actionButtons = wrapper.findAll('button')

    expect(actionButtons[1]).toBeDefined()
    await actionButtons[1]!.trigger('click')
    await flushPromises()

    expect(freezeUserMock).toHaveBeenCalledWith('user-4', {
      freezeStatus: 'NORMAL',
      reason: undefined,
    })
  })

  it('冻结弹窗源码改为消费主题 token，避免表单面板和冻结提示在深色下残留浅色硬编码', () => {
    const source = readUserViewSource('Freeze.vue')

    // 冻结弹窗承载高风险操作，必须直接锁定面板与提示区的主题 token，避免深色下出现浅色孤岛。
    expect(source).toContain('var(--app-surface-card)')
    expect(source).toContain('var(--app-tone-danger-text)')
    expect(source).toContain('var(--app-tone-danger-surface)')
    expect(source).toContain('var(--app-border-soft)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(source).not.toMatch(hardcodedColorPattern)
  })
})
