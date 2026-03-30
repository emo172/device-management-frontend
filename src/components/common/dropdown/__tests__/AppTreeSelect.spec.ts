import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'

const treeSelectModules = import.meta.glob('../AppTreeSelect.vue')

async function loadAppTreeSelect() {
  const loader = treeSelectModules['../AppTreeSelect.vue']

  if (!loader) {
    return {
      component: null,
      error: new Error('AppTreeSelect.vue is missing'),
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

const treeSelectTestStubs = {
  ElTreeSelect: defineComponent({
    name: 'ElTreeSelect',
    props: [
      'modelValue',
      'data',
      'props',
      'nodeKey',
      'checkStrictly',
      'defaultExpandAll',
      'clearable',
      'placeholder',
      'disabled',
      'multiple',
    ],
    emits: ['update:modelValue', 'change', 'visible-change'],
    inheritAttrs: false,
    template: '<div class="el-tree-select-stub" v-bind="$attrs"><slot name="prefix" /></div>',
  }),
}

const TestLeadingIcon = defineComponent({
  name: 'TestLeadingIcon',
  template: '<svg class="test-leading-icon" aria-hidden="true" />',
})

describe('AppTreeSelect', () => {
  it('单选 clearable 清空后把空字符串和 undefined 归一为 null', async () => {
    const { component, error } = await loadAppTreeSelect()

    expect(error).toBeNull()
    expect(component).toBeTruthy()

    if (!component) {
      return
    }

    const handleModelValueUpdate = vi.fn()
    const wrapper = mount(component, {
      attrs: {
        'onUpdate:modelValue': handleModelValueUpdate,
      },
      props: {
        modelValue: 'parent-1',
        clearable: true,
      },
      global: {
        stubs: treeSelectTestStubs,
      },
    })

    const treeSelect = wrapper.getComponent({ name: 'ElTreeSelect' })

    treeSelect.vm.$emit('update:modelValue', '')
    treeSelect.vm.$emit('update:modelValue', undefined)

    expect(handleModelValueUpdate).toHaveBeenNthCalledWith(1, null)
    expect(handleModelValueUpdate).toHaveBeenNthCalledWith(2, null)
    expect(wrapper.emitted('update:modelValue')).toEqual([[null], [null]])
  })

  it('把 class/style 留在根节点，把 data aria attrs 透传给内部 tree select，并忽略 popper 私有入口', async () => {
    const { component, error } = await loadAppTreeSelect()

    expect(error).toBeNull()
    expect(component).toBeTruthy()

    if (!component) {
      return
    }

    const wrapper = mount(component, {
      attrs: {
        class: 'category-layout',
        style: 'width: 280px;',
        'data-testid': 'category-tree-select',
        'aria-label': '分类树筛选',
        'popper-class': 'private-popper',
        popperClass: 'private-popper-camel',
      },
      props: {
        modelValue: 'parent-1',
      },
      global: {
        stubs: treeSelectTestStubs,
      },
    })

    expect(wrapper.classes()).toContain('category-layout')
    expect(wrapper.attributes('style')).toContain('width: 280px')
    expect(wrapper.attributes('data-testid')).toBeUndefined()
    expect(wrapper.attributes('aria-label')).toBeUndefined()

    const treeSelect = wrapper.getComponent({ name: 'ElTreeSelect' })

    expect(treeSelect.classes()).not.toContain('category-layout')
    expect(treeSelect.attributes('style')).toBeUndefined()
    expect(treeSelect.attributes('data-testid')).toBe('category-tree-select')
    expect(treeSelect.attributes('aria-label')).toBe('分类树筛选')
    expect(treeSelect.attributes('popper-class')).toBeUndefined()
    expect(treeSelect.attributes('popperClass')).toBeUndefined()
  })

  it('透传 tree select 能力 props，并转发 change 与 visible-change', async () => {
    const { component, error } = await loadAppTreeSelect()

    expect(error).toBeNull()
    expect(component).toBeTruthy()

    if (!component) {
      return
    }

    const handleChange = vi.fn()
    const handleVisibleChange = vi.fn()
    const treeProps = {
      label: 'label',
      value: 'id',
      children: 'children',
    }
    const treeData = [{ id: 'parent-1', label: '父级分类' }]
    const wrapper = mount(component, {
      attrs: {
        onChange: handleChange,
        onVisibleChange: handleVisibleChange,
      },
      props: {
        modelValue: 'parent-1',
        data: treeData,
        props: treeProps,
        nodeKey: 'id',
        checkStrictly: true,
        defaultExpandAll: true,
        clearable: true,
        placeholder: '请选择父级分类',
      },
      global: {
        stubs: treeSelectTestStubs,
      },
    })

    expect(wrapper.find('.app-tree-select__prefix').exists()).toBe(false)

    const treeSelect = wrapper.getComponent({ name: 'ElTreeSelect' })

    expect(treeSelect.props('data')).toEqual(treeData)
    expect(treeSelect.props('props')).toEqual(treeProps)
    expect(treeSelect.props('nodeKey')).toBe('id')
    expect(treeSelect.props('checkStrictly')).toBe(true)
    expect(treeSelect.props('defaultExpandAll')).toBe(true)
    expect(treeSelect.props('clearable')).toBe(true)
    expect(treeSelect.props('placeholder')).toBe('请选择父级分类')

    treeSelect.vm.$emit('change', 'parent-2')
    treeSelect.vm.$emit('visible-change', true)

    expect(handleChange).toHaveBeenCalledWith('parent-2')
    expect(handleVisibleChange).toHaveBeenCalledWith(true)
    expect(wrapper.emitted('change')).toEqual([['parent-2']])
    expect(wrapper.emitted('visible-change')).toEqual([[true]])
  })

  it('多值 clearable payload 保持原始数组语义', async () => {
    const { component, error } = await loadAppTreeSelect()

    expect(error).toBeNull()
    expect(component).toBeTruthy()

    if (!component) {
      return
    }

    const handleModelValueUpdate = vi.fn()
    const wrapper = mount(component, {
      attrs: {
        'onUpdate:modelValue': handleModelValueUpdate,
      },
      props: {
        modelValue: ['parent-1', 'child-1'],
        multiple: true,
        clearable: true,
      },
      global: {
        stubs: treeSelectTestStubs,
      },
    })

    wrapper.getComponent({ name: 'ElTreeSelect' }).vm.$emit('update:modelValue', [])

    expect(handleModelValueUpdate).toHaveBeenCalledWith([])
    expect(wrapper.emitted('update:modelValue')).toEqual([[[]]])
  })

  it('提供 leadingIcon 时渲染前置区域和图标本体', async () => {
    const { component, error } = await loadAppTreeSelect()

    expect(error).toBeNull()
    expect(component).toBeTruthy()

    if (!component) {
      return
    }

    const wrapper = mount(component, {
      props: {
        modelValue: null,
        leadingIcon: TestLeadingIcon,
      },
      global: {
        stubs: treeSelectTestStubs,
      },
    })

    expect(wrapper.find('.app-tree-select__prefix').exists()).toBe(true)
    expect(wrapper.find('.test-leading-icon').exists()).toBe(true)
  })

  it('提供 prefix 插槽时也渲染前置区域，并覆盖默认图标', async () => {
    const { component, error } = await loadAppTreeSelect()

    expect(error).toBeNull()
    expect(component).toBeTruthy()

    if (!component) {
      return
    }

    const wrapper = mount(component, {
      props: {
        modelValue: null,
        leadingIcon: TestLeadingIcon,
      },
      slots: {
        prefix: '<span class="custom-prefix">分</span>',
      },
      global: {
        stubs: treeSelectTestStubs,
      },
    })

    expect(wrapper.find('.app-tree-select__prefix').exists()).toBe(true)
    expect(wrapper.find('.custom-prefix').exists()).toBe(true)
    expect(wrapper.find('.test-leading-icon').exists()).toBe(false)
  })

  it('源码契约只保留统一触发器样式与 prefix 插槽，不开放默认 slot 或私有 node class', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/common/dropdown/AppTreeSelect.vue'),
      'utf-8',
    )

    expect(source).toContain('.app-tree-select :deep(.el-select__wrapper)')
    expect(source).toContain('.app-tree-select :deep(.el-select__placeholder)')
    expect(source).toContain('.app-tree-select :deep(.el-select__selected-item)')
    expect(source).toContain('.app-tree-select :deep(.el-select__tags)')
    expect(source).toContain('.app-tree-select__prefix')
    expect(source).toContain('#prefix')
    expect(source).not.toContain('<slot />')
    expect(source).not.toContain('app-tree-select__node')
  })
})
