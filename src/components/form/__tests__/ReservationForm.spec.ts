import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

const formComponentModules = import.meta.glob('../*.vue')

async function loadReservationForm() {
  const loader = formComponentModules['../ReservationForm.vue']

  if (!loader) {
    return {
      module: null,
      error: new Error('ReservationForm.vue is missing'),
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

function readReservationFormSource() {
  return readFileSync(resolve(process.cwd(), 'src/components/form/ReservationForm.vue'), 'utf-8')
}

interface ReservationFormValue {
  startTime: string
  endTime: string
  purpose: string
  remark: string
}

const validInitialValue: ReservationFormValue = {
  startTime: '2026-04-08T09:00:00',
  endTime: '2026-04-08T10:00:00',
  purpose: '课程实验',
  remark: '',
}

const invalidDurationInitialValue: ReservationFormValue = {
  startTime: '2026-04-08T09:00:00',
  endTime: '2026-04-08T09:10:00',
  purpose: '课程实验',
  remark: '',
}

function createComponentStubs(options?: { interactiveTimeRangePicker?: boolean }) {
  const { interactiveTimeRangePicker = true } = options ?? {}

  return {
    ElForm: { template: '<form><slot /></form>' },
    ElFormItem: { template: '<div><slot /></div>' },
    ElButton: {
      inheritAttrs: false,
      emits: ['click'],
      template:
        '<button type="button" v-bind="$attrs" class="reservation-form__submit" @click="$emit(\'click\')"><slot /></button>',
    },
    ElInput: {
      inheritAttrs: false,
      props: ['modelValue', 'type'],
      emits: ['update:modelValue'],
      template:
        '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    },
    TimeRangePicker: interactiveTimeRangePicker
      ? {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            "<button type=\"button\" class=\"time-range-picker\" @click=\"$emit('update:modelValue', { startTime: '2026-04-08T10:00:00', endTime: '2026-04-08T11:00:00' })\"></button>",
        }
      : {
          props: ['modelValue'],
          template: '<div class="time-range-picker"></div>',
        },
    ConflictWarning: {
      props: ['localWarnings', 'serverConflictMessage'],
      template:
        '<div class="conflict-warning-stub">{{ localWarnings?.join(\'|\') }}{{ serverConflictMessage }}</div>',
    },
  }
}

describe('ReservationForm', () => {
  it('预约表单只保留时间、用途、备注与提交入口，不再承载旧单设备下拉真相', () => {
    const source = readReservationFormSource()

    expect(source).toContain('selectedDeviceCount')
    expect(source).toContain('data-testid="reservation-form"')
    expect(source).toContain('data-testid="reservation-time-range"')
    expect(source).toContain('data-testid="reservation-purpose-input"')
    expect(source).toContain('data-testid="reservation-remark-input"')
    expect(source).toContain('data-testid="reservation-submit-button"')
    expect(source).not.toContain('reservation-device-select')
    expect(source).not.toContain("import AppSelect from '@/components/common/dropdown/AppSelect.vue'")
    expect(source).not.toContain('<AppSelect')
  })

  it('时间变更时会同步发出 change 事件并清空旧冲突提示', async () => {
    const { module, error } = await loadReservationForm()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        initialValue: validInitialValue,
        selectedDeviceCount: 1,
        serverConflictMessage: '该设备在所选时间段已被预约',
      },
      global: {
        stubs: createComponentStubs(),
      },
    })

    await wrapper.get('.time-range-picker').trigger('click')

    const changeEvents = wrapper.emitted('change') ?? []

    expect(wrapper.emitted('clear-conflict')).toHaveLength(1)
    expect(changeEvents[changeEvents.length - 1]?.[0]).toEqual({
      startTime: '2026-04-08T10:00:00',
      endTime: '2026-04-08T11:00:00',
      purpose: '课程实验',
      remark: '',
    })
  })

  it('表单合法时提交时间、用途和备注，不再携带 deviceIds', async () => {
    const { module, error } = await loadReservationForm()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        initialValue: validInitialValue,
        selectedDeviceCount: 2,
      },
      global: {
        stubs: createComponentStubs({ interactiveTimeRangePicker: false }),
      },
    })

    await wrapper.get('[data-testid="reservation-submit-button"]').trigger('click')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({
      startTime: '2026-04-08T09:00:00',
      endTime: '2026-04-08T10:00:00',
      purpose: '课程实验',
      remark: '',
    })
    expect(wrapper.emitted('submit')?.[0]?.[0]).not.toHaveProperty('deviceIds')
  })

  it('未选择任何设备时会阻止提交并展示提醒', async () => {
    const { module, error } = await loadReservationForm()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        initialValue: validInitialValue,
        selectedDeviceCount: 0,
      },
      global: {
        stubs: createComponentStubs({ interactiveTimeRangePicker: false }),
      },
    })

    await wrapper.get('[data-testid="reservation-submit-button"]').trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.get('.conflict-warning-stub').text()).toContain('请至少选择 1 台设备')
  })

  it('本地时间规则不满足时阻止提交并展示提醒', async () => {
    const { module, error } = await loadReservationForm()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        initialValue: invalidDurationInitialValue,
        selectedDeviceCount: 1,
      },
      global: {
        stubs: createComponentStubs({ interactiveTimeRangePicker: false }),
      },
    })

    await wrapper.get('[data-testid="reservation-submit-button"]').trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.get('.conflict-warning-stub').text()).toContain('预约时长不能少于 30 分钟')
  })
})
