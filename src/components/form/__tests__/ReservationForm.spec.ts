import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { computed, defineComponent, ref } from 'vue'
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
  {
    id: 'device-2',
    name: '频谱仪',
    deviceNumber: 'DEV-002',
    status: 'AVAILABLE',
  },
]

interface ReservationFormValue {
  deviceId: string
  startTime: string
  endTime: string
  purpose: string
  remark: string
}

const validInitialValue: ReservationFormValue = {
  deviceId: 'device-1',
  startTime: '2026-03-18T09:00:00',
  endTime: '2026-03-18T10:00:00',
  purpose: '课程实验',
  remark: '',
}

const invalidDurationInitialValue: ReservationFormValue = {
  deviceId: 'device-1',
  startTime: '2026-03-18T09:00:00',
  endTime: '2026-03-18T09:10:00',
  purpose: '课程实验',
  remark: '',
}

interface SelectOptionSnapshot {
  label: string
  value: string
}

function collectSelectOptionSnapshots(nodes: Array<{ children?: unknown; props?: unknown }>) {
  const options: SelectOptionSnapshot[] = []

  nodes.forEach((node) => {
    if (Array.isArray(node.children)) {
      options.push(
        ...collectSelectOptionSnapshots(
          node.children as Array<{ children?: unknown; props?: unknown }>,
        ),
      )
    }

    const props = node.props as Record<string, unknown> | null | undefined

    if (typeof props?.value === 'string' && typeof props?.label === 'string') {
      options.push({
        value: props.value,
        label: props.label,
      })
    }
  })

  return options
}

const appSelectStub = defineComponent({
  name: 'AppSelect',
  inheritAttrs: false,
  props: ['modelValue', 'placeholder', 'disabled'],
  emits: ['update:modelValue'],
  setup(props, { emit, slots }) {
    const selectedLabel = computed(() => {
      const options = collectSelectOptionSnapshots(
        (slots.default?.() as Array<{ children?: unknown; props?: unknown }> | undefined) ?? [],
      )

      return options.find((option) => option.value === props.modelValue)?.label ?? ''
    })

    function handleChange(event: Event) {
      emit('update:modelValue', (event.target as HTMLSelectElement).value)
    }

    return {
      handleChange,
      selectedLabel,
    }
  },
  template:
    '<div class="app-select-stub" :class="$attrs.class" :style="$attrs.style" :data-placeholder="placeholder" :data-selected-label="selectedLabel"><select class="app-select-stub__control" :value="modelValue" :disabled="disabled" @change="handleChange"><slot /></select><span class="app-select-stub__selected-label">{{ selectedLabel }}</span></div>',
})

function createComponentStubs(options?: { interactiveTimeRangePicker?: boolean }) {
  const { interactiveTimeRangePicker = true } = options ?? {}

  return {
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
    AppSelect: appSelectStub,
    ElOption: {
      props: ['label', 'value'],
      template: '<option :value="value">{{ label }}</option>',
    },
    TimeRangePicker: interactiveTimeRangePicker
      ? {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            "<button class=\"time-range-picker\" @click=\"$emit('update:modelValue', { startTime: '2026-03-18T10:00:00', endTime: '2026-03-18T11:00:00' })\"></button>",
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

function mountReservationFormHarness(component: object) {
  let submittedValue: ReservationFormValue | null = null

  const ReservationFormHarness = defineComponent({
    components: {
      ReservationForm: component,
    },
    setup() {
      const serverConflictMessage = ref('该设备在所选时间段已被预约')
      const clearConflictCount = ref(0)

      function handleClearConflict() {
        clearConflictCount.value += 1
        serverConflictMessage.value = ''
      }

      function handleSubmit(value: ReservationFormValue) {
        submittedValue = value
      }

      return {
        clearConflictCount,
        deviceOptions,
        handleClearConflict,
        handleSubmit,
        initialValue: validInitialValue,
        serverConflictMessage,
      }
    },
    template:
      '<div><span class="reservation-form-harness__clear-count">{{ clearConflictCount }}</span><ReservationForm :initial-value="initialValue" :device-options="deviceOptions" :server-conflict-message="serverConflictMessage" @clear-conflict="handleClearConflict" @submit="handleSubmit" /></div>',
  })

  const wrapper = mount(ReservationFormHarness, {
    global: {
      stubs: createComponentStubs(),
    },
  })

  return {
    getSubmittedValue: () => submittedValue,
    wrapper,
  }
}

describe('ReservationForm', () => {
  it('预约表单改为通过 AppSelect 收口设备选择，并移除局部下拉补丁', () => {
    const source = readReservationFormSource()

    expect(source).toContain('var(--app-border-soft)')
    expect(source).toContain('var(--app-surface-card)')
    expect(source).toContain(':deep(.el-input-number)')
    expect(source).toContain(':deep(.el-input-number:hover)')
    expect(source).toContain("import AppSelect from '@/components/common/dropdown/AppSelect.vue'")
    expect(source).toContain('<AppSelect')
    expect(source).toContain('@update:modelValue="handleDeviceChange"')
    expect(source).not.toContain('<el-select')
    expect(source).not.toContain(':deep(.el-select__wrapper)')
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

    const { wrapper, getSubmittedValue } = mountReservationFormHarness(module.default)

    const deviceSelect = wrapper.getComponent({ name: 'AppSelect' })
    const deviceSelectRoot = wrapper.get('.reservation-form__device.app-select-stub')

    expect(deviceSelect.props('modelValue')).toBe('device-1')
    expect(deviceSelect.props('placeholder')).toBe('请选择可预约设备')
    expect(deviceSelectRoot.attributes('data-placeholder')).toBe('请选择可预约设备')
    expect(deviceSelectRoot.findAll('option')).toHaveLength(deviceOptions.length)
    expect(deviceSelectRoot.text()).toContain('示波器（DEV-001）')
    expect(wrapper.get('.conflict-warning-stub').text()).toContain('该设备在所选时间段已被预约')

    await deviceSelectRoot.get('.app-select-stub__control').setValue('device-2')

    expect(wrapper.get('.reservation-form-harness__clear-count').text()).toBe('1')
    expect(wrapper.get('.conflict-warning-stub').text()).not.toContain('该设备在所选时间段已被预约')
    expect(deviceSelect.props('modelValue')).toBe('device-2')

    await wrapper.get('.time-range-picker').trigger('click')

    expect(wrapper.get('.reservation-form-harness__clear-count').text()).toBe('2')

    await wrapper.get('.reservation-form__submit').trigger('click')

    expect(getSubmittedValue()).toEqual({
      deviceId: 'device-2',
      startTime: '2026-03-18T10:00:00',
      endTime: '2026-03-18T11:00:00',
      purpose: '课程实验',
      remark: '',
    })
  })

  it('设备下拉在选中后显示设备名称并保留 string deviceId', async () => {
    const { module, error } = await loadReservationForm()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const { wrapper, getSubmittedValue } = mountReservationFormHarness(module.default)
    const deviceSelectRoot = wrapper.get('.reservation-form__device.app-select-stub')

    expect(deviceSelectRoot.get('.app-select-stub__selected-label').text()).toBe(
      '示波器（DEV-001）',
    )
    expect(deviceSelectRoot.attributes('data-selected-label')).toBe('示波器（DEV-001）')

    await deviceSelectRoot.get('.app-select-stub__control').setValue('device-2')

    expect(deviceSelectRoot.get('.app-select-stub__selected-label').text()).toBe(
      '频谱仪（DEV-002）',
    )
    expect(deviceSelectRoot.attributes('data-selected-label')).toBe('频谱仪（DEV-002）')

    await wrapper.get('.reservation-form__submit').trigger('click')

    expect(getSubmittedValue()).toEqual({
      deviceId: 'device-2',
      startTime: '2026-03-18T09:00:00',
      endTime: '2026-03-18T10:00:00',
      purpose: '课程实验',
      remark: '',
    })
    expect(typeof getSubmittedValue()?.deviceId).toBe('string')
  })

  it('设备下拉在清空冲突提示后仍显示已选设备文案', async () => {
    const { module, error } = await loadReservationForm()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const { wrapper } = mountReservationFormHarness(module.default)
    const deviceSelectRoot = wrapper.get('.reservation-form__device.app-select-stub')

    await deviceSelectRoot.get('.app-select-stub__control').setValue('device-2')

    expect(wrapper.get('.reservation-form-harness__clear-count').text()).toBe('1')
    expect(wrapper.get('.conflict-warning-stub').text()).not.toContain('该设备在所选时间段已被预约')
    expect(deviceSelectRoot.get('.app-select-stub__selected-label').text()).toBe(
      '频谱仪（DEV-002）',
    )

    await wrapper.get('.time-range-picker').trigger('click')

    expect(wrapper.get('.reservation-form-harness__clear-count').text()).toBe('2')
    expect(deviceSelectRoot.get('.app-select-stub__selected-label').text()).toBe(
      '频谱仪（DEV-002）',
    )
    expect(deviceSelectRoot.attributes('data-selected-label')).toBe('频谱仪（DEV-002）')
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
        deviceOptions,
      },
      global: {
        stubs: createComponentStubs({ interactiveTimeRangePicker: false }),
      },
    })

    await wrapper.get('.reservation-form__submit').trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('预约时长不能少于 30 分钟')
  })
})
