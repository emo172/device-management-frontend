<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { getCategoryTree } from '@/api/categories'
import { searchReservableDevices } from '@/api/devices'
import type { CategoryTreeResponse } from '@/api/categories'
import type { DeviceResponse, SearchReservableDevicesParams } from '@/api/devices'
import type { ReservationDeviceSummary } from '@/api/reservations'
import type { UserListItemResponse } from '@/api/users'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import AppSelect from '@/components/common/dropdown/AppSelect.vue'
import AppTreeSelect from '@/components/common/dropdown/AppTreeSelect.vue'
import Pagination from '@/components/common/Pagination.vue'
import ReservationForm from '@/components/form/ReservationForm.vue'
import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleDetailLayout from '@/components/layout/ConsoleDetailLayout.vue'
import ConsoleFilterPanel from '@/components/layout/ConsoleFilterPanel.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import { UserRole } from '@/enums'
import { useAuthStore } from '@/stores/modules/auth'
import { useReservationStore } from '@/stores/modules/reservation'
import { useUserStore } from '@/stores/modules/user'
import { validateReservationTimeRange } from '@/utils'

interface ReservationFormValue {
  startTime: string
  endTime: string
  purpose: string
  remark: string
}

interface DeviceCategoryOption {
  label: string
  value: string
  children?: DeviceCategoryOption[]
}

interface ReservationTargetUserOption extends UserListItemResponse {}

type ReservationCreateMode = 'self' | 'proxy'

const DEFAULT_SEARCH_PAGE_SIZE = 10

/**
 * 创建预约页。
 * 页面层负责承接角色差异、时间优先的可预约设备搜索，以及独立于结果页的已选面板，
 * 避免旧的“本地 100 条设备 + 单选下拉”继续充当创建链路真相。
 */
const router = useRouter()
const authStore = useAuthStore()
const reservationStore = useReservationStore()
const userStore = useUserStore()

const confirmVisible = ref(false)
const pendingPayload = ref<ReservationFormValue | null>(null)
const targetUserId = ref('')
const serverConflictMessage = ref('')
const submitting = ref(false)
const confirmActionConsumed = ref(false)
const formValue = ref<ReservationFormValue>({
  startTime: '',
  endTime: '',
  purpose: '',
  remark: '',
})
const searchKeyword = ref('')
const selectedCategoryId = ref<string | null>(null)
const categoryOptions = ref<DeviceCategoryOption[]>([])
const searchResults = ref<DeviceResponse[]>([])
const searchTotal = ref(0)
const searchPage = ref(1)
const searchPageSize = ref(DEFAULT_SEARCH_PAGE_SIZE)
const searchLoading = ref(false)
const reservationTargetUsers = ref<ReservationTargetUserOption[]>([])
const reservableSearchRequestToken = ref(0)

const isSystemAdmin = computed(() => authStore.userRole === UserRole.SYSTEM_ADMIN)
/**
 * 后端 `/api/reservations/multi` 对系统管理员的真实契约是“必须指定目标用户后代 USER 预约”。
 * 创建页直接固定成代预约语义，避免管理员默认走到本人预约并稳定触发权限冲突。
 */
const createMode = computed<ReservationCreateMode>(() =>
  isSystemAdmin.value ? 'proxy' : 'self',
)
const selectedDevices = computed(() => reservationStore.selectedDevices)
const selectedDeviceIds = computed(() => reservationStore.selectedDeviceIds)
const selectedDeviceCount = computed(() => reservationStore.selectedDevices.length)
const blockingDevices = computed(() => reservationStore.blockingDevices)
const searchWindowWarnings = computed(() =>
  validateReservationTimeRange({
    startTime: formValue.value.startTime,
    endTime: formValue.value.endTime,
  }),
)
const canSearchReservableDevices = computed(() => searchWindowWarnings.value.length === 0)
const confirmSummary = computed(() => {
  const payload = pendingPayload.value ?? formValue.value
  const summaryItems: string[] = []

  if (selectedDeviceCount.value > 0) {
    summaryItems.push(`${selectedDeviceCount.value} 台设备`)
  }

  if (payload.startTime && payload.endTime) {
    summaryItems.push(`时间 ${payload.startTime} 至 ${payload.endTime}`)
  }

  if (payload.purpose.trim()) {
    summaryItems.push(`用途 ${payload.purpose.trim()}`)
  }

  return summaryItems.join('；')
})
const confirmMessage = computed(() => {
  const confirmTailMessage =
    createMode.value === 'proxy'
      ? '提交后会直接进入目标用户的预约列表与审批流程。'
      : '提交后将进入真实审批流程。'

  if (confirmSummary.value) {
    return `请确认以下预约信息：${confirmSummary.value}。${confirmTailMessage}`
  }

  return createMode.value === 'proxy'
    ? '确认以代预约模式提交当前预约吗？提交后会直接进入目标用户的预约列表与审批流程。'
    : '确认提交当前预约吗？提交后将进入真实审批流程。'
})

watch(
  () => [formValue.value.startTime, formValue.value.endTime],
  ([nextStartTime, nextEndTime], [previousStartTime, previousEndTime]) => {
    if (nextStartTime === previousStartTime && nextEndTime === previousEndTime) {
      return
    }

    /**
     * 设备搜索必须由合法时间范围驱动。
     * 一旦时间被清空或变回非法窗口，就立刻撤掉当前候选结果，避免用户继续基于旧时间窗挑设备。
     */
    if (!canSearchReservableDevices.value) {
      clearReservableResults()
      return
    }

    searchPage.value = 1
    void loadReservableDevices({ page: 1, size: searchPageSize.value })
  },
)

function mapCategoryTreeToOptions(tree: CategoryTreeResponse[]): DeviceCategoryOption[] {
  return tree.map((category) => ({
    label: category.name,
    value: category.id,
    children: category.children.length ? mapCategoryTreeToOptions(category.children) : undefined,
  }))
}

function buildReservableSearchParams(
  overrides?: Partial<Pick<SearchReservableDevicesParams, 'page' | 'size'>>,
): SearchReservableDevicesParams {
  return {
    startTime: formValue.value.startTime,
    endTime: formValue.value.endTime,
    q: searchKeyword.value.trim() || undefined,
    categoryId: selectedCategoryId.value || undefined,
    includeDescendants: true,
    page: overrides?.page ?? searchPage.value,
    size: overrides?.size ?? searchPageSize.value,
  }
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

function toReservationDeviceSummary(device: DeviceResponse): ReservationDeviceSummary {
  return {
    deviceId: device.id,
    deviceName: device.name,
    deviceNumber: device.deviceNumber,
  }
}

function clearReservableResults() {
  searchResults.value = []
  searchTotal.value = 0
  searchPage.value = 1
}

async function loadReservableDevices(
  overrides?: Partial<Pick<SearchReservableDevicesParams, 'page' | 'size'>>,
) {
  if (!canSearchReservableDevices.value) {
    return
  }

  const nextPage = overrides?.page ?? searchPage.value
  const nextSize = overrides?.size ?? searchPageSize.value
  const requestToken = ++reservableSearchRequestToken.value

  searchLoading.value = true
  searchPage.value = nextPage
  searchPageSize.value = nextSize

  try {
    const result = await searchReservableDevices(
      buildReservableSearchParams({
        page: nextPage,
        size: nextSize,
      }),
    )

    /**
     * 时间、分页和筛选都可能连续快速切换。
     * 这里用请求序号兜住慢请求回写，确保结果列表只展示最后一次条件对应的数据。
     */
    if (requestToken !== reservableSearchRequestToken.value) {
      return
    }

    searchResults.value = result.records
    searchTotal.value = result.total
  } catch {
    if (requestToken === reservableSearchRequestToken.value) {
      searchResults.value = []
      searchTotal.value = 0
    }
  } finally {
    if (requestToken === reservableSearchRequestToken.value) {
      searchLoading.value = false
    }
  }
}

async function loadCategoryOptions() {
  const tree = await getCategoryTree()
  categoryOptions.value = mapCategoryTreeToOptions(tree)
}

async function loadReservationTargetUsers() {
  if (!isSystemAdmin.value) {
    return
  }

  reservationTargetUsers.value = await userStore.fetchReservationTargetUsers({ page: 1, size: 100 })
}

function handleFormChange(value: ReservationFormValue) {
  formValue.value = { ...value }
}

function handleSearchKeywordChange(value: string) {
  searchKeyword.value = value
}

function handleCategoryFilterChange(value: unknown) {
  selectedCategoryId.value = typeof value === 'string' && value ? value : null
}

function handleSearchSubmit() {
  if (!canSearchReservableDevices.value) {
    return
  }

  searchPage.value = 1
  void loadReservableDevices({ page: 1, size: searchPageSize.value })
}

function handleSearchReset() {
  searchKeyword.value = ''
  selectedCategoryId.value = null
  searchPage.value = 1

  if (!canSearchReservableDevices.value) {
    return
  }

  void loadReservableDevices({ page: 1, size: searchPageSize.value })
}

function handleSearchPaginationChange(payload: { currentPage: number; pageSize: number }) {
  if (!canSearchReservableDevices.value) {
    return
  }

  void loadReservableDevices({
    page: payload.currentPage,
    size: payload.pageSize,
  })
}

function handleSelectReservableDevice(device: DeviceResponse) {
  if (selectedDeviceIds.value.includes(device.id)) {
    return
  }

  /**
   * 10 台上限是创建页当前的硬约束。
   * 这里直接挡在加入已选入口，避免翻页后继续累积第 11 台，再把明显越界的请求交给后端兜底。
   */
  if (selectedDeviceCount.value >= 10) {
    ElMessage.warning('最多只能选择 10 台设备')
    return
  }

  reservationStore.upsertSelectedDevice(toReservationDeviceSummary(device))
  handleClearConflict()
}

function handleRemoveSelectedDevice(deviceId: string) {
  reservationStore.removeSelectedDevice(deviceId)
  handleClearConflict()
}

function ensureProxyTargetUserSelected(options?: { closeConfirmWhenInvalid?: boolean }) {
  if (createMode.value !== 'proxy') {
    return true
  }

  if (targetUserId.value) {
    return true
  }

  if (options?.closeConfirmWhenInvalid) {
    confirmVisible.value = false
  }

  ElMessage.warning('代预约必须先选择目标用户')

  return false
}

function handleFormSubmit(payload: ReservationFormValue) {
  pendingPayload.value = { ...payload }
  /**
   * 每次重新打开确认框都视为一次新的确认机会。
   * 这样失败后用户修改表单再点“提交”时，才能重新获得一次有效确认动作。
   */
  confirmActionConsumed.value = false

  if (!ensureProxyTargetUserSelected()) {
    return
  }

  confirmVisible.value = true
}

function handleClearConflict() {
  serverConflictMessage.value = ''
  reservationStore.clearBlockingDevices()
}

function handleTargetUserChange(value: unknown) {
  targetUserId.value = typeof value === 'string' ? value : ''
}

async function handleConfirmSubmit() {
  if (!pendingPayload.value || submitting.value || confirmActionConsumed.value) {
    return
  }

  /**
   * 真实浏览器里 409 返回很快时，弹窗会进入关闭过渡，但确认按钮仍可能短暂留在 DOM 中。
   * 这里把“本次确认机会”一次性消费掉，确保同一轮打开确认框最多只会触发一次创建请求。
   */
  confirmActionConsumed.value = true

  if (!ensureProxyTargetUserSelected({ closeConfirmWhenInvalid: true })) {
    confirmActionConsumed.value = false
    return
  }

  /**
   * 重试提交前先清掉上一次 409 的阻塞列表与摘要，避免页面在请求进行中继续显示过期冲突结论。
   */
  handleClearConflict()
  submitting.value = true

  try {
    const createPayload = {
      ...pendingPayload.value,
      deviceIds: [...selectedDeviceIds.value],
    }
    const reservation =
      createMode.value === 'proxy' && isSystemAdmin.value
        ? await reservationStore.createProxyReservation({
            targetUserId: targetUserId.value,
            ...createPayload,
          })
        : await reservationStore.createReservation(createPayload)

    confirmVisible.value = false
    ElMessage.success('预约创建成功')
    void router.push(`/reservations/${reservation.id}`)
  } catch (error) {
    const errorMessage = getErrorMessage(error)
    const blockingDeviceMessages = reservationStore.blockingDevices
      .map((device) => device.reasonMessage)
      .filter((message) => !!message)

    if (blockingDeviceMessages.length > 0) {
      confirmVisible.value = false
      serverConflictMessage.value = blockingDeviceMessages.join('；')
      return
    }

    if (errorMessage.includes('冲突')) {
      confirmVisible.value = false
      serverConflictMessage.value = errorMessage
      return
    }

    throw error
  } finally {
    submitting.value = false

    /**
     * 仅当弹窗仍保持打开时才释放确认机会，允许用户处理普通异常后在当前弹窗里再次确认。
     * 成功和 409 冲突路径都会主动关闭弹窗，此时继续保持锁定，挡住关闭过渡里的重复点击。
     */
    if (confirmVisible.value) {
      confirmActionConsumed.value = false
    }
  }
}

onMounted(() => {
  void loadCategoryOptions().catch(() => {})
  void loadReservationTargetUsers().catch(() => {})
})
</script>

<template>
  <section class="reservation-create-page" data-testid="reservation-create-page">
    <ConsolePageHero
      :title="isSystemAdmin ? '创建代预约' : '创建预约'"
      description="创建设备预约时，先由时间范围驱动可预约设备搜索，再用独立已选面板稳定承接多设备提交。"
      class="reservation-create-page__hero"
    />

    <ConsoleDetailLayout>
      <template #main>
        <!-- 系统管理员在后端只能代 USER 预约，因此前端直接固定为代预约，不再暴露本人预约入口。 -->
        <el-card v-if="isSystemAdmin" class="reservation-create-page__mode-card">
          <template #header>
            <span>代预约目标用户</span>
          </template>

          <p class="reservation-create-page__note">
            系统管理员仅支持代 USER 创建预约，请先选择目标用户后再提交。
          </p>

          <AppSelect
            :model-value="targetUserId"
            class="reservation-create-page__target-user"
            data-testid="reservation-target-user-select"
            placeholder="请选择目标用户"
            @update:modelValue="handleTargetUserChange"
          >
            <el-option
              v-for="user in reservationTargetUsers"
              :key="user.id"
              :label="`${user.realName || user.username}（${user.username}）`"
              :value="user.id"
            />
          </AppSelect>
        </el-card>

        <ReservationForm
          :initial-value="formValue"
          :selected-device-count="selectedDeviceCount"
          :server-conflict-message="serverConflictMessage"
          :submitting="submitting"
          @change="handleFormChange"
          @submit="handleFormSubmit"
          @clear-conflict="handleClearConflict"
        />

        <el-card v-if="blockingDevices.length" class="reservation-create-page__blocking-card">
          <template #header>
            <div class="reservation-create-page__blocking-header">
              <div>
                <p class="reservation-create-page__blocking-title">当前预约与已有占用冲突</p>
                <p class="reservation-create-page__blocking-description">
                  请调整时间范围或已选设备后再提交；以下列表是本次阻塞整单创建的真实设备原因。
                </p>
              </div>
            </div>
          </template>

          <div class="reservation-create-page__blocking-panel" data-testid="reservation-blocking-devices">
            <p v-if="serverConflictMessage" class="reservation-create-page__blocking-summary">
              {{ serverConflictMessage }}
            </p>

            <ul class="reservation-create-page__blocking-list">
              <li
                v-for="device in blockingDevices"
                :key="device.deviceId"
                class="reservation-create-page__blocking-item"
                :data-testid="`reservation-blocking-device-${device.deviceId}`"
              >
                <p class="reservation-create-page__blocking-device-name">
                  {{ device.deviceName || device.deviceId }}
                </p>
                <p class="reservation-create-page__blocking-device-reason">
                  {{ device.reasonMessage }}
                </p>
              </li>
            </ul>
          </div>
        </el-card>

        <ConsoleFilterPanel
          class="reservation-create-page__filter-panel"
          title="可预约设备搜索"
          description="只有时间范围合法后才会查询后端可预约设备；关键字、分类树和分页都基于当前时间窗生效。"
        >
          <div
            class="reservation-create-page__filter-field"
            data-testid="reservation-device-search-input"
          >
            <label class="reservation-create-page__filter-label" for="reservation-device-search-keyword">
              关键字
            </label>
            <el-input
              id="reservation-device-search-keyword"
              class="reservation-create-page__search-input"
              :model-value="searchKeyword"
              :disabled="!canSearchReservableDevices || searchLoading"
              placeholder="按设备名称或分类名称搜索"
              @update:modelValue="handleSearchKeywordChange"
            />
          </div>

          <div
            class="reservation-create-page__filter-field"
            data-testid="reservation-device-category-filter"
          >
            <label class="reservation-create-page__filter-label">设备分类</label>
            <AppTreeSelect
              class="reservation-create-page__category-filter"
              :model-value="selectedCategoryId"
              :data="categoryOptions"
              :disabled="!canSearchReservableDevices || searchLoading"
              node-key="value"
              check-strictly
              default-expand-all
              clearable
              placeholder="按分类筛选可预约设备"
              @update:modelValue="handleCategoryFilterChange"
            />
          </div>

          <template #actions>
            <div class="reservation-create-page__filter-actions">
              <el-button
                class="reservation-create-page__filter-submit"
                type="primary"
                :disabled="!canSearchReservableDevices || searchLoading"
                @click="handleSearchSubmit"
              >
                查询设备
              </el-button>
              <el-button
                class="reservation-create-page__filter-reset"
                :disabled="searchLoading"
                @click="handleSearchReset"
              >
                重置筛选
              </el-button>
            </div>
          </template>
        </ConsoleFilterPanel>

        <el-card class="reservation-create-page__results-card">
          <template #header>
            <div class="reservation-create-page__results-header">
              <div>
                <p class="reservation-create-page__results-title">可预约设备</p>
                <p class="reservation-create-page__results-description">
                  {{
                    canSearchReservableDevices
                      ? `当前条件下共找到 ${searchTotal} 台可预约设备，翻页或换筛选都不会清空已选面板。`
                      : '请先在表单里选择合法的预约时间范围，再触发设备搜索。'
                  }}
                </p>
              </div>
            </div>
          </template>

          <div class="reservation-create-page__results" data-testid="reservation-device-results">
            <p v-if="!canSearchReservableDevices" class="reservation-create-page__results-empty">
              请先在表单里选择合法的预约时间范围，再搜索可预约设备。
            </p>
            <p v-else-if="searchLoading" class="reservation-create-page__results-empty">
              正在查询可预约设备...
            </p>
            <p v-else-if="!searchResults.length" class="reservation-create-page__results-empty">
              当前筛选条件下没有可预约设备。
            </p>
            <ul v-else class="reservation-create-page__results-list">
              <li
                v-for="device in searchResults"
                :key="device.id"
                class="reservation-create-page__result-item"
              >
                <div class="reservation-create-page__result-summary">
                  <p class="reservation-create-page__result-name">{{ device.name }}</p>
                  <p class="reservation-create-page__result-meta">
                    {{ device.deviceNumber }} · {{ device.categoryName }} · {{ device.location }}
                  </p>
                </div>

                <button
                  type="button"
                  class="reservation-create-page__result-action"
                  :data-testid="`reservation-device-select-${device.id}`"
                  :disabled="selectedDeviceIds.includes(device.id)"
                  @click="handleSelectReservableDevice(device)"
                >
                  {{ selectedDeviceIds.includes(device.id) ? '已选' : '加入已选' }}
                </button>
              </li>
            </ul>
          </div>

          <Pagination
            v-if="canSearchReservableDevices && searchTotal > 0"
            :current-page="searchPage"
            :page-size="searchPageSize"
            :total="searchTotal"
            :disabled="searchLoading"
            @change="handleSearchPaginationChange"
          />
        </el-card>
      </template>

      <template #aside>
        <div class="reservation-create-page__aside-stack">
          <ConsoleAsidePanel
            class="reservation-create-page__aside"
            title="已选设备"
            description="已选列表独立于当前搜索结果维护，换页或换筛选都不会把设备从创建链路里冲掉。"
          >
            <div
              class="reservation-create-page__selected-panel"
              data-testid="reservation-selected-devices"
            >
              <p class="reservation-create-page__selected-count" data-testid="reservation-selected-count">
                已选 {{ selectedDeviceCount }} / 10 台
              </p>

              <p v-if="!selectedDeviceCount" class="reservation-create-page__selected-empty">
                请从左侧搜索结果中加入设备。
              </p>

              <ul v-else class="reservation-create-page__selected-list">
                <li
                  v-for="device in selectedDevices"
                  :key="device.deviceId"
                  class="reservation-create-page__selected-item"
                >
                  <div>
                    <p class="reservation-create-page__selected-name">{{ device.deviceName }}</p>
                    <p class="reservation-create-page__selected-meta">{{ device.deviceNumber }}</p>
                  </div>
                  <button
                    type="button"
                    class="reservation-create-page__selected-remove"
                    @click="handleRemoveSelectedDevice(device.deviceId)"
                  >
                    移除
                  </button>
                </li>
              </ul>
            </div>
          </ConsoleAsidePanel>

          <ConsoleAsidePanel
            class="reservation-create-page__aside"
            title="预约约束"
            description="时间范围是设备搜索的唯一前置条件，分类筛选默认包含后代节点，已选设备最多 10 台。"
          >
            <p class="reservation-create-page__note">
              系统管理员创建预约时必须显式选择目标用户，避免把代预约请求误落到当前登录账号。
            </p>
          </ConsoleAsidePanel>
        </div>
      </template>
    </ConsoleDetailLayout>

    <ConfirmDialog
      v-model="confirmVisible"
      data-testid="reservation-confirm-dialog"
      title="确认提交预约"
      :message="confirmMessage"
      confirm-text="确认提交"
      :loading="submitting"
      :confirm-disabled="confirmActionConsumed"
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
.reservation-create-page__blocking-card,
.reservation-create-page__aside,
.reservation-create-page__results-card {
  border: 1px solid var(--app-border-soft);
  box-shadow: var(--app-shadow-card);
}

.reservation-create-page__hero {
  background: linear-gradient(135deg, var(--app-surface-card), var(--app-tone-brand-surface));
}

.reservation-create-page__mode-card,
.reservation-create-page__blocking-card,
.reservation-create-page__aside,
.reservation-create-page__results-card {
  background: var(--app-surface-card);
}

.reservation-create-page__mode-card :deep(.el-card__header) {
  margin: 0;
  color: var(--app-text-primary);
}

.reservation-create-page__mode-card {
  border-radius: 28px;
}

.reservation-create-page__mode-card :deep(.el-radio-group),
.reservation-create-page__mode-card :deep(.el-radio-button__inner) {
  background: var(--app-surface-card);
}

.reservation-create-page__target-user {
  display: block;
  max-width: 360px;
  margin-top: 16px;
}

.reservation-create-page__filter-panel {
  margin-top: 20px;
}

.reservation-create-page__filter-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: min(100%, 280px);
}

.reservation-create-page__filter-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-secondary);
}

.reservation-create-page__filter-actions,
.reservation-create-page__aside-stack {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.reservation-create-page__aside-stack {
  flex-direction: column;
  gap: 16px;
}

.reservation-create-page__results-title,
.reservation-create-page__blocking-title,
.reservation-create-page__result-name,
.reservation-create-page__blocking-device-name,
.reservation-create-page__selected-name,
.reservation-create-page__selected-count {
  margin: 0;
  color: var(--app-text-primary);
}

.reservation-create-page__blocking-description,
.reservation-create-page__blocking-summary,
.reservation-create-page__results-description,
.reservation-create-page__result-meta,
.reservation-create-page__blocking-device-reason,
.reservation-create-page__selected-meta,
.reservation-create-page__selected-empty,
.reservation-create-page__results-empty,
.reservation-create-page__note {
  margin: 0;
  color: var(--app-text-secondary);
  line-height: 1.7;
}

.reservation-create-page__results {
  min-height: 160px;
}

.reservation-create-page__blocking-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reservation-create-page__results-list,
.reservation-create-page__blocking-list,
.reservation-create-page__selected-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.reservation-create-page__blocking-item,
.reservation-create-page__result-item,
.reservation-create-page__selected-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--app-border-soft);
  border-radius: 20px;
  background: var(--app-surface-card-strong);
}

.reservation-create-page__blocking-item {
  align-items: flex-start;
  flex-direction: column;
}

.reservation-create-page__result-summary {
  min-width: 0;
}

.reservation-create-page__result-action,
.reservation-create-page__selected-remove {
  flex-shrink: 0;
  padding: 10px 16px;
  border: 1px solid var(--app-border-soft);
  border-radius: 999px;
  background: var(--app-surface-card);
  color: var(--app-text-primary);
  cursor: pointer;
}

.reservation-create-page__result-action:disabled {
  cursor: not-allowed;
  color: var(--app-text-secondary);
}
</style>
