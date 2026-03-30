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

  it('热点文件已经切到统一包装组件入口', () => {
    expect(readSource('src/components/layout/AppHeader.vue')).toContain('AppDropdown')
    expect(readSource('src/components/form/DeviceForm.vue')).toContain('AppTreeSelect')
    expect(readSource('src/components/form/ReservationForm.vue')).toContain('AppSelect')
    expect(readSource('src/components/form/CategoryForm.vue')).toContain('AppTreeSelect')
    expect(readSource('src/components/form/CategoryForm.vue')).toContain('AppSelect')
    expect(readSource('src/views/user/RoleAssign.vue')).toContain('AppSelect')
    expect(readSource('src/views/user/Freeze.vue')).toContain('AppSelect')
    expect(readSource('src/views/notification/List.vue')).toContain('AppSelect')
    expect(readSource('src/views/reservation/Create.vue')).toContain('AppSelect')
  })
})
