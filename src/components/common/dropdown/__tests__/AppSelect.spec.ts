import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'

const selectModules = import.meta.glob('../AppSelect.vue')

async function loadAppSelect() {
  const loader = selectModules['../AppSelect.vue']

  if (!loader) {
    return {
      component: null,
      error: new Error('AppSelect.vue is missing'),
    }
  }

  try {
    const module = (await loader()) as { default: object }

    return {
      component: module.default,
      error: null,
    }
  } catch (error) {
    return {
      component: null,
      error,
    }
  }
}

const selectTestStubs = {
  ElSelect: defineComponent({
    name: 'ElSelect',
    props: ['modelValue', 'disabled', 'placeholder'],
    emits: ['update:modelValue', 'change', 'visible-change'],
    inheritAttrs: false,
    template:
      '<div class="el-select-stub" v-bind="$attrs"><slot name="prefix" /><slot /></div>',
  }),
}

const TestLeadingIcon = defineComponent({
  name: 'TestLeadingIcon',
  template: '<svg class="test-leading-icon" aria-hidden="true" />',
})

describe('AppSelect', () => {
  it('单选 clearable 清空后保持原始空字符串透传', async () => {
    const { component, error } = await loadAppSelect()

    expect(error).toBeNull()
    expect(component).toBeTruthy()

    if (!component) {
      return
    }

    const wrapper = mount(component, {
      props: {
        modelValue: 'OVERDUE_WARNING',
        clearable: true,
      },
      global: {
        stubs: selectTestStubs,
      },
    })

    wrapper.getComponent({ name: 'ElSelect' }).vm.$emit('update:modelValue', '')
    expect(wrapper.emitted('update:modelValue')).toEqual([['']])
  })

  it('把布局 attrs 留在根节点，并忽略私有 popper 覆盖', async () => {
    const { component, error } = await loadAppSelect()

    expect(error).toBeNull()
    expect(component).toBeTruthy()

    if (!component) {
      return
    }

    const wrapper = mount(component, {
      attrs: {
        class: 'filter-layout',
        style: 'width: 240px;',
        id: 'notification-filter-id',
        title: '通知类型过滤',
        'data-testid': 'notification-filter',
        'aria-label': '通知类型筛选',
        'popper-class': 'private-popper',
        popperClass: 'private-popper-camel',
      },
      props: {
        modelValue: 'OVERDUE_WARNING',
      },
      global: {
        stubs: selectTestStubs,
      },
    })

    expect(wrapper.classes()).toContain('filter-layout')
    expect(wrapper.attributes('style')).toContain('width: 240px')
    expect(wrapper.attributes('id')).toBeUndefined()
    expect(wrapper.attributes('title')).toBeUndefined()
    expect(wrapper.attributes('data-testid')).toBeUndefined()
    expect(wrapper.attributes('aria-label')).toBeUndefined()

    const select = wrapper.getComponent({ name: 'ElSelect' })
    expect(select.classes()).not.toContain('filter-layout')
    expect(select.attributes('style')).toBeUndefined()
    expect(select.attributes('id')).toBe('notification-filter-id')
    expect(select.attributes('title')).toBe('通知类型过滤')
    expect(select.attributes('data-testid')).toBe('notification-filter')
    expect(select.attributes('aria-label')).toBe('通知类型筛选')
    expect(select.attributes('popper-class')).toBeUndefined()
    expect(select.attributes('popperClass')).toBeUndefined()
  })

  it('转发 change 和 visible-change 事件，且无前缀时不保留占位', async () => {
    const { component, error } = await loadAppSelect()

    expect(error).toBeNull()
    expect(component).toBeTruthy()

    if (!component) {
      return
    }

    const handleChange = vi.fn()
    const handleVisibleChange = vi.fn()
    const wrapper = mount(component, {
      attrs: {
        onChange: handleChange,
        onVisibleChange: handleVisibleChange,
      },
      props: {
        modelValue: '',
      },
      global: {
        stubs: selectTestStubs,
      },
    })

    expect(wrapper.find('.app-select__prefix').exists()).toBe(false)

    const select = wrapper.getComponent({ name: 'ElSelect' })
    select.vm.$emit('change', 'OVERDUE_WARNING')
    select.vm.$emit('visible-change', true)

    expect(handleChange).toHaveBeenCalledWith('OVERDUE_WARNING')
    expect(handleVisibleChange).toHaveBeenCalledWith(true)
    expect(wrapper.emitted('change')).toEqual([['OVERDUE_WARNING']])
    expect(wrapper.emitted('visible-change')).toEqual([[true]])
  })

  it('多值 payload 保持原样透传', async () => {
    const { component, error } = await loadAppSelect()

    expect(error).toBeNull()
    expect(component).toBeTruthy()

    if (!component) {
      return
    }

    const wrapper = mount(component, {
      props: {
        modelValue: ['DEVICE_ONLY', 'DEVICE_AND_SYSTEM'],
      },
      global: {
        stubs: selectTestStubs,
      },
    })

    wrapper.getComponent({ name: 'ElSelect' }).vm.$emit('update:modelValue', ['DEVICE_ONLY'])
    expect(wrapper.emitted('update:modelValue')).toEqual([[['DEVICE_ONLY']]])
  })

  it('提供 leadingIcon 时渲染前置区域和图标本体', async () => {
    const { component, error } = await loadAppSelect()

    expect(error).toBeNull()
    expect(component).toBeTruthy()

    if (!component) {
      return
    }

    const wrapper = mount(component, {
      props: {
        modelValue: '',
        leadingIcon: TestLeadingIcon,
      },
      global: {
        stubs: selectTestStubs,
      },
    })

    expect(wrapper.find('.app-select__prefix').exists()).toBe(true)
    expect(wrapper.find('.test-leading-icon').exists()).toBe(true)
  })

  it('提供 prefix 插槽时也渲染前置区域', async () => {
    const { component, error } = await loadAppSelect()

    expect(error).toBeNull()
    expect(component).toBeTruthy()

    if (!component) {
      return
    }

    const wrapper = mount(component, {
      props: {
        modelValue: '',
      },
      slots: {
        prefix: '<span class="custom-prefix">筛</span>',
      },
      global: {
        stubs: selectTestStubs,
      },
    })

    expect(wrapper.find('.app-select__prefix').exists()).toBe(true)
    expect(wrapper.find('.custom-prefix').exists()).toBe(true)
  })

  it('同时提供 leadingIcon 和 prefix 插槽时由插槽覆盖默认图标', async () => {
    const { component, error } = await loadAppSelect()

    expect(error).toBeNull()
    expect(component).toBeTruthy()

    if (!component) {
      return
    }

    const wrapper = mount(component, {
      props: {
        modelValue: '',
        leadingIcon: TestLeadingIcon,
      },
      slots: {
        prefix: '<span class="custom-prefix-override">筛</span>',
      },
      global: {
        stubs: selectTestStubs,
      },
    })

    expect(wrapper.find('.app-select__prefix').exists()).toBe(true)
    expect(wrapper.find('.custom-prefix-override').exists()).toBe(true)
    expect(wrapper.find('.test-leading-icon').exists()).toBe(false)
  })

  it('源码契约只依赖 element-plus 运行时类，不新增私有 option class', async () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/common/dropdown/AppSelect.vue'),
      'utf-8',
    )

    expect(source).not.toContain('app-select__option')
    expect(source).toContain('.app-select :deep(.el-select__wrapper)')
    expect(source).toContain('.app-select :deep(.el-select__placeholder)')
    expect(source).toContain('.app-select :deep(.el-select__selected-item)')
    expect(source).toContain('.app-select :deep(.el-select__tags)')
    expect(source).toContain('.app-select__prefix')
  })
})
