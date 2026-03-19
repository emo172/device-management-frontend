<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import DeviceForm from '@/components/form/DeviceForm.vue'
import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleDetailLayout from '@/components/layout/ConsoleDetailLayout.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
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
    <ConsolePageHero
      eyebrow="Device Create"
      title="新建设备"
      description="创建设备页只承接分类加载、基础字段录入与提交跳转，真正的字段规则统一收口到 DeviceForm。"
    />

    <ConsoleDetailLayout>
      <template #main>
        <DeviceForm
          mode="create"
          :initial-value="initialValue"
          :category-options="categoryStore.options"
          :submitting="deviceStore.loading"
          @submit="handleSubmit"
        />
      </template>

      <template #aside>
        <ConsoleAsidePanel
          title="录入提示"
          description="设备状态默认从可用开始，后续借出、维护与停用流转都依赖这里的主档案信息。"
        >
          <p class="device-form-page__note">
            分类树进入页面即预加载，确保设备档案录入时不需要额外跳离当前表单。
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

.device-form-page__note {
  margin: 0;
  color: var(--app-text-secondary);
  line-height: 1.7;
}
</style>
