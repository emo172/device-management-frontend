import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migratedRuntimeFiles = [
  'src/components/layout/AppHeader.vue',
  'src/components/form/DeviceForm.vue',
  'src/components/form/ReservationForm.vue',
  'src/components/form/CategoryForm.vue',
  'src/views/user/RoleAssign.vue',
  'src/views/user/Freeze.vue',
  'src/views/notification/List.vue',
  'src/views/reservation/Create.vue',
] as const

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf-8')
}

function countMatches(source: string, pattern: RegExp) {
  return source.match(pattern)?.length ?? 0
}

describe('dropdown migration contracts', () => {
  it('热点运行时代码不再直接消费 Element Plus 原始下拉组件或局部 wrapper 补丁', () => {
    for (const file of migratedRuntimeFiles) {
      const source = readSource(file)

      expect(source).not.toContain('<el-select')
      expect(source).not.toContain('<el-tree-select')
      expect(source).not.toContain('<el-dropdown')
      expect(source).not.toContain(':deep(.el-select__wrapper)')
    }
  })

  it('头部不再依赖旧的主题私有激活 class', () => {
    const source = readSource('src/components/layout/AppHeader.vue')

    expect(source).not.toContain('app-header__theme-option--active')
  })

  it('头部 dropdown 迁移边界只允许通过两个 AppDropdown 入口消费统一能力', () => {
    const source = readSource('src/components/layout/AppHeader.vue')

    expect(countMatches(source, /<AppDropdown\b/g)).toBe(2)
    expect(source).toMatch(
      /<AppDropdown[\s\S]*data-testid="theme-entry"[\s\S]*:items="themeDropdownItems"[\s\S]*@select="handleThemeSelect"/,
    )
    expect(source).toMatch(
      /<AppDropdown[\s\S]*data-testid="user-menu-trigger"[\s\S]*:items="userMenuItems"[\s\S]*@select="handleUserMenuSelect"/,
    )
    expect(source).not.toContain('<el-dropdown')
    expect(source).not.toContain('app-header__theme-button')
    expect(source).not.toContain('app-header__user-trigger')
    expect(source).not.toContain('app-header__dropdown-popper')
    expect(source).not.toContain('popper-class')
  })

  it('头部主题入口继续通过 AppDropdown items 暴露稳定 selector 与当前态数据合同', () => {
    const source = readSource('src/components/layout/AppHeader.vue')

    expect(source).toContain('const themeDropdownItems = computed<AppDropdownItem[]>(() =>')
    expect(source).toContain('data-testid="theme-entry"')
    expect(source).toContain(':items="themeDropdownItems"')
    expect(source).toContain(':data-theme-preference="appStore.themePreference"')
    expect(source).toContain(':data-resolved-theme="appStore.resolvedTheme"')
    expect(source).toContain('icon: option.icon')
    expect(source).toContain('active: option.preference === appStore.themePreference')
    expect(source).toContain(
      "meta: option.preference === appStore.themePreference ? '当前' : undefined",
    )
    expect(source).toContain('testId: `theme-option-${option.preference}`')
  })

  it('头部用户菜单继续通过统一 items 合同暴露稳定 selector、图标与危险态', () => {
    const source = readSource('src/components/layout/AppHeader.vue')

    expect(source).toContain('const userMenuItems: AppDropdownItem[] = [')
    expect(source).toContain('data-testid="user-menu-trigger"')
    expect(source).toMatch(
      /key: 'profile'[\s\S]*label: '个人中心'[\s\S]*icon: User[\s\S]*testId: 'user-menu-profile'/,
    )
    expect(source).toMatch(
      /key: 'password'[\s\S]*label: '修改密码'[\s\S]*icon: Setting[\s\S]*testId: 'user-menu-password'/,
    )
    expect(source).toMatch(
      /key: 'logout'[\s\S]*label: '退出登录'[\s\S]*icon: SwitchButton[\s\S]*danger: true[\s\S]*testId: 'user-menu-logout'/,
    )
  })

  it('热点文件已经切到统一包装组件入口', () => {
    expect(readSource('src/components/layout/AppHeader.vue')).toContain('AppDropdown')
    expect(readSource('src/components/form/DeviceForm.vue')).toContain('AppTreeSelect')
    expect(readSource('src/components/form/CategoryForm.vue')).toContain('AppTreeSelect')
    expect(readSource('src/components/form/CategoryForm.vue')).toContain('AppSelect')
    expect(readSource('src/views/user/RoleAssign.vue')).toContain('AppSelect')
    expect(readSource('src/views/user/Freeze.vue')).toContain('AppSelect')
    expect(readSource('src/views/notification/List.vue')).toContain('AppSelect')
    // T7 起 ReservationForm 只负责填写时间/用途/备注，reservation 创建链路的统一下拉入口收口在 Create.vue。
    expect(readSource('src/views/reservation/Create.vue')).toContain('AppSelect')
  })
})
