<script setup lang="ts">
import { FolderAdd } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'

import type { ApprovalMode as CategoryApprovalMode } from '@/api/categories'
import EmptyState from '@/components/common/EmptyState.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import ConsoleTableSection from '@/components/layout/ConsoleTableSection.vue'
import { ApprovalModeLabel } from '@/enums'
import { UserRole } from '@/enums/UserRole'
import { useAuthStore } from '@/stores/modules/auth'
import { useCategoryStore } from '@/stores/modules/category'

import Manage from './Manage.vue'

interface CategoryFormValue {
  name: string
  parentName: string | null
  sortOrder: number
  description: string
  defaultApprovalMode: CategoryApprovalMode
}

/**
 * 分类管理页。
 * 分类树展示全部分类层级，但真正的新增维护入口只向设备管理员开放，确保前端菜单与后端设备管理职责保持一致。
 */
const authStore = useAuthStore()
const categoryStore = useCategoryStore()

const manageVisible = ref(false)
const isDeviceAdmin = computed(() => authStore.userRole === UserRole.DEVICE_ADMIN)

async function handleCreateCategory(payload: CategoryFormValue) {
  await categoryStore.createCategory(payload)
  ElMessage.success('分类创建成功')
  manageVisible.value = false
}

onMounted(() => {
  void categoryStore.fetchCategoryTree()
})
</script>

<template>
  <section class="category-list-view">
    <ConsolePageHero
      eyebrow="Category Console"
      title="设备分类管理"
      description="分类树展示全部层级，但真正的新增维护入口只向设备管理员开放，确保前后端职责一致。"
      class="category-list-view__hero"
    >
      <template #actions>
        <!-- 分类创建入口只给设备管理员，系统管理员与普通用户不在前端暴露该入口。 -->
        <el-button
          v-if="isDeviceAdmin"
          class="category-list-view__create"
          type="primary"
          @click="manageVisible = true"
        >
          <el-icon><FolderAdd /></el-icon>
          新建分类
        </el-button>
      </template>
    </ConsolePageHero>

    <ConsoleTableSection
      title="分类树"
      :count="`${categoryStore.tree.length} 个顶级分类`"
      class="category-list-view__table-shell"
    >
      <EmptyState
        v-if="!categoryStore.tree.length && !categoryStore.loading"
        title="暂无分类数据"
        description="可由设备管理员新建顶级分类和子分类，为设备档案提供统一的归类口径。"
      />

      <el-tree v-else :data="categoryStore.tree" node-key="id" default-expand-all>
        <template #default="{ data }">
          <div class="category-list-view__tree-node">
            <div>
              <strong>{{ data.name }}</strong>
              <p>{{ data.description || '暂无分类描述' }}</p>
            </div>
            <div class="category-list-view__tree-meta">
              <el-tag>
                {{
                  ApprovalModeLabel[data.defaultApprovalMode as CategoryApprovalMode] ||
                  data.defaultApprovalMode
                }}
              </el-tag>
              <span>排序 {{ data.sortOrder }}</span>
            </div>
          </div>
        </template>
      </el-tree>
    </ConsoleTableSection>

    <Manage
      v-model="manageVisible"
      :category-options="categoryStore.options"
      :submitting="categoryStore.submitting"
      @submit="handleCreateCategory"
    />
  </section>
</template>

<style scoped lang="scss">
.category-list-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.category-list-view__card-header,
.category-list-view__tree-node,
.category-list-view__tree-meta {
  display: flex;
  align-items: center;
}

.category-list-view__card-header,
.category-list-view__tree-node {
  justify-content: space-between;
}

.category-list-view__card-header span,
.category-list-view__tree-node strong {
  margin: 0;
  color: var(--app-text-primary);
}

.category-list-view__card-header span:last-child,
.category-list-view__tree-node p,
.category-list-view__tree-meta span {
  font-size: 13px;
  color: var(--app-text-secondary);
}

.category-list-view__tree-node {
  width: 100%;
  gap: 16px;
  padding: 6px 0;
}

.category-list-view__tree-node p {
  margin: 6px 0 0;
}

.category-list-view__tree-meta {
  gap: 10px;
}
</style>
