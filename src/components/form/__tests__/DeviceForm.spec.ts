import { mount } from '@vue/test-utils'
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

const categoryOptions = [{ label: '测试设备', value: '测试设备' }]

const initialValue = {
  name: '示波器',
  deviceNumber: 'DEV-001',
  categoryName: '测试设备',
  status: 'AVAILABLE',
  location: 'A-201',
  description: '实验室公共设备',
}

describe('DeviceForm', () => {
  it('创建设备时允许编辑设备编号并提交完整表单', async () => {
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
              '<select :class="$attrs.class" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in data" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
          },
        },
      },
    })

    expect(wrapper.get('.device-form__number').attributes('disabled')).toBeUndefined()

    await wrapper.get('.device-form__name').setValue('新示波器')
    await wrapper.get('.device-form__submit').trigger('click')

    expect(wrapper.emitted('submit')).toEqual([
      [
        {
          ...initialValue,
          name: '新示波器',
        },
      ],
    ])
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
              '<select :class="$attrs.class" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in data" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
          },
        },
      },
    })

    await wrapper.get('.device-form__submit').trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
  })
})
