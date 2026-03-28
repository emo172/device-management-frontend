import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import { createAppPinia } from '@/stores'

const categoryViewModules = import.meta.glob('../*.vue')

function readCategoryViewSource(fileName: 'Manage.vue') {
  return readFileSync(resolve(process.cwd(), `src/views/device/category/${fileName}`), 'utf-8')
}

async function loadManageView() {
  const loader = categoryViewModules['../Manage.vue']

  if (!loader) {
    return {
      module: null,
      error: new Error('Manage.vue is missing'),
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

describe('category manage view', () => {
  beforeEach(() => {
    setActivePinia(createAppPinia())
  })

  it('弹窗源码改为消费主题 token，避免分类管理弹窗在深色下出现脱离页面的浅色浮层', () => {
    const source = readCategoryViewSource('Manage.vue')

    // 分类弹窗属于程序化浮层，必须在页面源码里锁定表面和边框 token，避免只依赖全局默认样式后再次回退。
    expect(source).toContain('var(--app-surface-card)')
    expect(source).toContain('var(--app-border-soft)')
    expect(source).toContain('var(--app-shadow-card)')
    expect(source).toContain('var(--app-surface-overlay)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(source).not.toMatch(hardcodedColorPattern)
  })

  it('弹窗内表单提交后向外回传分类创建载荷并关闭弹窗', async () => {
    const { module, error } = await loadManageView()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        modelValue: true,
        categoryOptions: [],
        submitting: false,
      },
      global: {
        stubs: {
          CategoryForm: {
            emits: ['submit'],
            methods: {
              emitPayload() {
                this.$emit('submit', {
                  name: '电子设备',
                  parentName: null,
                  sortOrder: 1,
                  description: '一级分类',
                  defaultApprovalMode: 'DEVICE_ONLY',
                })
              },
            },
            template: '<button class="category-form-submit" @click="emitPayload"></button>',
          },
          ElDialog: { template: '<section><slot /></section>' },
        },
      },
    })

    await wrapper.get('.category-form-submit').trigger('click')

    expect(wrapper.emitted('submit')).toEqual([
      [
        {
          name: '电子设备',
          parentName: null,
          sortOrder: 1,
          description: '一级分类',
          defaultApprovalMode: 'DEVICE_ONLY',
        },
      ],
    ])
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
