<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import DeviceForm from '@/components/form/DeviceForm.vue'
import { DeviceStatus } from '@/enums'
import { useCategoryStore } from '@/stores/modules/category'
import { useDeviceStore } from '@/stores/modules/device'

interface DeviceFormValue {
  name: string
  deviceNumber: string
  categoryName: string
  status: string
  location: string
  description: string
}

/**
 * 编辑设备页。
 * 页面进入时需要并行拉取分类树与设备详情，再把详情映射为可编辑表单值；提交时只走基础信息更新接口，不在此页直接承担状态流转。
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
  status: deviceStore.currentDevice?.status ?? DeviceStatus.AVAILABLE,
  location: deviceStore.currentDevice?.location ?? '',
  description: deviceStore.currentDevice?.description ?? '',
}))

async function handleSubmit(payload: DeviceFormValue) {
  await deviceStore.updateDevice(deviceId.value, {
    name: payload.name,
    categoryName: payload.categoryName,
    status: payload.status,
    location: payload.location,
    description: payload.description,
  })

  ElMessage.success('设备信息已更新')
  void router.push(`/devices/${deviceId.value}`)
}

watch(
  deviceId,
  (value) => {
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
    <header class="device-form-page__header">
      <p>Device Edit</p>
      <h1>编辑设备</h1>
    </header>

    <DeviceForm
      mode="edit"
      :initial-value="initialValue"
      :category-options="categoryStore.options"
      :submitting="deviceStore.loading"
      @submit="handleSubmit"
    />
  </section>
</template>

<style scoped lang="scss">
.device-form-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.device-form-page__header p {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #b45309;
}

.device-form-page__header h1 {
  margin: 0;
  color: var(--app-text-primary);
}
</style>
