<script setup lang="ts">
import { Plus, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import DeviceCard from '@/components/business/DeviceCard.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import ConsoleSummaryGrid from '@/components/layout/ConsoleSummaryGrid.vue'
import ConsoleTableSection from '@/components/layout/ConsoleTableSection.vue'
import DeviceStatusTag from '@/components/business/DeviceStatusTag.vue'
import { DeviceStatusLabel, DeviceStatus } from '@/enums'
import { UserRole } from '@/enums/UserRole'
import { useAuthStore } from '@/stores/modules/auth'
import { useDeviceStore } from '@/stores/modules/device'

/**
 * 设备列表页。
 * 该页面对全部登录角色开放，但写操作必须以设备管理员为准：普通用户与系统管理员只能查看设备信息，不能直接改设备主数据。
 */
const router = useRouter()
const authStore = useAuthStore()
const deviceStore = useDeviceStore()

const filters = reactive({
  categoryName: deviceStore.query.categoryName ?? '',
})

const deleteDialogVisible = ref(false)
const deletingDeviceId = ref<string | null>(null)

const isDeviceAdmin = computed(() => authStore.userRole === UserRole.DEVICE_ADMIN)
const deviceCards = computed(() => deviceStore.list.slice(0, 3))
const tableData = computed(() => deviceStore.list)

function buildQuery(overrides?: Partial<{ page: number; size: number; categoryName?: string }>) {
  return {
    page: overrides?.page ?? deviceStore.query.page ?? 1,
    size: overrides?.size ?? deviceStore.query.size ?? 10,
    categoryName: (overrides?.categoryName ?? filters.categoryName) || undefined,
  }
}

async function loadDeviceList(
  overrides?: Partial<{ page: number; size: number; categoryName?: string }>,
) {
  await deviceStore.fetchDeviceList(buildQuery(overrides))
}

/**
 * 搜索按分类名称回查设备时需要强制回到第一页，避免用户停留在旧页码导致误以为筛选结果为空。
 */
async function handleSearch() {
  await loadDeviceList({ page: 1 })
}

async function handleReset() {
  filters.categoryName = ''
  await loadDeviceList({ page: 1, categoryName: undefined })
}

async function handlePaginationChange(payload: { currentPage: number; pageSize: number }) {
  await loadDeviceList({ page: payload.currentPage, size: payload.pageSize })
}

function handleCreate() {
  void router.push('/devices/create')
}

function handleDetail(deviceId: string) {
  void router.push(`/devices/${deviceId}`)
}

function handleEdit(deviceId: string) {
  void router.push(`/devices/${deviceId}/edit`)
}

function handleOpenDelete(deviceId: string) {
  deletingDeviceId.value = deviceId
  deleteDialogVisible.value = true
}

async function handleConfirmDelete() {
  if (!deletingDeviceId.value) {
    return
  }

  await deviceStore.deleteDevice(deletingDeviceId.value)
  deleteDialogVisible.value = false
  deletingDeviceId.value = null
  ElMessage.success('设备已删除')
}

/**
 * 设备状态流转必须走专用接口，列表页这里先提供最常见的“切为维修中”快捷入口，避免直接误改基础信息接口。
 */
async function handleQuickStatusChange(deviceId: string) {
  await deviceStore.updateStatus(deviceId, {
    status: DeviceStatus.MAINTENANCE,
    reason: '设备管理员在列表页标记为维修中',
  })

  ElMessage.success(`已将设备状态更新为${DeviceStatusLabel[DeviceStatus.MAINTENANCE]}`)
}

onMounted(() => {
  void loadDeviceList({ page: 1, size: 10 })
})
</script>

<template>
  <section class="device-list-view">
    <ConsolePageHero
      title="设备中心"
      description="统一查看设备状态、分类归属与位置分布。仅设备管理员可在此维护设备主数据，其余角色保持只读访问。"
      class="device-list-view__hero"
    >
      <template #actions>
        <!-- 设备写入口只对 DEVICE_ADMIN 可见，避免系统管理员误触发后端 403。 -->
        <div class="device-list-view__hero-actions">
          <el-button @click="loadDeviceList()">
            <el-icon><RefreshRight /></el-icon>
            刷新
          </el-button>
          <el-button v-if="isDeviceAdmin" type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            新增设备
          </el-button>
        </div>
      </template>
    </ConsolePageHero>

    <!-- 设备列表顶部筛选卡片只承接当前列表的分类检索，避免把新增设备等写操作入口和筛选语义混在同一块文案里。 -->
    <SearchBar
      v-model="filters.categoryName"
      title="设备筛选"
      description="按分类名称快速缩小当前设备列表范围。"
      label="设备分类"
      placeholder="按分类名称筛选设备"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ConsoleSummaryGrid v-if="deviceCards.length" class="device-list-view__card-grid">
      <DeviceCard
        v-for="device in deviceCards"
        :key="device.id"
        :device="device"
        :show-admin-actions="isDeviceAdmin"
        @detail="handleDetail"
        @edit="handleEdit"
        @status="handleQuickStatusChange"
        @delete="handleOpenDelete"
      />
    </ConsoleSummaryGrid>

    <ConsoleTableSection
      title="设备列表"
      :count="deviceStore.total"
      class="device-list-view__table-shell"
    >
      <EmptyState
        v-if="!tableData.length && !deviceStore.loading"
        title="暂无符合条件的设备"
        description="可以尝试调整分类名称筛选条件，或等待设备管理员补充设备档案。"
        action-text="重新加载"
        @action="loadDeviceList()"
      />

      <template v-else>
        <el-table v-loading="deviceStore.loading" :data="tableData" stripe>
          <el-table-column label="设备名称" min-width="200">
            <template #default="scope">
              <button
                class="device-list-view__link"
                type="button"
                @click="handleDetail(scope.row.id)"
              >
                {{ scope.row.name }}
              </button>
            </template>
          </el-table-column>
          <el-table-column prop="deviceNumber" label="设备编号" min-width="160" />
          <el-table-column prop="categoryName" label="分类" min-width="150" />
          <el-table-column label="状态" min-width="140">
            <template #default="scope">
              <DeviceStatusTag :status="scope.row.status" />
            </template>
          </el-table-column>
          <el-table-column prop="location" label="位置" min-width="140" />
          <el-table-column label="操作" min-width="260" fixed="right">
            <template #default="scope">
              <div class="device-list-view__table-actions">
                <el-button text type="primary" @click="handleDetail(scope.row.id)">详情</el-button>

                <!-- 编辑、删除、状态变更都必须与后端 DEVICE_ADMIN 权限收口保持一致。 -->
                <template v-if="isDeviceAdmin">
                  <el-button text type="primary" @click="handleEdit(scope.row.id)">编辑</el-button>
                  <el-button text type="warning" @click="handleQuickStatusChange(scope.row.id)">
                    状态变更
                  </el-button>
                  <el-button text type="danger" @click="handleOpenDelete(scope.row.id)">
                    删除
                  </el-button>
                </template>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <template #footer>
        <Pagination
          :current-page="deviceStore.query.page ?? 1"
          :page-size="deviceStore.query.size ?? 10"
          :total="deviceStore.total"
          :disabled="deviceStore.loading"
          @change="handlePaginationChange"
        />
      </template>
    </ConsoleTableSection>

    <ConfirmDialog
      v-model="deleteDialogVisible"
      title="确认删除设备"
      message="删除后设备不会立即物理消失，但会进入软删除状态并从当前列表移除。"
      confirm-text="确认删除"
      @confirm="handleConfirmDelete"
    />
  </section>
</template>

<style scoped lang="scss">
.device-list-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.device-list-view__hero {
  border: 1px solid var(--app-border-soft);
  background: linear-gradient(
    135deg,
    var(--app-surface-card-strong),
    var(--app-tone-warning-surface)
  );
  box-shadow: var(--app-shadow-card);
}

.device-list-view__hero-actions,
.device-list-view__table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.device-list-view__hero-actions {
  align-self: flex-start;
}

.device-list-view__card-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.device-list-view__link {
  padding: 0;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: var(--app-tone-brand-text);
  cursor: pointer;
}

// 列表里的详情入口和首屏 Hero 同时承担高频导航，统一改为主题 token 才不会在深色下留下孤立亮块或固定蓝链色。
.device-list-view__link:hover,
.device-list-view__link:focus-visible {
  color: var(--app-tone-brand-text-strong);
}
</style>
