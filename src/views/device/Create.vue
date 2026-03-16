<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

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
 * 创建设备页。
 * 只负责承接分类树加载、表单提交与成功跳转，真正的字段编辑都下沉到 `DeviceForm`，避免创建与编辑页重复维护表单结构。
 */
const router = useRouter()
const deviceStore = useDeviceStore()
const categoryStore = useCategoryStore()

const initialValue = computed<DeviceFormValue>(() => ({
  name: '',
  deviceNumber: '',
  categoryName: '',
  status: DeviceStatus.AVAILABLE,
  location: '',
  description: '',
}))

async function handleSubmit(payload: DeviceFormValue) {
  const device = await deviceStore.createDevice(payload)
  ElMessage.success('设备创建成功')
  void router.push(`/devices/${device.id}`)
}

onMounted(() => {
  void categoryStore.fetchCategoryTree()
})
</script>

<template>
  <section class="device-form-page">
    <header class="device-form-page__header">
      <p>Device Create</p>
      <h1>新建设备</h1>
    </header>

    <DeviceForm
      mode="create"
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
