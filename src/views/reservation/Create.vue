<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import type { DeviceResponse } from '@/api/devices'
import type { UserListItemResponse } from '@/api/users'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import ReservationForm from '@/components/form/ReservationForm.vue'
import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleDetailLayout from '@/components/layout/ConsoleDetailLayout.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import { DeviceStatus, UserRole } from '@/enums'
import { useAuthStore } from '@/stores/modules/auth'
import { useDeviceStore } from '@/stores/modules/device'
import { useReservationStore } from '@/stores/modules/reservation'
import { useUserStore } from '@/stores/modules/user'

interface ReservationFormValue {
  deviceId: string
  startTime: string
  endTime: string
  purpose: string
  remark: string
}

interface DeviceOption extends Pick<DeviceResponse, 'id' | 'name' | 'deviceNumber' | 'status'> {}
interface ReservationTargetUserOption extends UserListItemResponse {}
type ReservationCreateMode = 'self' | 'proxy'

/**
 * 创建预约页。
 * 页面层负责承接角色差异：普通用户只创建本人预约，系统管理员可切换为代预约；
 * 具体字段编辑、规则校验与冲突提示都下沉到 `ReservationForm`，避免创建页把表单逻辑和角色逻辑揉在一起。
 */
const router = useRouter()
const authStore = useAuthStore()
const deviceStore = useDeviceStore()
const reservationStore = useReservationStore()
const userStore = useUserStore()

const createMode = ref<ReservationCreateMode>('self')
const confirmVisible = ref(false)
const pendingPayload = ref<ReservationFormValue | null>(null)
const targetUserId = ref('')
const serverConflictMessage = ref('')
const submitting = ref(false)
const deviceOptions = ref<DeviceOption[]>([])
const reservationTargetUsers = ref<ReservationTargetUserOption[]>([])

const isSystemAdmin = computed(() => authStore.userRole === UserRole.SYSTEM_ADMIN)
const confirmMessage = computed(() => {
  return createMode.value === 'proxy'
    ? '确认以代预约模式提交当前预约吗？提交后会直接进入目标用户的预约列表与审批流程。'
    : '确认提交当前预约吗？提交后将进入真实审批流程。'
})
const initialValue = computed<ReservationFormValue>(() => ({
  deviceId: '',
  startTime: '',
  endTime: '',
  purpose: '',
  remark: '',
}))

function buildDeviceOptions(records: DeviceResponse[]) {
  return records
    .filter((device) => device.status === DeviceStatus.AVAILABLE)
    .map((device) => ({
      id: device.id,
      name: device.name,
      deviceNumber: device.deviceNumber,
      status: device.status,
    }))
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message || ''
  }

  return ''
}

async function loadDeviceOptions() {
  const result = await deviceStore.fetchDeviceList({ page: 1, size: 100 })
  deviceOptions.value = buildDeviceOptions(result.records)
}

async function loadReservationTargetUsers() {
  if (!isSystemAdmin.value) {
    return
  }

  reservationTargetUsers.value = await userStore.fetchReservationTargetUsers({ page: 1, size: 100 })
}

function handleFormSubmit(payload: ReservationFormValue) {
  pendingPayload.value = payload

  if (createMode.value === 'proxy' && !targetUserId.value) {
    ElMessage.warning('代预约必须先选择目标用户')
    return
  }

  confirmVisible.value = true
}

function handleClearConflict() {
  serverConflictMessage.value = ''
}

async function handleConfirmSubmit() {
  if (!pendingPayload.value) {
    return
  }

  submitting.value = true

  try {
    const reservation =
      createMode.value === 'proxy' && isSystemAdmin.value
        ? await reservationStore.createProxyReservation({
            targetUserId: targetUserId.value,
            ...pendingPayload.value,
          })
        : await reservationStore.createReservation(pendingPayload.value)

    confirmVisible.value = false
    ElMessage.success('预约创建成功')
    void router.push(`/reservations/${reservation.id}`)
  } catch (error) {
    const errorMessage = getErrorMessage(error)

    /**
     * 方案 1 没有独立冲突检测接口，因此当提交阶段命中后端冲突校验时，
     * 需要把错误消息回填到表单中持续提示，直到用户修改字段为止。
     */
    if (errorMessage.includes('冲突')) {
      confirmVisible.value = false
      serverConflictMessage.value = errorMessage
      return
    }

    throw error
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void loadDeviceOptions()
  void loadReservationTargetUsers()
})
</script>

<template>
  <section class="reservation-create-page">
    <ConsolePageHero
      eyebrow="Reservation Create"
      :title="isSystemAdmin ? '创建 / 代预约' : '创建预约'"
      description="创建页只承接角色差异与冲突回填，字段编辑和业务校验统一留在 ReservationForm 内部。"
      class="reservation-create-page__hero"
    />

    <ConsoleDetailLayout>
      <template #main>
        <el-card v-if="isSystemAdmin" class="reservation-create-page__mode-card">
          <template #header>
            <span>创建模式</span>
          </template>

          <el-radio-group v-model="createMode">
            <el-radio-button label="self" value="self">本人预约</el-radio-button>
            <el-radio-button label="proxy" value="proxy">代预约</el-radio-button>
          </el-radio-group>

          <!-- 只有 SYSTEM_ADMIN 才能在创建页切换为代预约，并且必须显式选择目标 USER。 -->
          <el-select
            v-if="createMode === 'proxy'"
            v-model="targetUserId"
            class="reservation-create-page__target-user"
            placeholder="请选择目标用户"
          >
            <el-option
              v-for="user in reservationTargetUsers"
              :key="user.id"
              :label="`${user.realName || user.username}（${user.username}）`"
              :value="user.id"
            />
          </el-select>
        </el-card>

        <ReservationForm
          :initial-value="initialValue"
          :device-options="deviceOptions"
          :server-conflict-message="serverConflictMessage"
          :submitting="submitting"
          @submit="handleFormSubmit"
          @clear-conflict="handleClearConflict"
        />
      </template>

      <template #aside>
        <ConsoleAsidePanel
          class="reservation-create-page__aside"
          title="预约约束"
          description="设备列表只保留 AVAILABLE 状态，提交阶段若命中后端冲突校验，消息会持续回填到表单直到用户调整完毕。"
        >
          <p class="reservation-create-page__note">
            系统管理员切到代预约后必须显式选择目标用户，避免把代预约请求误落到当前登录账号。
          </p>
        </ConsoleAsidePanel>
      </template>
    </ConsoleDetailLayout>

    <ConfirmDialog
      v-model="confirmVisible"
      title="确认提交预约"
      :message="confirmMessage"
      confirm-text="确认提交"
      :loading="submitting"
      @confirm="handleConfirmSubmit"
    />
  </section>
</template>

<style scoped lang="scss">
.reservation-create-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.reservation-create-page__hero,
.reservation-create-page__mode-card,
.reservation-create-page__aside {
  border: 1px solid var(--app-border-soft);
  box-shadow: var(--app-shadow-card);
}

.reservation-create-page__hero {
  background: linear-gradient(135deg, var(--app-surface-card), var(--app-tone-brand-surface));
}

.reservation-create-page__mode-card,
.reservation-create-page__aside {
  background: var(--app-surface-card);
}

.reservation-create-page__mode-card :deep(.el-card__header) {
  margin: 0;
  color: var(--app-text-primary);
}

.reservation-create-page__mode-card {
  border-radius: 28px;
}

// 创建模式卡需要在页面层固定 radio 组选中态表面，避免深色下分段按钮与卡片背景融成一片。
.reservation-create-page__mode-card :deep(.el-radio-group),
.reservation-create-page__mode-card :deep(.el-radio-button__inner) {
  background: var(--app-surface-card);
}

.reservation-create-page__target-user {
  display: block;
  max-width: 360px;
  margin-top: 16px;
}

.reservation-create-page__note {
  margin: 0;
  color: var(--app-text-secondary);
  line-height: 1.7;
}
</style>
