import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

const deviceOptions = [
  {
    id: 'device-1',
    name: '示波器',
    deviceNumber: 'DEV-001',
    status: 'AVAILABLE',
  },
]

describe('ReservationForm', () => {
  it('预约表单容器只消费主题 token，不保留浅色硬编码表面', () => {
    const source = readReservationFormSource()

    expect(source).toContain('var(--app-border-soft)')
    expect(source).toContain('var(--app-surface-card)')
    expect(source).not.toContain('rgba(148, 163, 184, 0.18)')
    expect(source).not.toContain('rgba(255, 255, 255, 0.94)')
  })

  it('表单合法时提交预约，并在字段变更时清空旧冲突提示', async () => {
    const { module, error } = await loadReservationForm()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        initialValue: {
          deviceId: 'device-1',
          startTime: '2026-03-18T09:00:00',
          endTime: '2026-03-18T10:00:00',
          purpose: '课程实验',
          remark: '',
        },
        deviceOptions,
        serverConflictMessage: '该设备在所选时间段已被预约',
      },
      global: {
        stubs: {
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          ElButton: {
            emits: ['click'],
            template:
              '<button class="reservation-form__submit" @click="$emit(\'click\')"><slot /></button>',
          },
          ElInput: {
            props: ['modelValue', 'type'],
            emits: ['update:modelValue'],
            template:
              '<input :class="$attrs.class" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
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
          TimeRangePicker: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              "<button class=\"time-range-picker\" @click=\"$emit('update:modelValue', { startTime: '2026-03-18T10:00:00', endTime: '2026-03-18T11:00:00' })\"></button>",
          },
          ConflictWarning: {
            props: ['localWarnings', 'serverConflictMessage'],
            template:
              '<div class="conflict-warning-stub">{{ localWarnings?.join(\'|\') }}{{ serverConflictMessage }}</div>',
          },
        },
      },
    })

    await wrapper.get('.time-range-picker').trigger('click')

    expect(wrapper.emitted('clear-conflict')).toEqual([[]])

    await wrapper.get('.reservation-form__submit').trigger('click')

    expect(wrapper.emitted('submit')).toEqual([
      [
        {
          deviceId: 'device-1',
          startTime: '2026-03-18T10:00:00',
          endTime: '2026-03-18T11:00:00',
          purpose: '课程实验',
          remark: '',
        },
      ],
    ])
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
        initialValue: {
          deviceId: 'device-1',
          startTime: '2026-03-18T09:00:00',
          endTime: '2026-03-18T09:10:00',
          purpose: '课程实验',
          remark: '',
        },
        deviceOptions,
      },
      global: {
        stubs: {
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          ElButton: {
            emits: ['click'],
            template:
              '<button class="reservation-form__submit" @click="$emit(\'click\')"><slot /></button>',
          },
          ElInput: {
            props: ['modelValue', 'type'],
            emits: ['update:modelValue'],
            template:
              '<input :class="$attrs.class" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
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
          TimeRangePicker: {
            props: ['modelValue'],
            template: '<div class="time-range-picker"></div>',
          },
          ConflictWarning: {
            props: ['localWarnings'],
            template: '<div class="conflict-warning-stub">{{ localWarnings?.join(\'|\') }}</div>',
          },
        },
      },
    })

    await wrapper.get('.reservation-form__submit').trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('预约时长不能少于 30 分钟')
  })
})
