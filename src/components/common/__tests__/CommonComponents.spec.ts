import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { createAppPinia } from '@/stores'

const commonComponentModules = import.meta.glob('../*.vue')

async function loadComponent(componentName: string) {
  const loader = commonComponentModules[`../${componentName}.vue`]

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

function readComponentSource(componentName: string) {
  return readFileSync(resolve(process.cwd(), `src/components/common/${componentName}.vue`), 'utf-8')
}

function createMountGlobals(stubs: Record<string, object>) {
  return {
    plugins: [createAppPinia()],
    stubs,
  }
}

describe('common business helpers', () => {
  it('公共主题组件只消费语义 token，不保留浅色硬编码表面', () => {
    const emptyStateSource = readComponentSource('EmptyState')
    const searchBarSource = readComponentSource('SearchBar')

    expect(emptyStateSource).toContain('var(--app-border-soft)')
    expect(emptyStateSource).toContain('var(--app-surface-card-strong)')
    expect(emptyStateSource).not.toContain('var(--app-tone-info-surface)')
    expect(emptyStateSource).not.toContain('rgba(148, 163, 184, 0.4)')
    expect(emptyStateSource).not.toContain('rgba(255, 255, 255, 0.7)')

    expect(searchBarSource).toContain('var(--app-surface-card-strong)')
    expect(searchBarSource).toContain('var(--app-border-strong)')
    expect(searchBarSource).not.toContain('rgba(255, 255, 255, 0.94)')
  })

  it('SearchBar 默认承接统一筛选卡片语义，并保留默认标题文案', async () => {
    const { module, error } = await loadComponent('SearchBar')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        modelValue: '',
      },
      global: {
        ...createMountGlobals({
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElInput: {
            props: ['id', 'modelValue', 'placeholder'],
            emits: ['update:modelValue'],
            template:
              '<div><input class="search-input" :id="id" :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
          },
        }),
      },
    })

    expect(wrapper.find('.console-filter-panel').exists()).toBe(true)
    expect(wrapper.find('.console-toolbar-shell').exists()).toBe(false)
    expect(wrapper.text()).toContain('筛选与操作')
    expect(wrapper.text()).toContain('筛选条件')
    expect(wrapper.text()).toContain('调整条件后更新当前列表结果。')
    expect(wrapper.text()).toContain('查询')
    expect(wrapper.text()).toContain('重置')
  })

  it('SearchBar 为可视标签与输入建立显式关联', async () => {
    const { module, error } = await loadComponent('SearchBar')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        modelValue: '',
        label: '设备分类',
      },
      global: {
        ...createMountGlobals({
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElInput: {
            props: ['id', 'modelValue', 'placeholder'],
            emits: ['update:modelValue'],
            template:
              '<div><input class="search-input" :id="id" :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
          },
        }),
      },
    })

    const label = wrapper.get('.search-bar__label')
    const input = wrapper.get('.search-input')

    expect(label.element.tagName).toBe('LABEL')
    expect(input.attributes('id')).toBeTruthy()
    expect(label.attributes('for')).toBe(input.attributes('id'))
  })

  it('SearchBar 支持关键字输入、查询与重置', async () => {
    const { module, error } = await loadComponent('SearchBar')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const SearchBarHarness = defineComponent({
      components: {
        SearchBar: module.default,
      },
      setup() {
        const keyword = ref('示波器')
        const searchPayloads = ref<string[]>([])
        const resetCount = ref(0)

        // 用父层回写模拟真实 v-model 交互，避免测试继续依赖 props 不回流的理想化挂载方式。
        function handleSearch(value: string) {
          searchPayloads.value.push(value)
        }

        function handleReset() {
          resetCount.value += 1
        }

        return {
          handleReset,
          handleSearch,
          keyword,
          resetCount,
          searchPayloads,
        }
      },
      template: `
        <SearchBar
          v-model="keyword"
          placeholder="按分类名称搜索"
          @search="handleSearch"
          @reset="handleReset"
        />
      `,
    })

    const wrapper = mount(SearchBarHarness, {
      global: {
        ...createMountGlobals({
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElInput: {
            props: ['id', 'modelValue', 'placeholder'],
            emits: ['update:modelValue'],
            template:
              '<div><input class="search-input" :id="id" :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
          },
        }),
      },
    })

    await wrapper.get('.search-input').setValue('传感器')
    await wrapper.get('.search-bar__submit').trigger('click')
    await wrapper.get('.search-bar__reset').trigger('click')

    expect(wrapper.find('.console-filter-panel').exists()).toBe(true)
    expect(wrapper.find('.console-toolbar-shell').exists()).toBe(false)
    expect((wrapper.vm as { keyword: string }).keyword).toBe('')
    expect((wrapper.vm as { searchPayloads: string[] }).searchPayloads).toEqual(['传感器'])
    expect((wrapper.vm as { resetCount: number }).resetCount).toBe(1)
  })

  it('ConfirmDialog 取消时关闭弹窗，且 loading 态不会继续上抛确认事件', async () => {
    const { module, error } = await loadComponent('ConfirmDialog')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        modelValue: true,
        title: '确认删除',
        message: '删除后不可恢复',
        loading: true,
        confirmType: 'danger',
      },
      global: {
        ...createMountGlobals({
          ElButton: {
            props: ['loading', 'type'],
            emits: ['click'],
            template:
              "<button :data-loading=\"loading ? 'true' : 'false'\" :data-type=\"type || 'default'\" @click=\"$emit('click')\"><slot /></button>",
          },
          ElDialog: {
            props: ['modelValue', 'title'],
            emits: ['update:modelValue', 'close'],
            template:
              '<section><header>{{ title }}</header><slot /><slot name="footer" /></section>',
          },
        }),
      },
    })

    expect(wrapper.text()).toContain('删除后不可恢复')
    expect(wrapper.find('.confirm-dialog__surface').exists()).toBe(true)
    expect(wrapper.get('.confirm-dialog__confirm').attributes('data-loading')).toBe('true')
    expect(wrapper.get('.confirm-dialog__confirm').attributes('data-type')).toBe('danger')

    await wrapper.get('.confirm-dialog__cancel').trigger('click')
    await wrapper.get('.confirm-dialog__confirm').trigger('click')

    expect(wrapper.emitted('cancel')).toEqual([[]])
    expect(wrapper.emitted('confirm')).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('ConfirmDialog 非 loading 且未禁用时会正常上抛确认事件', async () => {
    const { module, error } = await loadComponent('ConfirmDialog')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        modelValue: true,
        title: '确认提交',
        message: '请确认当前操作',
        loading: false,
        confirmDisabled: false,
      },
      global: {
        ...createMountGlobals({
          ElButton: {
            props: ['loading', 'disabled', 'type'],
            emits: ['click'],
            template:
              "<button :data-loading=\"loading ? 'true' : 'false'\" :data-disabled=\"disabled ? 'true' : 'false'\" :disabled=\"disabled\" @click=\"$emit('click')\"><slot /></button>",
          },
          ElDialog: {
            props: ['modelValue', 'title'],
            emits: ['update:modelValue', 'close'],
            template: '<section><header>{{ title }}</header><slot /><slot name="footer" /></section>',
          },
        }),
      },
    })

    await wrapper.get('.confirm-dialog__confirm').trigger('click')

    expect(wrapper.emitted('confirm')).toEqual([[]])
  })

  it('ConfirmDialog 在 loading 或显式禁用时不会继续上抛确认事件', async () => {
    const { module, error } = await loadComponent('ConfirmDialog')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        modelValue: true,
        title: '确认提交',
        message: '请确认当前操作',
        loading: false,
        confirmDisabled: true,
      },
      global: {
        ...createMountGlobals({
          ElButton: {
            props: ['loading', 'disabled', 'type'],
            emits: ['click'],
            template:
              "<button :data-loading=\"loading ? 'true' : 'false'\" :data-disabled=\"disabled ? 'true' : 'false'\" :disabled=\"disabled\" @click=\"$emit('click')\"><slot /></button>",
          },
          ElDialog: {
            props: ['modelValue', 'title'],
            emits: ['update:modelValue', 'close'],
            template: '<section><header>{{ title }}</header><slot /><slot name="footer" /></section>',
          },
        }),
      },
    })

    await wrapper.get('.confirm-dialog__confirm').trigger('click')

    expect(wrapper.get('.confirm-dialog__confirm').attributes('data-disabled')).toBe('true')
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('EmptyState 支持展示说明与动作入口', async () => {
    const { module, error } = await loadComponent('EmptyState')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        title: '暂无设备',
        description: '请调整筛选条件后重试',
        actionText: '刷新列表',
      },
      global: {
        ...createMountGlobals({
          ElButton: {
            emits: ['click'],
            template: '<button class="empty-action" @click="$emit(\'click\')"><slot /></button>',
          },
          ElEmpty: {
            template: '<div><slot name="image" /><slot name="description" /></div>',
          },
        }),
      },
    })

    expect(wrapper.text()).toContain('暂无设备')
    expect(wrapper.text()).toContain('请调整筛选条件后重试')
    expect(wrapper.find('.empty-state__surface').exists()).toBe(true)

    await wrapper.get('.empty-action').trigger('click')

    expect(wrapper.emitted('action')).toEqual([[]])
  })
})
