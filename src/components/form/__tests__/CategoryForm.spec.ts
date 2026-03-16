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

describe('CategoryForm', () => {
  it('提交分类表单时回传父级分类与默认审批模式', async () => {
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
    await wrapper.get('.category-form__approval-mode').setValue('DEVICE_THEN_SYSTEM')
    await wrapper.get('.category-form__submit').trigger('click')

    expect(wrapper.emitted('submit')).toEqual([
      [
        {
          name: '电子设备',
          parentName: null,
          sortOrder: 1,
          description: '一级分类',
          defaultApprovalMode: 'DEVICE_THEN_SYSTEM',
        },
      ],
    ])
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
})
