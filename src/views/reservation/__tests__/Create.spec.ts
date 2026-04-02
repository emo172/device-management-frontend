import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReservationResponse } from '@/api/reservations'
import { FreezeStatus, UserRole } from '@/enums'
import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { useDeviceStore } from '@/stores/modules/device'
import { useReservationStore } from '@/stores/modules/reservation'
import { useUserStore } from '@/stores/modules/user'

const pushMock = vi.fn()
const successMock = vi.fn()
const warningMock = vi.fn()
const reservationViewModules = import.meta.glob('../*.vue')

function readReservationViewSource(fileName: string) {
  return readFileSync(resolve(process.cwd(), `src/views/reservation/${fileName}`), 'utf-8')
}

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    useRouter: () => ({ push: pushMock }),
    useRoute: () => ({ path: '/reservations/create' }),
  }
})

vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal<typeof import('element-plus')>()

  return {
    ...actual,
    ElMessage: {
      success: successMock,
      warning: warningMock,
    },
  }
})

async function loadCreateView() {
  const loader = reservationViewModules['../Create.vue']

  if (!loader) {
    return {
      module: null,
      error: new Error('Create.vue is missing'),
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

function createReservationActionResponse(
  overrides?: Partial<ReservationResponse>,
): ReservationResponse {
  return {
    id: 'reservation-1',
    batchId: null,
    userId: 'user-1',
    userName: 'demo-user',
    createdBy: 'user-1',
    createdByName: 'demo-user',
    reservationMode: 'SELF',
    deviceId: 'device-1',
    deviceName: '示波器',
    deviceNumber: 'DEV-001',
    deviceStatus: 'AVAILABLE',
    startTime: '2026-03-18T09:00:00',
    endTime: '2026-03-18T10:00:00',
    purpose: '课程实验',
    remark: '',
    status: 'PENDING_DEVICE_APPROVAL',
    signStatus: 'NOT_CHECKED_IN',
    approvalModeSnapshot: 'DEVICE_ONLY',
    deviceApproverId: null,
    deviceApproverName: null,
    deviceApprovedAt: null,
    deviceApprovalRemark: null,
    systemApproverId: null,
    systemApproverName: null,
    systemApprovedAt: null,
    systemApprovalRemark: null,
    cancelReason: null,
    cancelTime: null,
    checkedInAt: null,
    createdAt: '2026-03-16T08:00:00',
    updatedAt: '2026-03-16T08:00:00',
    ...overrides,
  }
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
    '<div class="app-select-stub" :class="$attrs.class" :data-placeholder="placeholder" :data-selected-label="selectedLabel"><select class="app-select-stub__control" :value="modelValue" :disabled="disabled" @change="handleChange"><slot /></select><span class="app-select-stub__selected-label">{{ selectedLabel }}</span></div>',
})

function createInteractiveReservationFormStubs() {
  return {
    ConfirmDialog: {
      props: ['modelValue'],
      emits: ['confirm', 'update:modelValue'],
      template:
        '<div><span v-if="modelValue" class="confirm-open">open</span><button v-if="modelValue" type="button" class="confirm-submit" @click="$emit(\'confirm\')"></button></div>',
    },
    ElButton: {
      emits: ['click'],
      template:
        '<button type="button" :class="$attrs.class" @click="$emit(\'click\')"><slot /></button>',
    },
    ElCard: { template: '<div><slot /></div>' },
    ElRadioGroup: { template: '<div><slot /></div>' },
    ElRadioButton: { template: '<button type="button"><slot /></button>' },
    ElForm: { template: '<form><slot /></form>' },
    ElFormItem: { template: '<div><slot /></div>' },
    ElInput: {
      props: ['modelValue'],
      emits: ['update:modelValue'],
      template:
        '<input :class="$attrs.class" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    },
    AppSelect: appSelectStub,
    ElOption: {
      props: ['label', 'value'],
      template: '<option :value="value">{{ label }}</option>',
    },
    TimeRangePicker: {
      props: ['modelValue'],
      emits: ['update:modelValue'],
      template:
        '<button type="button" class="time-range-picker" @click="$emit(\'update:modelValue\', { startTime: \'2026-03-18T09:00:00\', endTime: \'2026-03-18T10:00:00\' })"></button>',
    },
    ConflictWarning: {
      props: ['localWarnings', 'serverConflictMessage'],
      template:
        '<div class="conflict-warning-stub">{{ localWarnings?.join(\'|\') }}{{ serverConflictMessage }}</div>',
    },
  }
}

describe('reservation create view', () => {
  beforeEach(() => {
    pushMock.mockReset()
    successMock.mockReset()
    warningMock.mockReset()
    setActivePinia(createAppPinia())
  })

  it('普通用户创建预约时加载可预约设备并在确认后提交本人预约', async () => {
    const { module, error } = await loadCreateView()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'user@example.com',
      phone: '13800138000',
      realName: '普通用户',
      role: UserRole.USER,
      userId: 'user-1',
      username: 'user',
    })

    const deviceStore = useDeviceStore()
    const reservationStore = useReservationStore()

    vi.spyOn(deviceStore, 'fetchDeviceList').mockResolvedValue({
      total: 2,
      records: [
        {
          id: 'device-1',
          name: '示波器',
          deviceNumber: 'DEV-001',
          categoryId: 'cat-1',
          categoryName: '测试设备',
          status: 'AVAILABLE',
          description: '可预约',
          location: 'A-101',
        },
        {
          id: 'device-2',
          name: '损坏设备',
          deviceNumber: 'DEV-002',
          categoryId: 'cat-1',
          categoryName: '测试设备',
          status: 'BORROWED',
          description: '不可预约',
          location: 'A-102',
        },
      ],
    })
    vi.spyOn(reservationStore, 'createReservation').mockResolvedValue(
      createReservationActionResponse(),
    )

    const wrapper = mount(module.default, {
      global: {
        stubs: createInteractiveReservationFormStubs(),
      },
    })

    await flushPromises()

    expect(deviceStore.fetchDeviceList).toHaveBeenCalledWith({ page: 1, size: 100 })
    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
    const deviceSelectRoot = wrapper.get('.reservation-form__device.app-select-stub')

    expect(deviceSelectRoot.findAll('option')).toHaveLength(1)

    await deviceSelectRoot.get('.app-select-stub__control').setValue('device-1')
    await wrapper.get('.time-range-picker').trigger('click')
    await wrapper.get('.reservation-form__purpose').setValue('课程实验')

    await wrapper.get('.reservation-form__submit').trigger('click')
    expect(wrapper.find('.confirm-open').exists()).toBe(true)

    await wrapper.get('.confirm-submit').trigger('click')

    expect(reservationStore.createReservation).toHaveBeenCalledWith({
      deviceId: 'device-1',
      startTime: '2026-03-18T09:00:00',
      endTime: '2026-03-18T10:00:00',
      purpose: '课程实验',
      remark: '',
    })
    expect(pushMock).toHaveBeenCalledWith('/reservations/reservation-1')
    expect(successMock).toHaveBeenCalledWith('预约创建成功')
  })

  it('创建页在选择设备后保留已选设备文案直到确认提交', async () => {
    const { module, error } = await loadCreateView()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'user@example.com',
      phone: '13800138000',
      realName: '普通用户',
      role: UserRole.USER,
      userId: 'user-1',
      username: 'user',
    })

    const deviceStore = useDeviceStore()
    const reservationStore = useReservationStore()

    vi.spyOn(deviceStore, 'fetchDeviceList').mockResolvedValue({
      total: 2,
      records: [
        {
          id: 'device-1',
          name: '示波器',
          deviceNumber: 'DEV-001',
          categoryId: 'cat-1',
          categoryName: '测试设备',
          status: 'AVAILABLE',
          description: '可预约',
          location: 'A-101',
        },
        {
          id: 'device-2',
          name: '频谱仪',
          deviceNumber: 'DEV-002',
          categoryId: 'cat-1',
          categoryName: '测试设备',
          status: 'AVAILABLE',
          description: '可预约',
          location: 'A-102',
        },
      ],
    })
    vi.spyOn(reservationStore, 'createReservation').mockResolvedValue(
      createReservationActionResponse(),
    )

    const wrapper = mount(module.default, {
      global: {
        stubs: createInteractiveReservationFormStubs(),
      },
    })

    await flushPromises()

    const deviceSelectRoot = wrapper.get('.reservation-form__device.app-select-stub')

    await deviceSelectRoot.get('.app-select-stub__control').setValue('device-1')
    await wrapper.get('.time-range-picker').trigger('click')
    await wrapper.get('.reservation-form__purpose').setValue('课程实验')

    expect(deviceSelectRoot.attributes('data-selected-label')).toBe('示波器（DEV-001）')
    expect(deviceSelectRoot.text()).toContain('示波器（DEV-001）')

    await wrapper.get('.reservation-form__submit').trigger('click')

    expect(wrapper.find('.confirm-open').exists()).toBe(true)
    expect(deviceSelectRoot.attributes('data-selected-label')).toBe('示波器（DEV-001）')
    expect(deviceSelectRoot.text()).toContain('示波器（DEV-001）')

    await wrapper.get('.confirm-submit').trigger('click')
    await flushPromises()

    expect(reservationStore.createReservation).toHaveBeenCalledWith({
      deviceId: 'device-1',
      startTime: '2026-03-18T09:00:00',
      endTime: '2026-03-18T10:00:00',
      purpose: '课程实验',
      remark: '',
    })
    expect(deviceSelectRoot.attributes('data-selected-label')).toBe('示波器（DEV-001）')
    expect(deviceSelectRoot.text()).toContain('示波器（DEV-001）')
  })

  it('创建页在选择时间范围后提交 ISO 时间字符串', async () => {
    const { module, error } = await loadCreateView()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'user@example.com',
      phone: '13800138000',
      realName: '普通用户',
      role: UserRole.USER,
      userId: 'user-1',
      username: 'user',
    })

    const deviceStore = useDeviceStore()
    const reservationStore = useReservationStore()

    vi.spyOn(deviceStore, 'fetchDeviceList').mockResolvedValue({
      total: 1,
      records: [
        {
          id: 'device-1',
          name: '示波器',
          deviceNumber: 'DEV-001',
          categoryId: 'cat-1',
          categoryName: '测试设备',
          status: 'AVAILABLE',
          description: '可预约',
          location: 'A-101',
        },
      ],
    })
    const createReservationSpy = vi
      .spyOn(reservationStore, 'createReservation')
      .mockResolvedValue(createReservationActionResponse())

    const wrapper = mount(module.default, {
      global: {
        stubs: createInteractiveReservationFormStubs(),
      },
    })

    await flushPromises()

    await wrapper
      .get('.reservation-form__device.app-select-stub .app-select-stub__control')
      .setValue('device-1')
    await wrapper.get('.time-range-picker').trigger('click')
    await wrapper.get('.reservation-form__purpose').setValue('课程实验')
    await wrapper.get('.reservation-form__submit').trigger('click')

    expect(wrapper.find('.confirm-open').exists()).toBe(true)

    await wrapper.get('.confirm-submit').trigger('click')
    await flushPromises()

    expect(createReservationSpy).toHaveBeenCalledTimes(1)

    const payload = createReservationSpy.mock.calls[0]?.[0]

    expect(payload).toBeDefined()

    if (!payload) {
      return
    }

    expect(payload).toMatchObject({
      deviceId: 'device-1',
      startTime: '2026-03-18T09:00:00',
      endTime: '2026-03-18T10:00:00',
      purpose: '课程实验',
      remark: '',
    })
    expect(typeof payload.startTime).toBe('string')
    expect(typeof payload.endTime).toBe('string')
    expect(payload.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
    expect(payload.endTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
  })

  it('系统管理员可切换代预约并加载 USER 角色目标用户', async () => {
    const { module, error } = await loadCreateView()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'admin@example.com',
      phone: '13800138000',
      realName: '系统管理员',
      role: UserRole.SYSTEM_ADMIN,
      userId: 'admin-1',
      username: 'admin',
    })

    const deviceStore = useDeviceStore()
    const reservationStore = useReservationStore()
    const userStore = useUserStore()

    vi.spyOn(deviceStore, 'fetchDeviceList').mockResolvedValue({
      total: 1,
      records: [
        {
          id: 'device-1',
          name: '示波器',
          deviceNumber: 'DEV-001',
          categoryId: 'cat-1',
          categoryName: '测试设备',
          status: 'AVAILABLE',
          description: '可预约',
          location: 'A-101',
        },
      ],
    })
    vi.spyOn(userStore, 'fetchReservationTargetUsers').mockResolvedValue([
      {
        id: 'user-1',
        username: 'user-1',
        email: 'user1@example.com',
        realName: '普通用户',
        phone: '13800138000',
        status: 1,
        freezeStatus: FreezeStatus.NORMAL,
        roleId: 'role-user',
        roleName: UserRole.USER,
      },
    ])
    vi.spyOn(reservationStore, 'createProxyReservation').mockResolvedValue(
      createReservationActionResponse({
        id: 'reservation-2',
        userName: '普通用户',
        createdBy: 'admin-1',
        createdByName: 'admin',
        reservationMode: 'ON_BEHALF',
        status: 'PENDING_SYSTEM_APPROVAL',
      }),
    )

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          ReservationForm: {
            props: ['deviceOptions'],
            emits: ['submit'],
            methods: {
              emitPayload() {
                this.$emit('submit', {
                  deviceId: 'device-1',
                  startTime: '2026-03-18T09:00:00',
                  endTime: '2026-03-18T10:00:00',
                  purpose: '代同学预约实验',
                  remark: '请准时到场',
                })
              },
            },
            template: '<button class="emit-form" @click="emitPayload"></button>',
          },
          ConfirmDialog: {
            props: ['modelValue'],
            emits: ['confirm', 'update:modelValue'],
            template:
              '<div><button v-if="modelValue" class="confirm-submit" @click="$emit(\'confirm\')"></button></div>',
          },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElCard: { template: '<div><slot /></div>' },
          ElRadioGroup: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<div><button class="proxy-mode" @click="$emit(\'update:modelValue\', \'proxy\')"></button><slot /></div>',
          },
          ElRadioButton: { template: '<button><slot /></button>' },
          AppSelect: {
            name: 'AppSelect',
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<div><button class="target-user" @click="$emit(\'update:modelValue\', \'user-1\')"></button><slot /></div>',
          },
          ElOption: { template: '<div><slot /></div>' },
        },
      },
    })

    await flushPromises()

    expect(userStore.fetchReservationTargetUsers).toHaveBeenCalledWith({ page: 1, size: 100 })
    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)

    await wrapper.get('.proxy-mode').trigger('click')
    await wrapper.get('.target-user').trigger('click')
    await wrapper.get('.emit-form').trigger('click')
    await wrapper.get('.confirm-submit').trigger('click')

    expect(reservationStore.createProxyReservation).toHaveBeenCalledWith({
      targetUserId: 'user-1',
      deviceId: 'device-1',
      startTime: '2026-03-18T09:00:00',
      endTime: '2026-03-18T10:00:00',
      purpose: '代同学预约实验',
      remark: '请准时到场',
    })
    expect(pushMock).toHaveBeenCalledWith('/reservations/reservation-2')
  })

  it('系统管理员从代预约切回本人预约后会清空旧目标用户，重新进入代预约时必须重新选择', async () => {
    const { module, error } = await loadCreateView()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'admin@example.com',
      phone: '13800138000',
      realName: '系统管理员',
      role: UserRole.SYSTEM_ADMIN,
      userId: 'admin-1',
      username: 'admin',
    })

    const deviceStore = useDeviceStore()
    const reservationStore = useReservationStore()
    const userStore = useUserStore()

    vi.spyOn(deviceStore, 'fetchDeviceList').mockResolvedValue({
      total: 1,
      records: [
        {
          id: 'device-1',
          name: '示波器',
          deviceNumber: 'DEV-001',
          categoryId: 'cat-1',
          categoryName: '测试设备',
          status: 'AVAILABLE',
          description: '可预约',
          location: 'A-101',
        },
      ],
    })
    vi.spyOn(userStore, 'fetchReservationTargetUsers').mockResolvedValue([
      {
        id: 'user-1',
        username: 'user-1',
        email: 'user1@example.com',
        realName: '普通用户',
        phone: '13800138000',
        status: 1,
        freezeStatus: FreezeStatus.NORMAL,
        roleId: 'role-user',
        roleName: UserRole.USER,
      },
    ])
    const createProxyReservationSpy = vi
      .spyOn(reservationStore, 'createProxyReservation')
      .mockResolvedValue(createReservationActionResponse({ id: 'reservation-2' }))

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          ReservationForm: {
            props: ['deviceOptions'],
            emits: ['submit'],
            methods: {
              emitPayload() {
                this.$emit('submit', {
                  deviceId: 'device-1',
                  startTime: '2026-03-18T09:00:00',
                  endTime: '2026-03-18T10:00:00',
                  purpose: '代同学预约实验',
                  remark: '请准时到场',
                })
              },
            },
            template: '<button class="emit-form" @click="emitPayload"></button>',
          },
          ConfirmDialog: {
            props: ['modelValue'],
            emits: ['confirm', 'update:modelValue'],
            template:
              '<div><button v-if="modelValue" class="confirm-submit" @click="$emit(\'confirm\')"></button></div>',
          },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElCard: { template: '<div><slot /></div>' },
          ElRadioGroup: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<div><button class="self-mode" @click="$emit(\'update:modelValue\', \'self\')"></button><button class="proxy-mode" @click="$emit(\'update:modelValue\', \'proxy\')"></button><slot /></div>',
          },
          ElRadioButton: { template: '<button><slot /></button>' },
          AppSelect: {
            name: 'AppSelect',
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<div><button class="target-user" @click="$emit(\'update:modelValue\', \'user-1\')"></button><slot /></div>',
          },
          ElOption: { template: '<div><slot /></div>' },
        },
      },
    })

    await flushPromises()
    await wrapper.get('.proxy-mode').trigger('click')
    await wrapper.get('.target-user').trigger('click')
    await wrapper.get('.self-mode').trigger('click')
    await wrapper.get('.proxy-mode').trigger('click')
    await wrapper.get('.emit-form').trigger('click')

    expect(warningMock).toHaveBeenCalledWith('代预约必须先选择目标用户')
    expect(createProxyReservationSpy).not.toHaveBeenCalled()
    expect(wrapper.find('.confirm-submit').exists()).toBe(false)
  })

  it('确认提交前若目标用户被非字符串值冲空，则页面会回退为空并阻止代预约提交', async () => {
    const { module, error } = await loadCreateView()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'admin@example.com',
      phone: '13800138000',
      realName: '系统管理员',
      role: UserRole.SYSTEM_ADMIN,
      userId: 'admin-1',
      username: 'admin',
    })

    const deviceStore = useDeviceStore()
    const reservationStore = useReservationStore()
    const userStore = useUserStore()

    vi.spyOn(deviceStore, 'fetchDeviceList').mockResolvedValue({
      total: 1,
      records: [
        {
          id: 'device-1',
          name: '示波器',
          deviceNumber: 'DEV-001',
          categoryId: 'cat-1',
          categoryName: '测试设备',
          status: 'AVAILABLE',
          description: '可预约',
          location: 'A-101',
        },
      ],
    })
    vi.spyOn(userStore, 'fetchReservationTargetUsers').mockResolvedValue([
      {
        id: 'user-1',
        username: 'user-1',
        email: 'user1@example.com',
        realName: '普通用户',
        phone: '13800138000',
        status: 1,
        freezeStatus: FreezeStatus.NORMAL,
        roleId: 'role-user',
        roleName: UserRole.USER,
      },
    ])
    const createProxyReservationSpy = vi
      .spyOn(reservationStore, 'createProxyReservation')
      .mockResolvedValue(createReservationActionResponse({ id: 'reservation-2' }))

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          ReservationForm: {
            props: ['deviceOptions'],
            emits: ['submit'],
            methods: {
              emitPayload() {
                this.$emit('submit', {
                  deviceId: 'device-1',
                  startTime: '2026-03-18T09:00:00',
                  endTime: '2026-03-18T10:00:00',
                  purpose: '代同学预约实验',
                  remark: '请准时到场',
                })
              },
            },
            template: '<button class="emit-form" @click="emitPayload"></button>',
          },
          ConfirmDialog: {
            props: ['modelValue'],
            emits: ['confirm', 'update:modelValue'],
            template:
              '<div><span v-if="modelValue" class="confirm-open">open</span><button v-if="modelValue" class="confirm-submit" @click="$emit(\'confirm\')"></button></div>',
          },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElCard: { template: '<div><slot /></div>' },
          ElRadioGroup: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<div><button class="proxy-mode" @click="$emit(\'update:modelValue\', \'proxy\')"></button><slot /></div>',
          },
          ElRadioButton: { template: '<button><slot /></button>' },
          AppSelect: {
            name: 'AppSelect',
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<div><button class="target-user" @click="$emit(\'update:modelValue\', \'user-1\')"></button><button class="target-user-invalid" @click="$emit(\'update:modelValue\', { id: \'user-1\' })"></button><slot /></div>',
          },
          ElOption: { template: '<div><slot /></div>' },
        },
      },
    })

    await flushPromises()
    await wrapper.get('.proxy-mode').trigger('click')
    await wrapper.get('.target-user').trigger('click')
    await wrapper.get('.emit-form').trigger('click')

    expect(wrapper.find('.confirm-open').exists()).toBe(true)

    await wrapper.get('.target-user-invalid').trigger('click')
    await wrapper.get('.confirm-submit').trigger('click')

    expect(warningMock).toHaveBeenCalledWith('代预约必须先选择目标用户')
    expect(createProxyReservationSpy).not.toHaveBeenCalled()
  })

  it('系统管理员代预约未选择目标用户时给出显式提示', async () => {
    const { module, error } = await loadCreateView()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'admin@example.com',
      phone: '13800138000',
      realName: '系统管理员',
      role: UserRole.SYSTEM_ADMIN,
      userId: 'admin-1',
      username: 'admin',
    })

    const deviceStore = useDeviceStore()
    const reservationStore = useReservationStore()
    const userStore = useUserStore()

    vi.spyOn(deviceStore, 'fetchDeviceList').mockResolvedValue({
      total: 1,
      records: [
        {
          id: 'device-1',
          name: '示波器',
          deviceNumber: 'DEV-001',
          categoryId: 'cat-1',
          categoryName: '测试设备',
          status: 'AVAILABLE',
          description: '可预约',
          location: 'A-101',
        },
      ],
    })
    vi.spyOn(userStore, 'fetchReservationTargetUsers').mockResolvedValue([])
    const createProxyReservationSpy = vi
      .spyOn(reservationStore, 'createProxyReservation')
      .mockResolvedValue(
        createReservationActionResponse({
          id: 'reservation-2',
          userName: '普通用户',
          createdBy: 'admin-1',
          createdByName: 'admin',
          reservationMode: 'ON_BEHALF',
          status: 'PENDING_SYSTEM_APPROVAL',
        }),
      )

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          ReservationForm: {
            props: ['deviceOptions'],
            emits: ['submit'],
            methods: {
              emitPayload() {
                this.$emit('submit', {
                  deviceId: 'device-1',
                  startTime: '2026-03-18T09:00:00',
                  endTime: '2026-03-18T10:00:00',
                  purpose: '代同学预约实验',
                  remark: '请准时到场',
                })
              },
            },
            template: '<button class="emit-form" @click="emitPayload"></button>',
          },
          ConfirmDialog: {
            props: ['modelValue'],
            emits: ['confirm', 'update:modelValue'],
            template:
              '<div><button v-if="modelValue" class="confirm-submit" @click="$emit(\'confirm\')"></button></div>',
          },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElCard: { template: '<div><slot /></div>' },
          ElRadioGroup: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<div><button class="proxy-mode" @click="$emit(\'update:modelValue\', \'proxy\')"></button><slot /></div>',
          },
          ElRadioButton: { template: '<button><slot /></button>' },
          AppSelect: {
            name: 'AppSelect',
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<div><slot /></div>',
          },
          ElOption: { template: '<div><slot /></div>' },
        },
      },
    })

    await flushPromises()
    await wrapper.get('.proxy-mode').trigger('click')
    await wrapper.get('.emit-form').trigger('click')

    expect(warningMock).toHaveBeenCalledWith('代预约必须先选择目标用户')
    expect(createProxyReservationSpy).not.toHaveBeenCalled()
    expect(wrapper.find('.confirm-submit').exists()).toBe(false)
  })

  it('创建页源码改为消费主题 token，避免模式卡片和约束侧栏在深色下退回默认白底', () => {
    const source = readReservationViewSource('Create.vue')

    // 创建页同时承接模式切换和约束说明，必须锁定主卡片与侧栏 token，避免深色下出现两块脱离主题的浅色面板。
    expect(source).toContain("import AppSelect from '@/components/common/dropdown/AppSelect.vue'")
    expect(source).toContain('<AppSelect')
    expect(source).toContain('var(--app-surface-card)')
    expect(source).toContain('var(--app-tone-brand-surface)')
    expect(source).toContain('var(--app-border-soft)')
    expect(source).toContain('var(--app-shadow-card)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(source).not.toContain('<el-select')
    expect(source).not.toMatch(hardcodedColorPattern)
  })
})
