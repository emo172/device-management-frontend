import { setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserRole } from '@/enums/UserRole'
import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'

const routeState = {
  path: '/dashboard',
}

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    useRoute: () => routeState,
    useRouter: () => ({ push: vi.fn() }),
  }
})

const AppSidebar = (await import('../AppSidebar.vue')).default

describe('AppSidebar', () => {
  beforeEach(() => {
    setActivePinia(createAppPinia())
  })

  it('为普通用户渲染 AI 对话入口，但不展示统计分析', () => {
    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'user@example.com',
      phone: '13800138000',
      realName: '普通用户',
      role: UserRole.USER,
      userId: 'user-1',
      username: 'user',
    })

    const wrapper = mount(AppSidebar, {
      global: {
        stubs: {
          ElAside: { template: '<aside><slot /></aside>' },
          ElIcon: { template: '<i><slot /></i>' },
          ElMenu: { template: '<nav><slot /></nav>' },
          ElMenuItem: { template: '<div><slot /></div>' },
          ElScrollbar: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(wrapper.text()).toContain('AI 对话')
    expect(wrapper.text()).toContain('我的预约')
    expect(wrapper.text()).not.toContain('统计分析')
    expect(wrapper.text()).not.toContain('用户管理')
  })

  it('为系统管理员渲染管理菜单，但不展示 AI 与借还入口', () => {
    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'admin@example.com',
      phone: '13800138000',
      realName: '系统管理员',
      role: UserRole.SYSTEM_ADMIN,
      userId: 'admin-1',
      username: 'admin',
    })

    const wrapper = mount(AppSidebar, {
      global: {
        stubs: {
          ElAside: { template: '<aside><slot /></aside>' },
          ElIcon: { template: '<i><slot /></i>' },
          ElMenu: { template: '<nav><slot /></nav>' },
          ElMenuItem: { template: '<div><slot /></div>' },
          ElScrollbar: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(wrapper.text()).toContain('用户管理')
    expect(wrapper.text()).toContain('统计分析')
    expect(wrapper.text()).toContain('Prompt 模板')
    expect(wrapper.text()).toContain('预约审核')
    expect(wrapper.text()).toContain('预约管理')
    expect(wrapper.text()).toContain('设备中心')
    expect(wrapper.text()).not.toContain('分类管理')
    expect(wrapper.text()).not.toContain('AI 对话')
    expect(wrapper.text()).not.toContain('借还管理')
  })

  it('为设备管理员同时渲染预约管理与预约审核入口', () => {
    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'device-admin@example.com',
      phone: '13800138000',
      realName: '设备管理员',
      role: UserRole.DEVICE_ADMIN,
      userId: 'device-admin-1',
      username: 'device-admin',
    })

    const wrapper = mount(AppSidebar, {
      global: {
        stubs: {
          ElAside: { template: '<aside><slot /></aside>' },
          ElIcon: { template: '<i><slot /></i>' },
          ElMenu: { template: '<nav><slot /></nav>' },
          ElMenuItem: { template: '<div><slot /></div>' },
          ElScrollbar: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(wrapper.text()).toContain('预约管理')
    expect(wrapper.text()).toContain('预约审核')
    expect(wrapper.text()).toContain('借还管理')
    expect(wrapper.text()).toContain('设备中心')
    expect(wrapper.text()).toContain('分类管理')
    expect(wrapper.text()).not.toContain('AI 对话')
    expect(wrapper.text()).not.toContain('用户管理')
  })
})
