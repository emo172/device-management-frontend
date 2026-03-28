import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { defineComponent, reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserRole } from '@/enums/UserRole'

const authState = reactive({
  role: UserRole.USER,
})

vi.mock('@/stores/modules/auth', () => ({
  useAuthStore: () => ({
    get userRole() {
      return authState.role
    },
  }),
}))

vi.mock('../UserDashboard.vue', () => ({
  default: defineComponent({
    name: 'UserDashboardStub',
    template: '<section data-testid="user-dashboard">用户仪表盘</section>',
  }),
}))

vi.mock('../AdminDashboard.vue', () => ({
  default: defineComponent({
    name: 'AdminDashboardStub',
    template: '<section data-testid="admin-dashboard">管理员仪表盘</section>',
  }),
}))

describe('dashboard index view', () => {
  const readDashboardSource = () => {
    return readFileSync(resolve(process.cwd(), 'src/views/dashboard/index.vue'), 'utf-8')
  }

  beforeEach(() => {
    authState.role = UserRole.USER
  })

  it('入口占位源码改为消费主题 token，避免角色恢复态在深色下残留浅色面板', () => {
    const source = readDashboardSource()

    // 角色恢复态是仪表盘首屏的一部分，必须直接锁定页面级 token，避免后续回退成浅色渐变占位卡。
    expect(source).toContain('var(--app-surface-card)')
    expect(source).toContain('var(--app-tone-success-text)')
    expect(source).toContain('var(--app-text-secondary)')
    expect(source).toContain('var(--app-shadow-card)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(source).not.toMatch(hardcodedColorPattern)
  })

  it('为普通用户渲染用户仪表盘', async () => {
    const DashboardIndex = (await import('@/views/dashboard/index.vue')).default
    const wrapper = mount(DashboardIndex)

    expect(wrapper.find('[data-testid="user-dashboard"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-dashboard"]').exists()).toBe(false)
  })

  it('为设备管理员和系统管理员渲染管理员仪表盘', async () => {
    const DashboardIndex = (await import('@/views/dashboard/index.vue')).default

    authState.role = UserRole.DEVICE_ADMIN
    const deviceAdminWrapper = mount(DashboardIndex)
    expect(deviceAdminWrapper.find('[data-testid="admin-dashboard"]').exists()).toBe(true)

    authState.role = UserRole.SYSTEM_ADMIN
    const systemAdminWrapper = mount(DashboardIndex)
    expect(systemAdminWrapper.find('[data-testid="admin-dashboard"]').exists()).toBe(true)
  })

  it('userRole 为空时不误分流到管理员仪表盘', async () => {
    const DashboardIndex = (await import('@/views/dashboard/index.vue')).default

    authState.role = null as unknown as UserRole
    const wrapper = mount(DashboardIndex)

    expect(wrapper.find('[data-testid="admin-dashboard"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="user-dashboard"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('正在恢复仪表盘权限')
  })
})
