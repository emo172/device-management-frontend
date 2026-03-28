<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import DeviceForm from '@/components/form/DeviceForm.vue'
import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleDetailLayout from '@/components/layout/ConsoleDetailLayout.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import { useCategoryStore } from '@/stores/modules/category'
import { useDeviceStore } from '@/stores/modules/device'

interface DeviceFormValue {
  name: string
  deviceNumber: string
  categoryName: string
  location: string
  description: string
}

/**
 * 编辑设备页。
 * 页面进入时需要并行拉取分类树与设备详情，再把详情映射为可编辑表单值；
 * 提交时只走基础信息更新接口，不在此页直接承担状态流转，避免绕过专用状态接口与状态日志链路。
 */
const route = useRoute()
const router = useRouter()
const deviceStore = useDeviceStore()
const categoryStore = useCategoryStore()

const deviceId = computed(() => String(route.params.id || ''))

const initialValue = computed<DeviceFormValue>(() => ({
  name: deviceStore.currentDevice?.name ?? '',
  deviceNumber: deviceStore.currentDevice?.deviceNumber ?? '',
  categoryName: deviceStore.currentDevice?.categoryName ?? '',
  location: deviceStore.currentDevice?.location ?? '',
  description: deviceStore.currentDevice?.description ?? '',
}))

async function handleSubmit(payload: DeviceFormValue) {
  await deviceStore.updateDevice(deviceId.value, {
    name: payload.name,
    categoryName: payload.categoryName,
    location: payload.location,
    description: payload.description,
  })

  ElMessage.success('设备信息已更新')
  void router.push(`/devices/${deviceId.value}`)
}

watch(
  deviceId,
  (value) => {
    if (!value) {
      deviceStore.resetCurrentDevice()
      return
    }

    void deviceStore.fetchDeviceDetail(value)
  },
  { immediate: true },
)

onMounted(() => {
  void categoryStore.fetchCategoryTree()
})

onUnmounted(() => {
  deviceStore.resetCurrentDevice()
})
</script>

<template>
  <section class="device-form-page">
    <ConsolePageHero
      eyebrow="Device Edit"
      title="编辑设备"
      description="编辑页只修改基础档案，不在这里混入状态流转和图片维护，避免单页职责膨胀。"
      class="device-form-page__hero"
    />

    <ConsoleDetailLayout>
      <template #main>
        <DeviceForm
          mode="edit"
          :initial-value="initialValue"
          :category-options="categoryStore.options"
          :submitting="deviceStore.loading"
          @submit="handleSubmit"
        />
      </template>

      <template #aside>
        <ConsoleAsidePanel
          class="device-form-page__aside"
          title="编辑说明"
          description="设备编号在编辑页保持只读，避免把历史预约与借还记录关联的主标识链路打断。"
        >
          <p class="device-form-page__note">
            离开页面会清理当前设备缓存，确保切换到下一台设备时不会短暂闪现旧详情。
          </p>
        </ConsoleAsidePanel>
      </template>
    </ConsoleDetailLayout>
  </section>
</template>

<style scoped lang="scss">
.device-form-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.device-form-page__hero,
.device-form-page__aside {
  border: 1px solid var(--app-border-soft);
  box-shadow: var(--app-shadow-card);
}

.device-form-page__hero {
  background: linear-gradient(135deg, var(--app-surface-card), var(--app-tone-info-surface));
}

.device-form-page__aside {
  background: var(--app-surface-card);
}

.device-form-page__note {
  margin: 0;
  color: var(--app-text-secondary);
  line-height: 1.7;
}
</style>
