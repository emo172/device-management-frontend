import { setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, ref, watch } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as categoryApi from '@/api/categories'
import * as deviceApi from '@/api/devices'
import type { BlockingDeviceResponse, ReservationResponse } from '@/api/reservations'
import { FreezeStatus, UserRole } from '@/enums'
import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { useReservationStore } from '@/stores/modules/reservation'
import { useUserStore } from '@/stores/modules/user'

const pushMock = vi.fn()
const successMock = vi.fn()
const warningMock = vi.fn()
const reservationViewModules = import.meta.glob('../*.vue')

interface ReservationFormValue {
  startTime: string
  endTime: string
  purpose: string
  remark: string
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

function createDeviceRecord(index: number) {
  return {
    id: `device-${index}`,
    name: `设备 ${index}`,
    deviceNumber: `DEV-${String(index).padStart(3, '0')}`,
    categoryId: index <= 10 ? 'cat-root' : 'cat-lab',
    categoryName: index <= 10 ? '基础设备' : '实验设备',
    status: 'AVAILABLE',
    description: `设备 ${index} 描述`,
    location: `A-${100 + index}`,
  }
}

function createReservationActionResponse(
  overrides?: Partial<ReservationResponse & { deviceCount: number }>,
) {
  return {
    id: 'reservation-1',
    batchId: null,
    userId: 'user-1',
    userName: 'demo-user',
    createdBy: 'user-1',
    createdByName: 'demo-user',
    reservationMode: 'SELF',
    deviceId: 'device-1',
    deviceName: '设备 1',
    deviceNumber: 'DEV-001',
    deviceCount: 2,
    devices: [
      {
        deviceId: 'device-1',
        deviceName: '设备 1',
        deviceNumber: 'DEV-001',
      },
      {
        deviceId: 'device-2',
        deviceName: '设备 2',
        deviceNumber: 'DEV-002',
      },
    ],
    primaryDeviceId: 'device-1',
    primaryDeviceName: '设备 1',
    primaryDeviceNumber: 'DEV-001',
    deviceStatus: 'AVAILABLE',
    startTime: '2026-04-08T09:00:00',
    endTime: '2026-04-08T10:00:00',
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
    createdAt: '2026-04-07T08:00:00',
    updatedAt: '2026-04-07T08:00:00',
    ...overrides,
  } as ReservationResponse & { deviceCount: number }
}

function createBlockingDevice(
  deviceId: string,
  overrides?: Partial<BlockingDeviceResponse>,
): BlockingDeviceResponse {
  return {
    deviceId,
    deviceName: `冲突设备 ${deviceId}`,
    reasonCode: 'DEVICE_TIME_CONFLICT',
    reasonMessage: `${deviceId} 时间冲突`,
    ...overrides,
  }
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })

  return {
    promise,
    resolve,
    reject,
  }
}

interface TreeOptionSnapshot {
  label?: string
  value?: string
  children?: TreeOptionSnapshot[]
}

function flattenTreeOptions(nodes: TreeOptionSnapshot[] = []): Array<{ label: string; value: string }> {
  return nodes.flatMap((node) => {
    const current =
      typeof node.label === 'string' && typeof node.value === 'string'
        ? [{ label: node.label, value: node.value }]
        : []

    const children = Array.isArray(node.children) ? flattenTreeOptions(node.children) : []

    return [...current, ...children]
  })
}

const appSelectStub = defineComponent({
  name: 'AppSelect',
  inheritAttrs: false,
  props: ['modelValue', 'placeholder', 'disabled'],
  emits: ['update:modelValue'],
  setup(props, { emit, slots }) {
    const selectedLabel = computed(() => {
      const nodes = (slots.default?.() as Array<{ children?: unknown; props?: unknown }> | undefined) ?? []
      const options = nodes.flatMap((node) => {
        const optionProps = node.props as Record<string, unknown> | undefined

        if (typeof optionProps?.value === 'string' && typeof optionProps?.label === 'string') {
          return [{ label: optionProps.label, value: optionProps.value }]
        }

        return []
      })

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
    '<div class="app-select-stub" :class="$attrs.class" :data-selected-label="selectedLabel"><select class="app-select-stub__control" :value="modelValue" :disabled="disabled" @change="handleChange"><slot /></select><span class="app-select-stub__selected-label">{{ selectedLabel }}</span></div>',
})

const appTreeSelectStub = defineComponent({
  name: 'AppTreeSelect',
  inheritAttrs: false,
  props: ['modelValue', 'data', 'placeholder', 'disabled'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const options = computed(() => flattenTreeOptions((props.data as TreeOptionSnapshot[]) ?? []))

    function handleChange(event: Event) {
      emit('update:modelValue', (event.target as HTMLSelectElement).value || null)
    }

    return {
      handleChange,
      options,
    }
  },
  template:
    '<div class="app-tree-select-stub" :class="$attrs.class"><select class="app-tree-select-stub__control" :value="modelValue || null" :disabled="disabled" @change="handleChange"><option value="">全部分类</option><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select></div>',
})

const confirmDialogStub = defineComponent({
  name: 'ConfirmDialog',
  inheritAttrs: false,
  props: {
    modelValue: Boolean,
    title: String,
    message: String,
    loading: Boolean,
    confirmDisabled: Boolean,
  },
  emits: ['confirm', 'update:modelValue'],
  setup(props, { emit }) {
    const keepVisibleDuringClose = ref(props.modelValue)

    watch(
      () => props.modelValue,
      (value) => {
        if (value) {
          keepVisibleDuringClose.value = true
        }
      },
      { immediate: true },
    )

    function handleConfirm() {
      if (props.loading || props.confirmDisabled) {
        return
      }

      emit('confirm')
    }

    return {
      handleConfirm,
      keepVisibleDuringClose,
    }
  },
  template:
    '<div v-if="modelValue || keepVisibleDuringClose" v-bind="$attrs" class="confirm-dialog-stub"><h3 class="confirm-dialog-stub__title">{{ title }}</h3><p class="confirm-dialog-stub__message">{{ message }}</p><button type="button" class="confirm-submit" :disabled="loading || confirmDisabled" @click="handleConfirm"></button></div>',
})

function createCreateViewStubs() {
  return {
    ConsolePageHero: {
      template: '<section class="console-page-hero"><slot name="actions" /></section>',
    },
    ConsoleDetailLayout: {
      template:
        '<div class="console-detail-layout"><div class="console-detail-layout__main"><slot name="main" /></div><div class="console-detail-layout__aside"><slot name="aside" /></div></div>',
    },
    ConsoleAsidePanel: {
      template: '<aside class="console-aside-panel"><slot /></aside>',
    },
    ConsoleFilterPanel: {
      template:
        '<section class="console-filter-panel"><div class="console-filter-panel__fields"><slot /></div><div class="console-filter-panel__actions"><slot name="actions" /></div></section>',
    },
    ReservationForm: {
      props: ['initialValue', 'selectedDeviceCount', 'serverConflictMessage', 'submitting'],
      emits: ['change', 'submit', 'clear-conflict'],
      setup(
        _props: unknown,
        { emit }: { emit: (event: string, value: ReservationFormValue) => void },
      ) {
        const validFormValue = {
          startTime: '2026-04-08T09:00:00',
          endTime: '2026-04-08T10:00:00',
          purpose: '课程实验',
          remark: '请准备样品',
        }

        function emitInvalidTime() {
          emit('change', {
            startTime: '',
            endTime: '',
            purpose: '课程实验',
            remark: '',
          })
        }

        function emitValidTime() {
          emit('change', validFormValue)
        }

        function emitSubmit() {
          emit('submit', validFormValue)
        }

        return {
          emitInvalidTime,
          emitSubmit,
          emitValidTime,
        }
      },
      template:
        '<div class="reservation-form-stub"><button type="button" class="reservation-form-emit-invalid-time" @click="emitInvalidTime"></button><button type="button" class="reservation-form-emit-valid-time" @click="emitValidTime"></button><button type="button" class="reservation-form-submit" @click="emitSubmit"></button><span class="reservation-form-selected-count">{{ selectedDeviceCount }}</span><span class="reservation-form-start-time">{{ initialValue.startTime }}</span><span class="reservation-form-end-time">{{ initialValue.endTime }}</span><span class="reservation-form-purpose">{{ initialValue.purpose }}</span><span class="reservation-form-remark">{{ initialValue.remark }}</span><span class="reservation-form-conflict">{{ serverConflictMessage }}</span></div>',
    },
    ConfirmDialog: confirmDialogStub,
    ElCard: {
      template:
        '<section class="el-card-stub"><div class="el-card-stub__header"><slot name="header" /></div><div class="el-card-stub__body"><slot /></div></section>',
    },
    ElRadioGroup: {
      template: '<div class="el-radio-group-stub"><slot /></div>',
    },
    ElRadioButton: {
      template: '<button type="button" class="el-radio-button-stub"><slot /></button>',
    },
    ElInput: {
      inheritAttrs: false,
      props: ['modelValue', 'disabled', 'placeholder'],
      emits: ['update:modelValue'],
      template:
        '<input v-bind="$attrs" class="el-input-stub" :value="modelValue" :disabled="disabled" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    },
    AppTreeSelect: appTreeSelectStub,
    AppSelect: appSelectStub,
    ElOption: {
      props: ['label', 'value'],
      template: '<option :value="value">{{ label }}</option>',
    },
    ElButton: {
      inheritAttrs: false,
      emits: ['click'],
      template:
        '<button type="button" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
    },
    Pagination: {
      props: ['currentPage', 'pageSize', 'total', 'disabled'],
      emits: ['change'],
      template:
        '<div class="pagination-stub"><button type="button" class="pagination-page-1" :disabled="disabled" @click="$emit(\'change\', { currentPage: 1, pageSize })"></button><button type="button" class="pagination-page-2" :disabled="disabled" @click="$emit(\'change\', { currentPage: 2, pageSize })"></button></div>',
    },
  }
}

async function mountCreateView(options?: {
  searchImplementation?: typeof deviceApi.searchReservableDevices
  role?: UserRole
  reservationTargetUsers?: Array<{
    id: string
    username: string
    email: string
    realName: string
    phone: string
    status: number
    freezeStatus: FreezeStatus
    roleId: string
    roleName: UserRole.USER
  }>
}) {
  const { module, error } = await loadCreateView()

  expect(error).toBeNull()
  expect(module).toBeTruthy()

  if (!module) {
    throw new Error('Create.vue failed to load')
  }

  const authStore = useAuthStore()
  authStore.setCurrentUser({
    email: 'user@example.com',
    phone: '13800138000',
    realName: options?.role === UserRole.SYSTEM_ADMIN ? '系统管理员' : '普通用户',
    role: options?.role ?? UserRole.USER,
    userId: 'user-1',
    username: options?.role === UserRole.SYSTEM_ADMIN ? 'sys-admin' : 'user',
  })

  const reservationStore = useReservationStore()
  const createReservationSpy = vi
    .spyOn(reservationStore, 'createReservation')
    .mockResolvedValue(createReservationActionResponse())
  const createProxyReservationSpy = vi
    .spyOn(reservationStore, 'createProxyReservation')
    .mockResolvedValue(
      createReservationActionResponse({
        reservationMode: 'ON_BEHALF',
      }),
    )
  const userStore = useUserStore()
  const fetchReservationTargetUsersSpy = vi
    .spyOn(userStore, 'fetchReservationTargetUsers')
    .mockResolvedValue(
      options?.reservationTargetUsers ?? [
        {
          id: 'target-user-1',
          username: 'student-01',
          email: 'student-01@example.com',
          realName: '张三',
          phone: '13800138001',
          status: 1,
          freezeStatus: FreezeStatus.NORMAL,
          roleId: 'role-user',
          roleName: UserRole.USER,
        },
      ],
    )

  vi.spyOn(categoryApi, 'getCategoryTree').mockResolvedValue([
    {
      id: 'cat-root',
      name: '基础设备',
      parentId: null,
      sortOrder: 1,
      description: '基础设备',
      defaultApprovalMode: 'DEVICE_ONLY',
      children: [
        {
          id: 'cat-lab',
          name: '实验设备',
          parentId: 'cat-root',
          sortOrder: 2,
          description: '实验设备',
          defaultApprovalMode: 'DEVICE_ONLY',
          children: [],
        },
      ],
    },
  ])

  const searchReservableDevicesSpy = vi
    .spyOn(deviceApi, 'searchReservableDevices')
    .mockImplementation(
      options?.searchImplementation ??
        (async (params) => ({
          total: 0,
          records: [],
        })),
    )

  const wrapper = mount(module.default, {
    global: {
      stubs: createCreateViewStubs(),
    },
  })

  await flushPromises()

  return {
    authStore,
    createReservationSpy,
    createProxyReservationSpy,
    fetchReservationTargetUsersSpy,
    reservationStore,
    searchReservableDevicesSpy,
    userStore,
    wrapper,
  }
}

describe('reservation create view', () => {
  beforeEach(() => {
    pushMock.mockReset()
    successMock.mockReset()
    warningMock.mockReset()
    setActivePinia(createAppPinia())
  })

  it('时间范围未合法前不会请求可预约设备搜索', async () => {
    const { wrapper, searchReservableDevicesSpy } = await mountCreateView()
    const keywordInput = wrapper.get('[data-testid="reservation-device-search-input"] .el-input-stub')
    const categoryFilter = wrapper.get(
      '[data-testid="reservation-device-category-filter"] .app-tree-select-stub__control',
    )
    const searchButton = wrapper.get('.reservation-create-page__filter-submit')

    expect(searchReservableDevicesSpy).not.toHaveBeenCalled()
    expect(keywordInput.attributes('disabled')).toBeDefined()
    expect(categoryFilter.attributes('disabled')).toBeDefined()
    expect(searchButton.attributes('disabled')).toBeDefined()

    await wrapper.get('.reservation-form-emit-invalid-time').trigger('click')
    await keywordInput.setValue('示波器')
    await wrapper.get('.reservation-create-page__filter-submit').trigger('click')
    await flushPromises()

    expect(searchReservableDevicesSpy).not.toHaveBeenCalled()
  })

  it('时间范围合法后才会按默认分页触发可预约设备搜索', async () => {
    const { wrapper, searchReservableDevicesSpy } = await mountCreateView()
    const keywordInput = wrapper.get('[data-testid="reservation-device-search-input"] .el-input-stub')
    const categoryFilter = wrapper.get(
      '[data-testid="reservation-device-category-filter"] .app-tree-select-stub__control',
    )
    const searchButton = wrapper.get('.reservation-create-page__filter-submit')

    await wrapper.get('.reservation-form-emit-valid-time').trigger('click')
    await flushPromises()

    expect(keywordInput.attributes('disabled')).toBeUndefined()
    expect(categoryFilter.attributes('disabled')).toBeUndefined()
    expect(searchButton.attributes('disabled')).toBeUndefined()
    expect(searchReservableDevicesSpy).toHaveBeenCalledTimes(1)
    expect(searchReservableDevicesSpy).toHaveBeenCalledWith({
      startTime: '2026-04-08T09:00:00',
      endTime: '2026-04-08T10:00:00',
      q: undefined,
      categoryId: undefined,
      includeDescendants: true,
      page: 1,
      size: 10,
    })
  })

  it('分类与关键字会联合带入可预约设备搜索参数', async () => {
    const { wrapper, searchReservableDevicesSpy } = await mountCreateView()

    await wrapper.get('.reservation-form-emit-valid-time').trigger('click')
    await flushPromises()

    await wrapper.get('[data-testid="reservation-device-search-input"] .el-input-stub').setValue('激光')
    await wrapper
      .get('[data-testid="reservation-device-category-filter"] .app-tree-select-stub__control')
      .setValue('cat-lab')
    await wrapper.get('.reservation-create-page__filter-submit').trigger('click')
    await flushPromises()

    expect(searchReservableDevicesSpy).toHaveBeenLastCalledWith({
      startTime: '2026-04-08T09:00:00',
      endTime: '2026-04-08T10:00:00',
      q: '激光',
      categoryId: 'cat-lab',
      includeDescendants: true,
      page: 1,
      size: 10,
    })
  })

  it('已选设备会在翻页和换筛选后继续保留', async () => {
    const pageOneRecords = Array.from({ length: 10 }, (_, index) => createDeviceRecord(index + 1))
    const pageTwoRecords = [createDeviceRecord(11), createDeviceRecord(12)]

    const { reservationStore, wrapper } = await mountCreateView({
      searchImplementation: async (params) => {
        if (params.page === 2) {
          return {
            total: 12,
            records: pageTwoRecords,
          }
        }

        if (params.q === '实验') {
          return {
            total: 1,
            records: [createDeviceRecord(12)],
          }
        }

        return {
          total: 12,
          records: pageOneRecords,
        }
      },
    })

    await wrapper.get('.reservation-form-emit-valid-time').trigger('click')
    await flushPromises()

    await wrapper.get('[data-testid="reservation-device-select-device-1"]').trigger('click')
    await wrapper.get('.pagination-page-2').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="reservation-device-select-device-11"]').trigger('click')

    await wrapper.get('[data-testid="reservation-device-search-input"] .el-input-stub').setValue('实验')
    await wrapper.get('.reservation-create-page__filter-submit').trigger('click')
    await flushPromises()

    expect(reservationStore.selectedDeviceIds).toEqual(['device-1', 'device-11'])
    expect(wrapper.get('[data-testid="reservation-selected-count"]').text()).toContain('2')
    expect(wrapper.get('[data-testid="reservation-selected-devices"]').text()).toContain('设备 1')
    expect(wrapper.get('[data-testid="reservation-selected-devices"]').text()).toContain('设备 11')
  })

  it('第 11 台设备会被阻止加入已选列表', async () => {
    const pageOneRecords = Array.from({ length: 10 }, (_, index) => createDeviceRecord(index + 1))
    const pageTwoRecords = [createDeviceRecord(11)]

    const { reservationStore, wrapper } = await mountCreateView({
      searchImplementation: async (params) => ({
        total: 11,
        records: params.page === 2 ? pageTwoRecords : pageOneRecords,
      }),
    })

    await wrapper.get('.reservation-form-emit-valid-time').trigger('click')
    await flushPromises()

    for (const record of pageOneRecords) {
      await wrapper.get(`[data-testid="reservation-device-select-${record.id}"]`).trigger('click')
    }

    expect(reservationStore.selectedDeviceIds).toHaveLength(10)

    await wrapper.get('.pagination-page-2').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="reservation-device-select-device-11"]').trigger('click')

    expect(reservationStore.selectedDeviceIds).toHaveLength(10)
    expect(reservationStore.selectedDeviceIds).not.toContain('device-11')
    expect(warningMock).toHaveBeenCalledWith('最多只能选择 10 台设备')
  })

  it('确认摘要会展示设备数量、时间范围和用途，并在成功后跳转详情页', async () => {
    const records = [createDeviceRecord(1), createDeviceRecord(2)]
    const { createReservationSpy, wrapper } = await mountCreateView({
      searchImplementation: async () => ({
        total: 2,
        records,
      }),
    })

    await wrapper.get('.reservation-form-emit-valid-time').trigger('click')
    await flushPromises()

    await wrapper.get('[data-testid="reservation-device-select-device-1"]').trigger('click')
    await wrapper.get('[data-testid="reservation-device-select-device-2"]').trigger('click')
    await wrapper.get('.reservation-form-submit').trigger('click')

    const confirmDialog = wrapper.get('[data-testid="reservation-confirm-dialog"]')

    expect(confirmDialog.text()).toContain('2 台设备')
    expect(confirmDialog.text()).toContain('2026-04-08T09:00:00 至 2026-04-08T10:00:00')
    expect(confirmDialog.text()).toContain('课程实验')

    await wrapper.get('.confirm-submit').trigger('click')
    await flushPromises()

    expect(createReservationSpy).toHaveBeenCalledWith({
      deviceIds: ['device-1', 'device-2'],
      startTime: '2026-04-08T09:00:00',
      endTime: '2026-04-08T10:00:00',
      purpose: '课程实验',
      remark: '请准备样品',
    })

    const payload = createReservationSpy.mock.calls[0]?.[0]

    expect(payload).toBeDefined()
    expect(payload).not.toHaveProperty('deviceId')
    expect(pushMock).toHaveBeenCalledWith('/reservations/reservation-1')
    expect(successMock).toHaveBeenCalledWith('预约创建成功')
  })

  it('409 冲突失败后会渲染阻塞设备列表并保留表单与已选状态', async () => {
    const records = [createDeviceRecord(1), createDeviceRecord(2)]
    const blockingDevices = [
      createBlockingDevice('device-1', {
        deviceName: '设备 1',
        reasonMessage: '设备 1 在当前时间段已被占用',
      }),
      createBlockingDevice('device-2', {
        deviceName: '设备 2',
        reasonMessage: '设备 2 在当前时间段已被占用',
      }),
    ]
    const { createReservationSpy, reservationStore, wrapper } = await mountCreateView({
      searchImplementation: async () => ({
        total: 2,
        records,
      }),
    })

    createReservationSpy.mockImplementationOnce(async () => {
      reservationStore.blockingDevices = blockingDevices
      throw new Error('预约冲突')
    })

    await wrapper.get('.reservation-form-emit-valid-time').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="reservation-device-select-device-1"]').trigger('click')
    await wrapper.get('[data-testid="reservation-device-select-device-2"]').trigger('click')
    await wrapper.get('.reservation-form-submit').trigger('click')
    await wrapper.get('.confirm-submit').trigger('click')
    await flushPromises()

    expect(pushMock).not.toHaveBeenCalled()
    expect(wrapper.get('.reservation-form-start-time').text()).toBe('2026-04-08T09:00:00')
    expect(wrapper.get('.reservation-form-end-time').text()).toBe('2026-04-08T10:00:00')
    expect(wrapper.get('.reservation-form-purpose').text()).toBe('课程实验')
    expect(wrapper.get('.reservation-form-remark').text()).toBe('请准备样品')
    expect(wrapper.get('.reservation-form-conflict').text()).toContain('设备 1 在当前时间段已被占用')
    expect(wrapper.get('[data-testid="reservation-selected-devices"]').text()).toContain('设备 1')
    expect(wrapper.get('[data-testid="reservation-selected-devices"]').text()).toContain('设备 2')
    expect(reservationStore.selectedDeviceIds).toEqual(['device-1', 'device-2'])
    expect(wrapper.get('[data-testid="reservation-blocking-devices"]').text()).toContain('设备 1')
    expect(wrapper.get('[data-testid="reservation-blocking-devices"]').text()).toContain('设备 2')
    expect(wrapper.get('[data-testid="reservation-blocking-device-device-1"]').text()).toContain(
      '设备 1 在当前时间段已被占用',
    )
    expect(wrapper.get('[data-testid="reservation-blocking-device-device-2"]').text()).toContain(
      '设备 2 在当前时间段已被占用',
    )
  })

  it('请求进行中不会重复调用创建接口', async () => {
    const records = [createDeviceRecord(1)]
    const deferred = createDeferred<ReturnType<typeof createReservationActionResponse>>()
    const { createReservationSpy, wrapper } = await mountCreateView({
      searchImplementation: async () => ({
        total: 1,
        records,
      }),
    })

    createReservationSpy.mockReturnValueOnce(deferred.promise)

    await wrapper.get('.reservation-form-emit-valid-time').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="reservation-device-select-device-1"]').trigger('click')
    await wrapper.get('.reservation-form-submit').trigger('click')

    const createViewVm = wrapper.vm as unknown as {
      handleConfirmSubmit: () => Promise<void>
    }
    const firstSubmit = createViewVm.handleConfirmSubmit()
    const secondSubmit = createViewVm.handleConfirmSubmit()

    expect(createReservationSpy).toHaveBeenCalledTimes(1)

    deferred.resolve(createReservationActionResponse())
    await Promise.all([firstSubmit, secondSubmit])
    await flushPromises()

    expect(pushMock).toHaveBeenCalledWith('/reservations/reservation-1')
  })

  it('失败路径下快速重复点击确认按钮也只会发送一次创建请求', async () => {
    const records = [createDeviceRecord(1)]
    const blockingDevices = [
      createBlockingDevice('device-1', {
        deviceName: '设备 1',
        reasonMessage: '设备 1 在当前时间段已被占用',
      }),
    ]
    const { createReservationSpy, reservationStore, wrapper } = await mountCreateView({
      searchImplementation: async () => ({
        total: 1,
        records,
      }),
    })

    createReservationSpy.mockImplementation(async () => {
      reservationStore.blockingDevices = blockingDevices
      throw new Error('预约冲突')
    })

    await wrapper.get('.reservation-form-emit-valid-time').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="reservation-device-select-device-1"]').trigger('click')
    await wrapper.get('.reservation-form-submit').trigger('click')

    const confirmButton = wrapper.get('.confirm-submit')

    await confirmButton.trigger('click')
    await flushPromises()

    expect(wrapper.get('.confirm-submit').attributes('disabled')).toBeDefined()

    await confirmButton.trigger('click')
    await flushPromises()

    expect(createReservationSpy).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="reservation-blocking-devices"]').text()).toContain('设备 1')
    expect(wrapper.get('.reservation-form-conflict').text()).toContain('设备 1 在当前时间段已被占用')
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('系统管理员未选择目标用户时不会退回本人预约提交', async () => {
    const records = [createDeviceRecord(1)]
    const { createProxyReservationSpy, createReservationSpy, wrapper } = await mountCreateView({
      role: UserRole.SYSTEM_ADMIN,
      searchImplementation: async () => ({
        total: 1,
        records,
      }),
    })

    expect(wrapper.text()).not.toContain('本人预约')

    await wrapper.get('.reservation-form-emit-valid-time').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="reservation-device-select-device-1"]').trigger('click')
    await wrapper.get('.reservation-form-submit').trigger('click')
    await flushPromises()

    expect(warningMock).toHaveBeenCalledWith('代预约必须先选择目标用户')
    expect(wrapper.find('.confirm-submit').exists()).toBe(false)
    expect(createReservationSpy).not.toHaveBeenCalled()
    expect(createProxyReservationSpy).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('系统管理员默认以代预约语义提交并携带 targetUserId', async () => {
    const records = [createDeviceRecord(1)]
    const { createProxyReservationSpy, createReservationSpy, fetchReservationTargetUsersSpy, wrapper } =
      await mountCreateView({
        role: UserRole.SYSTEM_ADMIN,
        searchImplementation: async () => ({
          total: 1,
          records,
        }),
      })

    expect(wrapper.text()).not.toContain('本人预约')

    await wrapper
      .get('.reservation-create-page__target-user .app-select-stub__control')
      .setValue('target-user-1')

    await wrapper.get('.reservation-form-emit-valid-time').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="reservation-device-select-device-1"]').trigger('click')
    await wrapper.get('.reservation-form-submit').trigger('click')
    await wrapper.get('.confirm-submit').trigger('click')
    await flushPromises()

    expect(fetchReservationTargetUsersSpy).toHaveBeenCalledWith({ page: 1, size: 100 })
    expect(createReservationSpy).not.toHaveBeenCalled()
    expect(createProxyReservationSpy).toHaveBeenCalledWith({
      targetUserId: 'target-user-1',
      deviceIds: ['device-1'],
      startTime: '2026-04-08T09:00:00',
      endTime: '2026-04-08T10:00:00',
      purpose: '课程实验',
      remark: '请准备样品',
    })
    expect(pushMock).toHaveBeenCalledWith('/reservations/reservation-1')
  })

  it('提交阶段遇到非冲突普通错误时会重新抛出', async () => {
    const records = [createDeviceRecord(1)]
    const { createReservationSpy, wrapper } = await mountCreateView({
      searchImplementation: async () => ({
        total: 1,
        records,
      }),
    })

    createReservationSpy.mockRejectedValueOnce(new Error('服务器异常'))

    await wrapper.get('.reservation-form-emit-valid-time').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="reservation-device-select-device-1"]').trigger('click')
    await wrapper.get('.reservation-form-submit').trigger('click')

    await expect(
      (
        wrapper.vm as unknown as {
          handleConfirmSubmit: () => Promise<void>
        }
      ).handleConfirmSubmit(),
    ).rejects.toThrow('服务器异常')
    expect(successMock).not.toHaveBeenCalled()
  })
})
