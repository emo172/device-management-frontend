import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

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

describe('common business helpers', () => {
  it('SearchBar 支持关键字输入、查询与重置', async () => {
    const { module, error } = await loadComponent('SearchBar')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        modelValue: '示波器',
        placeholder: '按分类名称搜索',
      },
      global: {
        stubs: {
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElInput: {
            props: ['modelValue', 'placeholder'],
            emits: ['update:modelValue'],
            template:
              '<div><input class="search-input" :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
          },
        },
      },
    })

    await wrapper.get('.search-input').setValue('传感器')
    await wrapper.get('.search-bar__submit').trigger('click')
    await wrapper.get('.search-bar__reset').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['传感器'], ['']])
    expect(wrapper.emitted('search')).toEqual([['示波器']])
    expect(wrapper.emitted('reset')).toEqual([[]])
  })

  it('ConfirmDialog 取消时关闭弹窗，确认时仅上抛确认事件等待父层处理', async () => {
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
      },
      global: {
        stubs: {
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElDialog: {
            props: ['modelValue', 'title'],
            emits: ['update:modelValue', 'close'],
            template:
              '<section><header>{{ title }}</header><slot /><slot name="footer" /></section>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('删除后不可恢复')

    await wrapper.get('.confirm-dialog__cancel').trigger('click')
    await wrapper.get('.confirm-dialog__confirm').trigger('click')

    expect(wrapper.emitted('cancel')).toEqual([[]])
    expect(wrapper.emitted('confirm')).toEqual([[]])
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
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
        stubs: {
          ElButton: {
            emits: ['click'],
            template: '<button class="empty-action" @click="$emit(\'click\')"><slot /></button>',
          },
          ElEmpty: {
            template: '<div><slot name="image" /><slot name="description" /></div>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('暂无设备')
    expect(wrapper.text()).toContain('请调整筛选条件后重试')

    await wrapper.get('.empty-action').trigger('click')

    expect(wrapper.emitted('action')).toEqual([[]])
  })
})
