import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

const businessComponentModules = import.meta.glob('../*.vue')

async function loadBusinessComponent(name: 'TimeRangePicker' | 'ConflictWarning') {
  const loader = businessComponentModules[`../${name}.vue`]

  if (!loader) {
    return {
      module: null,
      error: new Error(`${name}.vue is missing`),
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

describe('reservation create business helpers', () => {
  it('TimeRangePicker 以统一对象形式回传开始与结束时间', async () => {
    const { module, error } = await loadBusinessComponent('TimeRangePicker')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        modelValue: {
          startTime: '2026-03-18T09:00:00',
          endTime: '2026-03-18T10:00:00',
        },
      },
      global: {
        stubs: {
          ElDatePicker: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              "<input class=\"time-range-picker__input\" :value=\"modelValue?.join(' ~ ' )\" @input=\"$emit('update:modelValue', ['2026-03-18T10:00:00', '2026-03-18T11:00:00'])\" />",
          },
        },
      },
    })

    await wrapper.get('.time-range-picker__input').trigger('input')

    expect(wrapper.emitted('update:modelValue')).toEqual([
      [
        {
          startTime: '2026-03-18T10:00:00',
          endTime: '2026-03-18T11:00:00',
        },
      ],
    ])
  })

  it('ConflictWarning 同时展示本地规则提醒与后端返回的冲突错误', async () => {
    const { module, error } = await loadBusinessComponent('ConflictWarning')

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        localWarnings: ['预约时间必须在 08:00-22:00 之间'],
        serverConflictMessage: '该设备在所选时间段已被预约',
      },
      global: {
        stubs: {
          ElAlert: { template: '<div><slot />{{ $attrs.title }}</div>' },
        },
      },
    })

    expect(wrapper.text()).toContain('预约时间必须在 08:00-22:00 之间')
    expect(wrapper.text()).toContain('该设备在所选时间段已被预约')
  })
})
