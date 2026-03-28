import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const businessComponentModules = import.meta.glob('../*.vue')

async function loadComponent(componentName: string) {
  const loader = businessComponentModules[`../${componentName}.vue`]

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
  return readFileSync(
    resolve(process.cwd(), `src/components/business/${componentName}.vue`),
    'utf-8',
  )
}

const modules = [
  {
    module: 'DEVICE',
    permissions: [
      {
        permissionId: 'perm-1',
        code: 'device:view',
        name: '查看设备',
        description: '允许查看设备详情',
        selected: true,
      },
      {
        permissionId: 'perm-2',
        code: 'device:edit',
        name: '编辑设备',
        description: '允许维护设备信息',
        selected: false,
      },
    ],
  },
]

describe('PermissionTree', () => {
  it('权限树容器和模块操作只消费 info 与 success 语义 token', () => {
    const source = readComponentSource('PermissionTree')

    expect(source).toContain('var(--app-tone-success-text)')
    expect(source).toContain('var(--app-tone-success-surface)')
    expect(source).toContain('var(--app-tone-info-surface)')
    expect(source).not.toContain('rgba(255, 255, 255, 0.92)')
    expect(source).not.toContain('rgba(248, 250, 252, 0.9)')
    expect(source).not.toContain('#0f766e')
  })

  it('按模块展示权限节点，并在勾选变化时回传最新 permissionIds', async () => {
    const { module, error } = await loadComponent('PermissionTree')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        modules,
        modelValue: ['perm-1'],
      },
    })

    expect(wrapper.text()).toContain('DEVICE')
    expect(wrapper.text()).toContain('查看设备')
    expect(wrapper.text()).toContain('编辑设备')

    await wrapper.get('input[value="perm-2"]').setValue(true)

    const emittedValue = wrapper.emitted('update:modelValue')?.[0]?.[0] as string[]

    expect([...emittedValue].sort()).toEqual(['perm-1', 'perm-2'])
  })

  it('支持按模块一键全选，避免管理员逐条重复勾选同域权限', async () => {
    const { module, error } = await loadComponent('PermissionTree')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        modules,
        modelValue: [],
      },
    })

    await wrapper.get('[data-testid="permission-module-toggle-DEVICE"]').trigger('click')

    const emittedValue = wrapper.emitted('update:modelValue')?.[0]?.[0] as string[]

    expect([...emittedValue].sort()).toEqual(['perm-1', 'perm-2'])
  })
})
