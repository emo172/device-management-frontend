import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

const businessModules = import.meta.glob('../*.vue')

async function loadManualProcessDialog() {
  const loader = businessModules['../ManualProcessDialog.vue']

  if (!loader) {
    return {
      module: null,
      error: new Error('ManualProcessDialog.vue is missing'),
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

describe('manual process dialog', () => {
  it('allows device admin to choose confirm borrow or cancel reservation', async () => {
    const { module, error } = await loadManualProcessDialog()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        modelValue: true,
        loading: false,
      },
      global: {
        stubs: {
          ElDialog: {
            props: ['modelValue'],
            template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>',
          },
          ElRadioGroup: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<div><slot /></div>',
          },
          ElRadioButton: {
            props: ['label', 'value'],
            template: '<button type="button"><slot /></button>',
          },
          ElInput: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<textarea class="remark-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          ElButton: {
            props: ['type'],
            emits: ['click'],
            template: '<button :data-type="type" @click="$emit(\'click\')"><slot /></button>',
          },
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(wrapper.text()).toContain('确认借用')
    expect(wrapper.text()).toContain('取消预约')

    await wrapper.get('.remark-input').setValue('设备已现场交接')
    await wrapper.get('[data-testid="manual-process-approve"]').trigger('click')

    expect(wrapper.emitted('submit')).toEqual([[{ approved: true, remark: '设备已现场交接' }]])

    await wrapper.get('[data-testid="manual-process-reject"]').trigger('click')
    expect(wrapper.emitted('submit')?.[1]).toEqual([{ approved: false, remark: '设备已现场交接' }])
  })
})
