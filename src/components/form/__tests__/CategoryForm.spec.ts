import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

const formComponentModules = import.meta.glob('../*.vue')

async function loadCategoryForm() {
  const loader = formComponentModules['../CategoryForm.vue']

  if (!loader) {
    return {
      module: null,
      error: new Error('CategoryForm.vue is missing'),
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

const categoryOptions = [{ label: '测试设备', value: '测试设备' }]
const nestedCategoryOptions = [
  {
    label: '测试设备',
    value: '测试设备',
    children: [{ label: '高端仪器', value: '高端仪器' }],
  },
]

describe('CategoryForm', () => {
  it('提交分类表单时回传父级分类名称与默认审批模式', async () => {
    const { module, error } = await loadCategoryForm()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        initialValue: {
          name: '仪器设备',
          parentName: null,
          sortOrder: 1,
          description: '一级分类',
          defaultApprovalMode: 'DEVICE_ONLY',
        },
        categoryOptions,
      },
      global: {
        stubs: {
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElInput: {
            props: ['modelValue', 'type'],
            emits: ['update:modelValue'],
            template:
              '<input :class="$attrs.class" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          ElInputNumber: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<input :class="$attrs.class" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
          },
          ElSelect: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<select :class="$attrs.class" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
          },
          ElOption: {
            props: ['label', 'value'],
            template: '<option :value="value">{{ label }}</option>',
          },
          ElTreeSelect: {
            props: ['modelValue', 'data'],
            emits: ['update:modelValue'],
            template:
              '<select :class="$attrs.class" :value="modelValue ?? String()" @change="$emit(\'update:modelValue\', $event.target.value || null)"><option value="">顶级分类</option><option v-for="item in data" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
          },
        },
      },
    })

    await wrapper.get('.category-form__name').setValue('电子设备')
    await wrapper.get('.category-form__parent').setValue('测试设备')
    await wrapper.get('.category-form__approval-mode').setValue('DEVICE_THEN_SYSTEM')
    await wrapper.get('.category-form__submit').trigger('click')

    const payload = wrapper.emitted('submit')?.[0]?.[0] as
      | {
          name: string
          parentName: string | null
          sortOrder: number
          description: string
          defaultApprovalMode: string
          parentId?: string
        }
      | undefined

    expect(payload).toEqual({
      name: '电子设备',
      parentName: '测试设备',
      sortOrder: 1,
      description: '一级分类',
      defaultApprovalMode: 'DEVICE_THEN_SYSTEM',
    })
    expect(payload).not.toHaveProperty('parentId')
  })

  it('分类名称为空时不允许提交', async () => {
    const { module, error } = await loadCategoryForm()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        initialValue: {
          name: '',
          parentName: null,
          sortOrder: 1,
          description: '',
          defaultApprovalMode: 'DEVICE_ONLY',
        },
        categoryOptions,
      },
      global: {
        stubs: {
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElInput: {
            props: ['modelValue', 'type'],
            emits: ['update:modelValue'],
            template:
              '<input :class="$attrs.class" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          ElInputNumber: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<input :class="$attrs.class" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
          },
          ElSelect: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<select :class="$attrs.class" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
          },
          ElOption: {
            props: ['label', 'value'],
            template: '<option :value="value">{{ label }}</option>',
          },
          ElTreeSelect: {
            props: ['modelValue', 'data'],
            emits: ['update:modelValue'],
            template:
              '<select :class="$attrs.class" :value="modelValue ?? String()" @change="$emit(\'update:modelValue\', $event.target.value || null)"><option value="">顶级分类</option><option v-for="item in data" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
          },
        },
      },
    })

    await wrapper.get('.category-form__submit').trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('父级分类选择只暴露根分类，避免提交后端不支持的非根 parentName', async () => {
    const { module, error } = await loadCategoryForm()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        initialValue: {
          name: '子分类',
          parentName: null,
          sortOrder: 1,
          description: '',
          defaultApprovalMode: 'DEVICE_ONLY',
        },
        categoryOptions: nestedCategoryOptions,
      },
      global: {
        stubs: {
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElInput: {
            props: ['modelValue', 'type'],
            emits: ['update:modelValue'],
            template:
              '<input :class="$attrs.class" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          ElInputNumber: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<input :class="$attrs.class" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
          },
          ElSelect: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<select :class="$attrs.class" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
          },
          ElOption: {
            props: ['label', 'value'],
            template: '<option :value="value">{{ label }}</option>',
          },
          ElTreeSelect: {
            props: ['data'],
            template: '<div class="category-form__parent-options">{{ JSON.stringify(data) }}</div>',
          },
        },
      },
    })

    expect(wrapper.get('.category-form__parent-options').text()).toContain('测试设备')
    expect(wrapper.get('.category-form__parent-options').text()).not.toContain('高端仪器')
  })
})
