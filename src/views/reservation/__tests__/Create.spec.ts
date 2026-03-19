import { setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    vi.spyOn(reservationStore, 'createReservation').mockResolvedValue({
      id: 'reservation-1',
      batchId: null,
      userId: 'user-1',
      createdBy: 'user-1',
      reservationMode: 'SELF',
      deviceId: 'device-1',
      status: 'PENDING_DEVICE_APPROVAL',
      signStatus: 'NOT_CHECKED_IN',
      approvalModeSnapshot: 'DEVICE_ONLY',
      deviceApproverId: null,
      systemApproverId: null,
    })

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          ReservationForm: {
            props: ['deviceOptions', 'serverConflictMessage'],
            emits: ['submit', 'clear-conflict'],
            methods: {
              emitPayload() {
                this.$emit('submit', {
                  deviceId: 'device-1',
                  startTime: '2026-03-18T09:00:00',
                  endTime: '2026-03-18T10:00:00',
                  purpose: '课程实验',
                  remark: '',
                })
              },
            },
            template:
              '<div><span class="device-options">{{ deviceOptions.map((item) => item.id).join(\',\') }}</span><button class="emit-form" @click="emitPayload"></button></div>',
          },
          ConfirmDialog: {
            props: ['modelValue'],
            emits: ['confirm', 'update:modelValue'],
            template:
              '<div><span v-if="modelValue" class="confirm-open">open</span><button class="confirm-submit" @click="$emit(\'confirm\')"></button></div>',
          },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElCard: { template: '<div><slot /></div>' },
          ElRadioGroup: { template: '<div><slot /></div>' },
          ElRadioButton: { template: '<button><slot /></button>' },
          ElSelect: { template: '<div><slot /></div>' },
          ElOption: { template: '<div><slot /></div>' },
        },
      },
    })

    await flushPromises()

    expect(deviceStore.fetchDeviceList).toHaveBeenCalledWith({ page: 1, size: 100 })
    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)
    expect(wrapper.get('.device-options').text()).toBe('device-1')

    await wrapper.get('.emit-form').trigger('click')
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
    vi.spyOn(reservationStore, 'createProxyReservation').mockResolvedValue({
      id: 'reservation-2',
      batchId: null,
      userId: 'user-1',
      createdBy: 'admin-1',
      reservationMode: 'ON_BEHALF',
      deviceId: 'device-1',
      status: 'PENDING_SYSTEM_APPROVAL',
      signStatus: 'NOT_CHECKED_IN',
      approvalModeSnapshot: 'DEVICE_ONLY',
      deviceApproverId: null,
      systemApproverId: null,
    })

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
          ElSelect: {
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
      .mockResolvedValue({
        id: 'reservation-2',
        batchId: null,
        userId: 'user-1',
        createdBy: 'admin-1',
        reservationMode: 'ON_BEHALF',
        deviceId: 'device-1',
        status: 'PENDING_SYSTEM_APPROVAL',
        signStatus: 'NOT_CHECKED_IN',
        approvalModeSnapshot: 'DEVICE_ONLY',
        deviceApproverId: null,
        systemApproverId: null,
      })

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
          ElSelect: {
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
})
