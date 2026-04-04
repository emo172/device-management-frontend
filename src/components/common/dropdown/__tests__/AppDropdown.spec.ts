import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { Bell } from '@element-plus/icons-vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const dropdownModules = import.meta.glob('../AppDropdown.vue')

async function loadAppDropdown() {
  const loader = dropdownModules['../AppDropdown.vue']

  if (!loader) {
    return {
      component: null,
      error: new Error('AppDropdown.vue is missing'),
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

const dropdownTestStubs = {
  ElDropdown: {
    name: 'ElDropdown',
    props: ['disabled', 'trigger', 'placement', 'teleported'],
    emits: ['visible-change'],
    template: '<div><slot /><slot name="dropdown" /></div>',
  },
  ElDropdownMenu: {
    name: 'ElDropdownMenu',
    template: '<div><slot /></div>',
  },
  ElDropdownItem: {
    name: 'ElDropdownItem',
    props: ['disabled', 'divided'],
    emits: ['click'],
    inheritAttrs: false,
    template:
      '<button class="el-dropdown-item-stub" :class="$attrs.class" :data-testid="$attrs[\'data-testid\']" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  },
}

describe('AppDropdown', () => {
  it('把 active 和 danger 状态映射到外层下拉菜单项', async () => {
    const { component, error } = await loadAppDropdown()

    expect(error).toBeNull()
    expect(component).toBeTruthy()

    if (!component) {
      return
    }

    const wrapper = mount(component, {
      props: {
        teleported: false,
        items: [
          { key: 'system', label: '跟随系统', active: true },
          { key: 'logout', label: '退出登录', danger: true },
        ],
      },
      global: {
        stubs: dropdownTestStubs,
      },
    })

    expect(wrapper.find('.app-dropdown__item--active').exists()).toBe(true)
    expect(wrapper.find('.app-dropdown__item--danger').exists()).toBe(true)
  })

  it('把共享菜单项稳定为 icon 列、label 列、meta 列三段式合同', async () => {
    const { component, error } = await loadAppDropdown()

    expect(error).toBeNull()
    expect(component).toBeTruthy()

    if (!component) {
      return
    }

    const wrapper = mount(component, {
      attachTo: document.body,
      props: {
        teleported: false,
        items: [
          {
            key: 'system',
            label: '跟随系统',
            icon: Bell,
            meta: '当前',
            testId: 'theme-option-system',
          },
          {
            key: 'logout',
            label: '退出登录',
            danger: true,
            testId: 'user-menu-logout',
          },
        ],
      },
      global: {
        stubs: dropdownTestStubs,
      },
    })

    const firstItemContent = wrapper.get(
      '[data-testid="theme-option-system"] .app-dropdown__content',
    )
    const secondItemContent = wrapper.get('[data-testid="user-menu-logout"] .app-dropdown__content')

    expect(
      firstItemContent
        .findAll('.app-dropdown__icon, .app-dropdown__label, .app-dropdown__meta')
        .map((segment) => segment.classes()[0]),
    ).toEqual(['app-dropdown__icon', 'app-dropdown__label', 'app-dropdown__meta'])
    expect(
      secondItemContent
        .findAll('.app-dropdown__icon, .app-dropdown__label, .app-dropdown__meta')
        .map((segment) => segment.classes()[0]),
    ).toEqual(['app-dropdown__label'])

    const firstItemContentStyle = window.getComputedStyle(firstItemContent.element as HTMLElement)
    const firstItemIconStyle = window.getComputedStyle(
      firstItemContent.get('.app-dropdown__icon').element as HTMLElement,
    )
    const firstItemLabelStyle = window.getComputedStyle(
      firstItemContent.get('.app-dropdown__label').element as HTMLElement,
    )
    const firstItemMetaStyle = window.getComputedStyle(
      firstItemContent.get('.app-dropdown__meta').element as HTMLElement,
    )

    expect(firstItemContentStyle.display).toBe('grid')
    expect(firstItemContentStyle.gridTemplateColumns).not.toBe('none')
    expect(firstItemIconStyle.justifyContent).toBe('center')
    expect(firstItemLabelStyle.minWidth).toBe('0px')
    expect(firstItemMetaStyle.justifyContent).toBe('flex-end')
    expect(firstItemMetaStyle.textAlign).toBe('right')

    wrapper.unmount()
  })

  it('当 active 与 danger 同时存在时由 danger 优先', async () => {
    const { component, error } = await loadAppDropdown()

    expect(error).toBeNull()
    expect(component).toBeTruthy()

    if (!component) {
      return
    }

    const wrapper = mount(component, {
      props: {
        teleported: false,
        items: [{ key: 'logout', label: '退出登录', active: true, danger: true }],
      },
      global: {
        stubs: dropdownTestStubs,
      },
    })

    expect(wrapper.find('.app-dropdown__item--danger').exists()).toBe(true)
    expect(wrapper.find('.app-dropdown__item--active').exists()).toBe(false)
  })

  it('使用 button 触发器并把布局 attrs 与 DOM attrs 分流', async () => {
    const { component, error } = await loadAppDropdown()

    expect(error).toBeNull()
    expect(component).toBeTruthy()

    if (!component) {
      return
    }

    const handleTriggerClick = vi.fn()
    const wrapper = mount(component, {
      attrs: {
        class: 'header-layout-slot',
        style: 'width: 160px;',
        id: 'theme-trigger-id',
        title: '主题切换入口',
        tabindex: '0',
        name: 'theme-switcher',
        autofocus: '',
        'data-testid': 'theme-trigger',
        'aria-label': '主题切换',
        onClick: handleTriggerClick,
      },
      props: {
        items: [{ key: 'light', label: '浅色' }],
      },
      global: {
        stubs: dropdownTestStubs,
      },
    })

    expect(wrapper.classes()).toContain('header-layout-slot')
    expect(wrapper.attributes('style')).toContain('width: 160px')
    expect(wrapper.attributes('id')).toBeUndefined()
    expect(wrapper.attributes('title')).toBeUndefined()
    expect(wrapper.attributes('tabindex')).toBeUndefined()
    expect(wrapper.attributes('name')).toBeUndefined()
    expect(wrapper.attributes('autofocus')).toBeUndefined()
    expect(wrapper.attributes('data-testid')).toBeUndefined()
    expect(wrapper.attributes('aria-label')).toBeUndefined()

    const trigger = wrapper.get('.app-dropdown__trigger')
    expect(trigger.element.tagName).toBe('BUTTON')
    expect(trigger.classes()).not.toContain('header-layout-slot')
    expect(trigger.attributes('style')).toBeUndefined()
    expect(trigger.attributes('id')).toBe('theme-trigger-id')
    expect(trigger.attributes('title')).toBe('主题切换入口')
    expect(trigger.attributes('tabindex')).toBe('0')
    expect(trigger.attributes('name')).toBe('theme-switcher')
    expect(trigger.attributes('autofocus')).toBe('')
    expect(trigger.attributes('data-testid')).toBe('theme-trigger')
    expect(trigger.attributes('aria-label')).toBe('主题切换')
    expect(trigger.attributes('aria-haspopup')).toBe('menu')

    await wrapper.trigger('click')
    expect(handleTriggerClick).not.toHaveBeenCalled()

    await trigger.trigger('click')
    expect(handleTriggerClick).toHaveBeenCalledTimes(1)
  })

  it('转发 visible-change，禁用项不触发 select，并支持 icon meta 与 showArrow', async () => {
    const { component, error } = await loadAppDropdown()

    expect(error).toBeNull()
    expect(component).toBeTruthy()

    if (!component) {
      return
    }

    const onVisibleChange = vi.fn()
    const wrapper = mount(component, {
      attrs: { onVisibleChange },
      props: {
        teleported: false,
        showArrow: false,
        items: [
          {
            key: 'theme',
            label: '主题切换',
            meta: '当前',
            icon: Bell,
            testId: 'theme-option-system',
          },
          { key: 'logout', label: '退出登录', disabled: true },
        ],
      },
      global: {
        stubs: dropdownTestStubs,
      },
    })

    expect(wrapper.find('.app-dropdown__arrow').exists()).toBe(false)
    expect(wrapper.find('.app-dropdown__meta').text()).toBe('当前')
    expect(wrapper.find('.app-dropdown__icon').exists()).toBe(true)

    wrapper.getComponent({ name: 'ElDropdown' }).vm.$emit('visible-change', true)
    expect(onVisibleChange).toHaveBeenCalledWith(true)
    expect(wrapper.emitted('visible-change')).toEqual([[true]])

    await wrapper.get('[data-testid="theme-option-system"]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([
      [
        expect.objectContaining({
          key: 'theme',
          label: '主题切换',
          meta: '当前',
          testId: 'theme-option-system',
        }),
      ],
    ])

    const itemWrappers = wrapper.findAll('.app-dropdown__item')
    const itemComponents = wrapper.findAllComponents({ name: 'ElDropdownItem' })

    expect(itemWrappers).toHaveLength(2)
    expect(itemComponents).toHaveLength(2)

    const disabledItem = itemWrappers[1]
    const disabledItemComponent = itemComponents[1]

    expect(disabledItem).toBeTruthy()
    expect(disabledItemComponent).toBeTruthy()

    if (!disabledItem || !disabledItemComponent) {
      return
    }

    disabledItemComponent.vm.$emit('click')
    expect(wrapper.emitted('select')).toHaveLength(1)

    const source = readFileSync(
      resolve(process.cwd(), 'src/components/common/dropdown/AppDropdown.vue'),
      'utf-8',
    )

    expect(source).toContain('.app-dropdown__trigger:hover')
    expect(source).toContain('.app-dropdown__trigger:focus-visible')
    expect(source).toContain('.app-dropdown__trigger:disabled')
  })
})
