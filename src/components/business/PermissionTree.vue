<script setup lang="ts">
import { computed } from 'vue'

import type { RolePermissionTreeModuleResponse } from '@/api/roles'

/**
 * 角色权限树组件。
 * 后端已经返回模块 -> 权限节点的两级结构，这里直接按真实分组渲染，避免前端自行发明第三套权限归类口径。
 */
const props = withDefaults(
  defineProps<{
    modules: RolePermissionTreeModuleResponse[]
    modelValue: string[]
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const selectedPermissionIds = computed(() => new Set(props.modelValue))

function buildNextSelection(nextPermissionId: string, checked: boolean) {
  const nextIds = [...props.modelValue]

  if (checked && !selectedPermissionIds.value.has(nextPermissionId)) {
    nextIds.push(nextPermissionId)
  }

  if (!checked) {
    return nextIds.filter((permissionId) => permissionId !== nextPermissionId)
  }

  return nextIds
}

function handlePermissionChange(permissionId: string, checked: boolean) {
  emit('update:modelValue', buildNextSelection(permissionId, checked))
}

function handleModuleToggle(moduleItem: RolePermissionTreeModuleResponse) {
  const modulePermissionIds = moduleItem.permissions.map((permission) => permission.permissionId)
  const isAllSelected = modulePermissionIds.every((permissionId) =>
    selectedPermissionIds.value.has(permissionId),
  )

  if (isAllSelected) {
    emit(
      'update:modelValue',
      props.modelValue.filter((permissionId) => !modulePermissionIds.includes(permissionId)),
    )
    return
  }

  const nextIds = [...props.modelValue]

  modulePermissionIds.forEach((permissionId) => {
    if (!selectedPermissionIds.value.has(permissionId)) {
      nextIds.push(permissionId)
    }
  })

  emit('update:modelValue', nextIds)
}
</script>

<template>
  <div class="permission-tree">
    <article v-for="moduleItem in modules" :key="moduleItem.module" class="permission-tree__module">
      <header class="permission-tree__module-header">
        <div>
          <p class="permission-tree__module-code">{{ moduleItem.module }}</p>
          <p class="permission-tree__module-meta">{{ moduleItem.permissions.length }} 项权限</p>
        </div>
        <button
          :data-testid="`permission-module-toggle-${moduleItem.module}`"
          class="permission-tree__module-toggle"
          type="button"
          :disabled="disabled"
          @click="handleModuleToggle(moduleItem)"
        >
          模块全选
        </button>
      </header>

      <div class="permission-tree__permission-list">
        <label
          v-for="permission in moduleItem.permissions"
          :key="permission.permissionId"
          class="permission-tree__permission-item"
        >
          <input
            :value="permission.permissionId"
            :checked="selectedPermissionIds.has(permission.permissionId)"
            :disabled="disabled"
            type="checkbox"
            @change="
              handlePermissionChange(
                permission.permissionId,
                ($event.target as HTMLInputElement).checked,
              )
            "
          />
          <div>
            <strong>{{ permission.name }}</strong>
            <p>{{ permission.description }}</p>
          </div>
        </label>
      </div>
    </article>
  </div>
</template>

<style scoped lang="scss">
.permission-tree {
  display: grid;
  gap: 16px;
}

.permission-tree__module {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
}

.permission-tree__module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
}

.permission-tree__module-code {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #0f766e;
}

.permission-tree__module-meta {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--app-text-secondary);
}

.permission-tree__module-toggle {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  background: rgba(15, 118, 110, 0.1);
  color: #0f766e;
  cursor: pointer;
}

.permission-tree__module-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.permission-tree__permission-list {
  display: grid;
  gap: 12px;
  padding: 20px 22px 22px;
}

.permission-tree__permission-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.9);
}

.permission-tree__permission-item input {
  margin-top: 4px;
}

.permission-tree__permission-item strong {
  color: var(--app-text-primary);
}

.permission-tree__permission-item p {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--app-text-secondary);
}
</style>
