import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const formComponentModules = import.meta.glob('../*.vue')

async function loadDeviceForm() {
  const loader = formComponentModules['../DeviceForm.vue']

  if (!loader) {
    return {
      module: null,
      error: new Error('DeviceForm.vue is missing'),
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

function readDeviceFormSource() {
  return readFileSync(resolve(process.cwd(), 'src/components/form/DeviceForm.vue'), 'utf-8')
}

const categoryOptions = [
  { label: '测试设备', value: '测试设备' },
  { label: '教学设备', value: '教学设备' },
]

const categoryOptionsWithDistinctLabelValue = [
  { label: '实验室示波器', value: 'LAB_SCOPE' },
  { label: '嵌入式开发板', value: 'EMBEDDED_BOARD' },
]

const initialValue = {
  name: '示波器',
  deviceNumber: 'DEV-001',
  categoryName: '测试设备',
  location: 'A-201',
  description: '实验室公共设备',
}

describe('DeviceForm', () => {
  it('设备表单改为通过 AppTreeSelect 收口分类树选择，并移除局部下拉补丁', () => {
    const source = readDeviceFormSource()

    expect(source).toContain('var(--app-border-soft)')
    expect(source).toContain('var(--app-surface-card)')
    expect(source).toContain('包装组件')
    expect(source).toContain('interface DeviceFormCategoryOption')
    expect(source).toContain('<AppTreeSelect')
    expect(source).not.toContain('<el-tree-select')
    expect(source).not.toContain('CategoryTreeResponse')
    expect(source).not.toContain("Pick<CategoryTreeResponse, 'name'>")
    expect(source).not.toContain(':deep(.el-select__wrapper)')
    expect(source).not.toContain('rgba(148, 163, 184, 0.18)')
    expect(source).not.toContain('rgba(255, 255, 255, 0.94)')
  })

  it('initialValue.categoryName 按分类 value 回填当前树选择值', async () => {
    const { module, error } = await loadDeviceForm()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        mode: 'edit',
        initialValue: {
          ...initialValue,
          categoryName: 'EMBEDDED_BOARD',
        },
        categoryOptions: categoryOptionsWithDistinctLabelValue,
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
            props: ['modelValue', 'disabled', 'type'],
            emits: ['update:modelValue'],
            template:
              '<input :class="$attrs.class" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          AppTreeSelect: {
            name: 'AppTreeSelect',
            props: {
              modelValue: { default: '' },
              data: { type: Array, default: () => [] },
              nodeKey: String,
              checkStrictly: Boolean,
              defaultExpandAll: Boolean,
              placeholder: String,
            },
            emits: ['update:modelValue'],
            template:
              '<select :class="$attrs.class" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in data" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
          },
        },
      },
    })

    const categorySelect = wrapper.get('.device-form__category').element as HTMLSelectElement

    expect(categorySelect.value).toBe('EMBEDDED_BOARD')
    expect(Array.from(categorySelect.options).find((option) => option.selected)?.text).toBe(
      '嵌入式开发板',
    )
  })

  it('label 与 value 不同时仍提交 categoryName 对应的真实 value', async () => {
    const { module, error } = await loadDeviceForm()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        mode: 'create',
        initialValue: {
          ...initialValue,
          categoryName: 'LAB_SCOPE',
        },
        categoryOptions: categoryOptionsWithDistinctLabelValue,
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
            props: ['modelValue', 'disabled', 'type'],
            emits: ['update:modelValue'],
            template:
              '<input :class="$attrs.class" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          AppTreeSelect: {
            name: 'AppTreeSelect',
            props: {
              modelValue: { default: '' },
              data: { type: Array, default: () => [] },
              nodeKey: String,
              checkStrictly: Boolean,
              defaultExpandAll: Boolean,
              placeholder: String,
            },
            emits: ['update:modelValue'],
            template:
              '<select :class="$attrs.class" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in data" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
          },
        },
      },
    })

    await wrapper.get('.device-form__category').setValue('EMBEDDED_BOARD')

    const categorySelect = wrapper.get('.device-form__category').element as HTMLSelectElement

    expect(Array.from(categorySelect.options).find((option) => option.selected)?.text).toBe(
      '嵌入式开发板',
    )

    await wrapper.get('.device-form__submit').trigger('click')

    const payload = wrapper.emitted('submit')?.[0]?.[0] as typeof initialValue | undefined

    expect(payload?.categoryName).toBe('EMBEDDED_BOARD')
    expect(payload?.categoryName).not.toBe('嵌入式开发板')
  })

  it('创建设备时允许编辑设备编号并按分类名称提交完整表单', async () => {
    const { module, error } = await loadDeviceForm()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        mode: 'create',
        initialValue,
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
            props: ['modelValue', 'disabled', 'type'],
            emits: ['update:modelValue'],
            template:
              '<input :class="$attrs.class" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          AppTreeSelect: {
            name: 'AppTreeSelect',
            props: {
              modelValue: { default: '' },
              data: { type: Array, default: () => [] },
              nodeKey: String,
              checkStrictly: Boolean,
              defaultExpandAll: Boolean,
              placeholder: String,
            },
            emits: ['update:modelValue'],
            template:
              '<select :class="$attrs.class" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in data" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
          },
        },
      },
    })

    expect(wrapper.get('.device-form__number').attributes('disabled')).toBeUndefined()
    const categoryTreeSelect = wrapper.getComponent({ name: 'AppTreeSelect' })

    expect(categoryTreeSelect.props('nodeKey')).toBe('value')
    expect(categoryTreeSelect.props('checkStrictly')).toBe(true)
    expect(categoryTreeSelect.props('defaultExpandAll')).toBe(true)
    expect(categoryTreeSelect.props('placeholder')).toBe('请选择设备分类')

    await wrapper.get('.device-form__name').setValue('新示波器')
    await wrapper.get('.device-form__category').setValue('教学设备')
    await wrapper.get('.device-form__submit').trigger('click')

    const payload = wrapper.emitted('submit')?.[0]?.[0] as
      | (typeof initialValue & { categoryId?: string })
      | undefined

    expect(payload).toEqual({
      ...initialValue,
      name: '新示波器',
      categoryName: '教学设备',
    })
    expect(payload).not.toHaveProperty('categoryId')
  })

  it('编辑模式下锁定设备编号，避免误改唯一识别码', async () => {
    const { module, error } = await loadDeviceForm()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        mode: 'edit',
        initialValue,
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
            props: ['modelValue', 'disabled', 'type'],
            emits: ['update:modelValue'],
            template:
              '<input :class="$attrs.class" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          AppTreeSelect: {
            name: 'AppTreeSelect',
            props: {
              modelValue: { default: '' },
              data: { type: Array, default: () => [] },
              nodeKey: String,
              checkStrictly: Boolean,
              defaultExpandAll: Boolean,
              placeholder: String,
            },
            emits: ['update:modelValue'],
            template:
              '<select :class="$attrs.class" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in data" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
          },
        },
      },
    })

    expect(wrapper.get('.device-form__number').attributes('disabled')).toBeDefined()
  })

  it('名称或设备编号为空时不允许提交', async () => {
    const { module, error } = await loadDeviceForm()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        mode: 'create',
        initialValue: {
          ...initialValue,
          name: '',
          deviceNumber: '',
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
            props: ['modelValue', 'disabled', 'type'],
            emits: ['update:modelValue'],
            template:
              '<input :class="$attrs.class" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          AppTreeSelect: {
            name: 'AppTreeSelect',
            props: {
              modelValue: { default: '' },
              data: { type: Array, default: () => [] },
              nodeKey: String,
              checkStrictly: Boolean,
              defaultExpandAll: Boolean,
              placeholder: String,
            },
            emits: ['update:modelValue'],
            template:
              '<select :class="$attrs.class" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in data" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
          },
        },
      },
    })

    await wrapper.get('.device-form__submit').trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('基础档案表单不再暴露状态选择，避免把状态流转混进创建与编辑页', async () => {
    const { module, error } = await loadDeviceForm()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        mode: 'edit',
        initialValue,
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
            props: ['modelValue', 'disabled', 'type'],
            emits: ['update:modelValue'],
            template:
              '<input :class="$attrs.class" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          AppTreeSelect: {
            name: 'AppTreeSelect',
            props: {
              modelValue: { default: '' },
              data: { type: Array, default: () => [] },
              nodeKey: String,
              checkStrictly: Boolean,
              defaultExpandAll: Boolean,
              placeholder: String,
            },
            emits: ['update:modelValue'],
            template:
              '<select :class="$attrs.class" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in data" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
          },
        },
      },
    })

    expect(wrapper.find('.device-form__status').exists()).toBe(false)
  })
})
