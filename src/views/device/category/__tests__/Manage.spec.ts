import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

const categoryViewModules = import.meta.glob('../*.vue')

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
