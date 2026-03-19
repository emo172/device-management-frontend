<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, reactive, ref, watch } from 'vue'

import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleDetailLayout from '@/components/layout/ConsoleDetailLayout.vue'
import ConsoleFeedbackSurface from '@/components/layout/ConsoleFeedbackSurface.vue'
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
const roleListLoadFailed = ref(false)
const submitting = ref(false)

const roleOptions = computed(() => userStore.roleList)
const currentRoleLabel = computed(() => formatRoleLabel(props.user?.roleName))
const selectedRoleLabel = computed(() => {
  const selectedRole = roleOptions.value.find((role) => role.id === formState.roleId)
  return formatRoleLabel(selectedRole?.name)
})
const canSubmitRoleAssign = computed(
  () =>
    !!props.user &&
    !!formState.roleId &&
    !submitting.value &&
    !roleListLoadFailed.value &&
    roleOptions.value.length > 0,
)

async function ensureRoleOptionsReady() {
  if (userStore.roleList.length) {
    roleListLoadFailed.value = false
    return
  }

  roleListLoadFailed.value = false

  try {
    await userStore.fetchRoleList()
  } catch {
    /**
     * 请求层已经提示错误，这里额外保留页面级失败态，避免弹窗静默显示空选项让管理员误以为没有可分配角色。
     */
    roleListLoadFailed.value = true
  }
}

watch(
  () => [props.modelValue, props.user] as const,
  ([visible, user]) => {
    if (!visible || !user) {
      return
    }

    /**
     * 角色列表来源于真实角色表；弹窗直接打开时若还没加载到角色数据，需要在这里补一次拉取。
     * 这样不会依赖列表页一定先完成预加载，单独复用弹窗时也能保持正确选项来源。
     */
    if (!userStore.roleList.length) {
      void ensureRoleOptionsReady()
    } else {
      roleListLoadFailed.value = false
    }

    formState.roleId = user.roleId
  },
  { immediate: true },
)

function formatRoleLabel(roleName?: string) {
  if (!roleName) {
    return '-'
  }

  return UserRoleLabel[roleName as keyof typeof UserRoleLabel] ?? roleName
}

function handleVisibilityChange(visible: boolean) {
  emit('update:modelValue', visible)
}

async function handleSubmit() {
  if (!canSubmitRoleAssign.value || !props.user) {
    return
  }

  try {
    submitting.value = true

    await userStore.updateUserRole(props.user.id, { roleId: formState.roleId })
    ElMessage.success('角色分配成功')
    emit('success')
    emit('update:modelValue', false)
  } catch {
    // 请求层已经提示失败原因，这里只阻止点击确认后产生未处理拒绝。
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="分配角色"
    width="880px"
    destroy-on-close
    @update:model-value="handleVisibilityChange"
  >
    <ConsoleDetailLayout class="user-role-dialog__layout">
      <template #main>
        <section class="user-role-dialog__panel">
          <div class="user-role-dialog__header">
            <p class="user-role-dialog__eyebrow">Role Assignment</p>
            <h2>分配角色</h2>
            <p class="user-role-dialog__description">
              当前弹窗只提交
              `roleId`，保持与后端角色接口的真实契约一致；角色中文语义全部来源于角色列表，不在页面本地硬编码。
            </p>
          </div>

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
                  :label="formatRoleLabel(role.name)"
                  :value="role.id"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </section>
      </template>

      <template #aside>
        <ConsoleAsidePanel
          title="角色说明"
          description="系统管理员分配角色时需要同时确认当前角色、目标角色与角色表加载状态，避免把页面展示语义和后端角色表脱钩。"
        >
          <dl class="user-role-dialog__summary">
            <div>
              <dt>当前角色</dt>
              <dd>{{ currentRoleLabel }}</dd>
            </div>
            <div>
              <dt>目标角色</dt>
              <dd>{{ selectedRoleLabel }}</dd>
            </div>
            <div>
              <dt>可选角色数</dt>
              <dd>{{ roleOptions.length }}</dd>
            </div>
          </dl>

          <ConsoleFeedbackSurface
            :state="roleListLoadFailed ? 'error' : 'confirm'"
            class="user-role-dialog__tip"
          >
            <template v-if="roleListLoadFailed">
              <strong>角色列表加载失败</strong>
              <p>当前无法确认后端真实角色表，请稍后重试后再执行角色分配。</p>
            </template>
            <template v-else>
              <strong>变更提示</strong>
              <p>
                角色变更会立即影响菜单、路由和按钮可见性，提交前请确认账号是否真的需要切换职责边界。
              </p>
            </template>
          </ConsoleFeedbackSurface>
        </ConsoleAsidePanel>
      </template>
    </ConsoleDetailLayout>

    <template #footer>
      <div class="user-role-dialog__footer">
        <el-button @click="emit('update:modelValue', false)">取消</el-button>
        <el-button :disabled="!canSubmitRoleAssign" type="primary" @click="handleSubmit">
          确认分配
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.user-role-dialog__panel {
  padding: 24px 28px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
}

.user-role-dialog__header {
  margin-bottom: 22px;
}

.user-role-dialog__eyebrow,
.user-role-dialog__header h2,
.user-role-dialog__description {
  margin: 0;
}

.user-role-dialog__eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #1d4ed8;
}

.user-role-dialog__header h2 {
  margin-top: 10px;
  color: var(--app-text-primary);
}

.user-role-dialog__description {
  margin-top: 12px;
  line-height: 1.75;
  color: var(--app-text-secondary);
}

.user-role-dialog__field {
  width: 100%;
}

.user-role-dialog__summary {
  display: grid;
  gap: 14px;
  margin: 0;
}

.user-role-dialog__summary dt {
  font-size: 13px;
  color: var(--app-text-secondary);
}

.user-role-dialog__summary dd {
  margin: 6px 0 0;
  font-weight: 600;
  color: var(--app-text-primary);
}

.user-role-dialog__tip {
  min-height: 0;
  align-items: flex-start;
  padding: 18px 20px;
  text-align: left;
}

.user-role-dialog__tip strong,
.user-role-dialog__tip p {
  margin: 0;
}

.user-role-dialog__tip p {
  color: var(--app-text-secondary);
  line-height: 1.7;
}

.user-role-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
