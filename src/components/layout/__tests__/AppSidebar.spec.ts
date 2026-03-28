import { setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserRole } from '@/enums/UserRole'
import { createAppPinia } from '@/stores'
import { useAppStore } from '@/stores/modules/app'
import { useAuthStore } from '@/stores/modules/auth'

const routerPush = vi.fn()

const routeState = {
  name: 'Dashboard',
  path: '/dashboard',
  meta: {
    title: '仪表盘',
  },
}

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    useRoute: () => routeState,
    useRouter: () => ({ push: routerPush }),
  }
})

const AppSidebar = (await import('../AppSidebar.vue')).default

function mountSidebar() {
  return mount(AppSidebar, {
    global: {
      stubs: {
        ElAside: { template: '<aside><slot /></aside>' },
        ElIcon: { template: '<i class="icon-stub"><slot /></i>' },
        ElMenu: {
          props: ['defaultActive', 'collapse'],
          template:
            '<nav class="menu-stub" :data-active-item="defaultActive" :data-collapse="String(collapse)"><slot /></nav>',
        },
        ElMenuItem: {
          props: ['index'],
          emits: ['click'],
          template:
            '<div class="menu-item-stub" :data-index="index" @click="$emit(\'click\', $event)"><slot /></div>',
        },
        ElScrollbar: { template: '<div><slot /></div>' },
        ElTooltip: {
          props: ['content', 'teleported'],
          template: `<div class="tooltip-stub" :data-content="content" :data-teleported="teleported === undefined ? 'default' : String(teleported)"><slot /></div>`,
        },
      },
    },
  })
}

function setCurrentUserRole(role: UserRole) {
  const authStore = useAuthStore()

  authStore.setCurrentUser({
    email: `${role.toLowerCase()}@example.com`,
    phone: '13800138000',
    realName: role,
    role,
    userId: `${role.toLowerCase()}-1`,
    username: role.toLowerCase(),
  })
}

describe('AppSidebar', () => {
  beforeEach(() => {
    setActivePinia(createAppPinia())
    routerPush.mockReset()
    routeState.name = 'Dashboard'
    routeState.path = '/dashboard'
    routeState.meta = {
      title: '仪表盘',
    }
  })

  it('为普通用户按业务优先顺序渲染分组侧栏，并保留消息中心与账号中心命名', () => {
    setCurrentUserRole(UserRole.USER)

    const wrapper = mountSidebar()
    const groupTitles = wrapper
      .findAll('.app-sidebar__group-title')
      .map((groupTitle) => groupTitle.text())

    expect(wrapper.find('.app-sidebar__surface').exists()).toBe(true)
    expect(groupTitles).toEqual([
      '工作台',
      '预约业务',
      '设备与资产',
      '智能助手',
      '消息中心',
      '账号中心',
    ])
    expect(wrapper.text()).toContain('通知中心')
    expect(wrapper.text()).toContain('个人中心')
    expect(wrapper.text()).toContain('我的预约')
    expect(wrapper.text()).not.toContain('系统管理')
  })

  it('为系统管理员渲染系统管理分组，但不展示 AI 与借还用户入口', () => {
    setCurrentUserRole(UserRole.SYSTEM_ADMIN)

    const wrapper = mountSidebar()

    expect(wrapper.text()).toContain('系统管理')
    expect(wrapper.text()).toContain('用户管理')
    expect(wrapper.text()).toContain('统计分析')
    expect(wrapper.text()).toContain('Prompt 模板')
    expect(wrapper.text()).toContain('预约审核')
    expect(wrapper.text()).toContain('预约管理')
    expect(wrapper.text()).not.toContain('分类管理')
    expect(wrapper.text()).not.toContain('AI 对话')
    expect(wrapper.text()).not.toContain('借还记录')
    expect(wrapper.text()).not.toContain('借还管理')
  })

  it('设备管理员进入借用确认页时，仍高亮借还管理并展开设备与资产分组', () => {
    routeState.name = 'BorrowConfirm'
    routeState.path = '/borrows/confirm'
    routeState.meta = {
      title: '借用确认',
    }
    setCurrentUserRole(UserRole.DEVICE_ADMIN)

    const wrapper = mountSidebar()

    expect(wrapper.get('[data-active-item]').attributes('data-active-item')).toBe('/borrows')
    expect(wrapper.get('[data-open-group]').attributes('data-open-group')).toBe('设备与资产')
  })

  it('折叠态下收起分组标题和品牌文字，但仍保留图标与紧凑角色区', () => {
    const appStore = useAppStore()
    appStore.setSidebarCollapsed(true)
    routeState.name = 'BorrowConfirm'
    routeState.path = '/borrows/confirm'
    routeState.meta = {
      title: '借用确认',
    }
    setCurrentUserRole(UserRole.DEVICE_ADMIN)

    const wrapper = mountSidebar()

    expect(wrapper.find('.app-sidebar__brand-text').exists()).toBe(false)
    expect(wrapper.find('.app-sidebar__group-title').exists()).toBe(false)
    expect(wrapper.find('.app-sidebar__role-panel--collapsed').exists()).toBe(true)
    expect(wrapper.findAll('.icon-stub').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.tooltip-stub').length).toBeGreaterThan(0)
    expect(
      wrapper
        .findAll('.tooltip-stub')
        .some((tooltip) => tooltip.attributes('data-content') === '设备与资产 · 借还管理'),
    ).toBe(true)
    expect(wrapper.find('.menu-stub > .menu-item-stub').exists()).toBe(true)
    expect(wrapper.find('.menu-stub > .tooltip-stub').exists()).toBe(false)
  })

  it('折叠态 tooltip 不禁用 teleport，避免右侧提示被侧栏裁切', () => {
    const appStore = useAppStore()
    appStore.setSidebarCollapsed(true)
    setCurrentUserRole(UserRole.DEVICE_ADMIN)

    const wrapper = mountSidebar()

    expect(wrapper.findAll('.tooltip-stub').length).toBeGreaterThan(0)
    expect(
      wrapper
        .findAll('.tooltip-stub')
        .every((tooltip) => tooltip.attributes('data-teleported') !== 'false'),
    ).toBe(true)
  })

  it('侧栏壳层暴露当前解析后的主题态，供布局联动样式消费', () => {
    const appStore = useAppStore()
    appStore.setThemePreference('dark')
    setCurrentUserRole(UserRole.DEVICE_ADMIN)

    const wrapper = mountSidebar()

    expect(wrapper.get('.app-sidebar').attributes('data-resolved-theme')).toBe('dark')
  })

  it('分类管理仅对设备管理员可见', () => {
    setCurrentUserRole(UserRole.DEVICE_ADMIN)
    const deviceAdminWrapper = mountSidebar()

    expect(deviceAdminWrapper.text()).toContain('分类管理')

    setActivePinia(createAppPinia())
    setCurrentUserRole(UserRole.SYSTEM_ADMIN)
    const systemAdminWrapper = mountSidebar()

    expect(systemAdminWrapper.text()).not.toContain('分类管理')
  })

  it('点击非当前菜单时会触发路由跳转', async () => {
    setCurrentUserRole(UserRole.USER)
    const wrapper = mountSidebar()

    await wrapper.get('[data-index="/notifications"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/notifications')
    expect(routerPush).toHaveBeenCalledTimes(1)
  })

  it('点击当前菜单时不会重复跳转', async () => {
    setCurrentUserRole(UserRole.USER)
    const wrapper = mountSidebar()

    await wrapper.get('[data-index="/dashboard"]').trigger('click')

    expect(routerPush).not.toHaveBeenCalled()
  })
})
