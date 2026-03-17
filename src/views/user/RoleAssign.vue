<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, reactive, watch } from 'vue'

import { UserRoleLabel } from '@/enums'
import { useUserStore } from '@/stores/modules/user'

interface ManagedUserPreview {
  id: string
  username: string
  roleId: string
  roleName: string
}

/**
 * 用户角色分配弹窗。
 * 角色选项只能来自已加载的角色列表，避免页面硬编码角色枚举后与后端实际角色表脱节。
 */
const props = defineProps<{
  modelValue: boolean
  user: ManagedUserPreview | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const userStore = useUserStore()

const formState = reactive({
  roleId: '',
})

const roleOptions = computed(() => userStore.roleList)

watch(
  () => [props.modelValue, props.user] as const,
  ([visible, user]) => {
    if (!visible || !user) {
      return
    }

    formState.roleId = user.roleId
  },
  { immediate: true },
)

async function handleOpen(visible: boolean) {
  emit('update:modelValue', visible)

  if (visible && !userStore.roleList.length) {
    await userStore.fetchRoleList()
  }
}

async function handleSubmit() {
  if (!props.user || !formState.roleId) {
    return
  }

  await userStore.updateUserRole(props.user.id, { roleId: formState.roleId })
  ElMessage.success('角色分配成功')
  emit('success')
  emit('update:modelValue', false)
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="分配角色"
    width="460px"
    destroy-on-close
    @update:model-value="handleOpen"
  >
    <el-form label-position="top">
      <el-form-item label="用户账号">
        <el-input :model-value="user?.username ?? ''" disabled />
      </el-form-item>
      <el-form-item label="角色">
        <el-select
          v-model="formState.roleId"
          class="user-role-dialog__field"
          placeholder="请选择角色"
        >
          <el-option
            v-for="role in roleOptions"
            :key="role.id"
            :label="UserRoleLabel[role.name as keyof typeof UserRoleLabel] ?? role.name"
            :value="role.id"
          />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="user-role-dialog__footer">
        <el-button @click="emit('update:modelValue', false)">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认分配</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.user-role-dialog__field {
  width: 100%;
}

.user-role-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
