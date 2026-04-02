import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'

const businessComponentModules = import.meta.glob('../*.vue')
const VALID_TIME_RANGE = ['2026-03-18T10:00:00', '2026-03-18T11:00:00'] as const
const ElDatePickerStub = defineComponent({
  name: 'ElDatePickerStub',
  props: ['modelValue', 'defaultTime', 'disabledHours', 'disabledMinutes', 'disabledSeconds'],
  emits: ['update:modelValue'],
  template: '<div class="time-range-picker__stub" />',
})

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
async function mountTimeRangePicker(modelValue: { startTime: string; endTime: string }) {
  const { module, error } = await loadBusinessComponent('TimeRangePicker')

  expect(error).toBeNull()
  expect(module).toBeTruthy()

  if (!module) {
    throw new Error('TimeRangePicker.vue is missing')
  }

  const wrapper = mount(module.default, {
    props: {
      modelValue,
    },
    global: {
      stubs: {
        ElDatePicker: ElDatePickerStub,
      },
    },
  })

  const datePicker = wrapper.getComponent(ElDatePickerStub)

  return {
    wrapper,
    datePicker,
  }
}

function getTimeParts(defaultTime: unknown) {
  if (!(defaultTime instanceof Date)) {
    return null
  }

  return [defaultTime.getHours(), defaultTime.getMinutes(), defaultTime.getSeconds()]
}

describe('reservation create business helpers', () => {
  it('TimeRangePicker 空态向日期范围控件传递 null 而不是空字符串数组', async () => {
    const { datePicker } = await mountTimeRangePicker({
      startTime: '',
      endTime: '',
    })

    expect(datePicker.props('modelValue')).not.toStrictEqual(['', ''])
    expect(datePicker.props('modelValue')).toBeNull()
  })

  it('TimeRangePicker 选择合法时间后回传 ISO 对象并在清空时回到空字符串', async () => {
    const { wrapper, datePicker } = await mountTimeRangePicker({
      startTime: '',
      endTime: '',
    })

    datePicker.vm.$emit('update:modelValue', [...VALID_TIME_RANGE])

    expect(wrapper.emitted('update:modelValue')).toEqual([
      [
        {
          startTime: VALID_TIME_RANGE[0],
          endTime: VALID_TIME_RANGE[1],
        },
      ],
    ])

    datePicker.vm.$emit('update:modelValue', null)

    expect(wrapper.emitted('update:modelValue')).toEqual([
      [
        {
          startTime: VALID_TIME_RANGE[0],
          endTime: VALID_TIME_RANGE[1],
        },
      ],
      [
        {
          startTime: '',
          endTime: '',
        },
      ],
    ])
  })

  it('TimeRangePicker 公开 08:00 至 22:00 的默认时间与边界禁用策略', async () => {
    const { datePicker } = await mountTimeRangePicker({
      startTime: '2026-03-18T08:00:00',
      endTime: '2026-03-18T22:00:00',
    })

    const disabledHours = datePicker.props('disabledHours') as (() => number[]) | undefined
    const disabledMinutes = datePicker.props('disabledMinutes') as
      | ((hour: number) => number[])
      | undefined
    const disabledSeconds = datePicker.props('disabledSeconds') as
      | ((hour: number, minute: number) => number[])
      | undefined
    const defaultTime = datePicker.props('defaultTime') as unknown[] | undefined

    expect(disabledHours).toBeTypeOf('function')
    expect(disabledMinutes).toBeTypeOf('function')
    expect(disabledSeconds).toBeTypeOf('function')

    expect(disabledHours?.()).toContain(7)
    expect(disabledHours?.()).toContain(23)
    expect(disabledHours?.()).not.toContain(8)
    expect(disabledHours?.()).not.toContain(22)

    expect(disabledMinutes?.(8)).toEqual([])
    expect(disabledMinutes?.(22)).toContain(1)
    expect(disabledMinutes?.(22)).not.toContain(0)

    expect(disabledSeconds?.(22, 0)).toContain(1)
    expect(disabledSeconds?.(22, 0)).not.toContain(0)
    expect(disabledSeconds?.(22, 1)).toEqual([])

    expect(defaultTime).toHaveLength(2)
    expect(defaultTime?.map(getTimeParts)).toEqual([
      [8, 0, 0],
      [22, 0, 0],
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
