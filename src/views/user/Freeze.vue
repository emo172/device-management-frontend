<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, reactive, ref, watch } from 'vue'

import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleDetailLayout from '@/components/layout/ConsoleDetailLayout.vue'
import ConsoleFeedbackSurface from '@/components/layout/ConsoleFeedbackSurface.vue'
import { FreezeStatus, FreezeStatusLabel } from '@/enums'
import { useUserStore } from '@/stores/modules/user'

interface ManagedUserPreview {
  id: string
  username: string
  freezeStatus: FreezeStatus
}

/**
 * 用户冻结 / 解冻弹窗。
 * 冻结与解冻都走后端专用接口，前端在这里统一收口原因填写，避免列表页直接拼请求体导致业务理由缺失。
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
  freezeStatus: FreezeStatus.FROZEN,
  reason: '',
})
const reasonError = ref('')
const submitting = ref(false)

const isUnfreeze = computed(() => formState.freezeStatus === FreezeStatus.NORMAL)
const requiresReason = computed(() => formState.freezeStatus !== FreezeStatus.NORMAL)
const currentStatusLabel = computed(() =>
  props.user ? FreezeStatusLabel[props.user.freezeStatus] : '-',
)
const targetStatusLabel = computed(() => FreezeStatusLabel[formState.freezeStatus])
const dialogTitle = computed(() => {
  if (formState.freezeStatus === FreezeStatus.NORMAL) {
    return '解冻账号'
  }

  if (formState.freezeStatus === FreezeStatus.RESTRICTED) {
    return '限制账号'
  }

  return '冻结账号'
})
const handlingDescription = computed(() => {
  if (formState.freezeStatus === FreezeStatus.NORMAL) {
    return '恢复到正常状态后，预约入口重新可用；处理说明可以选填，不再强制要求填写原因。'
  }

  if (formState.freezeStatus === FreezeStatus.RESTRICTED) {
    return '受限状态保留账号，但必须在详情页说明限制原因，便于后续确认预计解除时间。'
  }

  return '冻结状态会直接禁用预约入口，并要求页面明确提示“账户已冻结”。'
})

watch(
  () => [props.modelValue, props.user] as const,
  ([visible, user]) => {
    if (!visible || !user) {
      return
    }

    /**
     * 列表页的入口文案分为“冻结账号”“调整限制”和“解冻账号”。
     * 因此只有 NORMAL 入口才默认跳到 `FROZEN`；`RESTRICTED` 需要保留受限语义，避免管理员什么都不改就误发错误状态。
     */
    if (user.freezeStatus === FreezeStatus.FROZEN) {
      formState.freezeStatus = FreezeStatus.NORMAL
    } else if (user.freezeStatus === FreezeStatus.NORMAL) {
      formState.freezeStatus = FreezeStatus.FROZEN
    } else {
      formState.freezeStatus = user.freezeStatus
    }

    formState.reason = ''
    reasonError.value = ''
  },
  { immediate: true },
)

function handleClose() {
  emit('update:modelValue', false)
}

/**
 * 限制与冻结都会改变账号可用范围，因此都必须填写原因，便于详情页和后续审计复盘复用。
 * 只有恢复到 NORMAL 才允许原因留空，避免把无意义文案强行写入后端记录。
 */
function validateForm() {
  if (requiresReason.value && !formState.reason.trim()) {
    reasonError.value = '限制或冻结账号时必须填写原因'
    return false
  }

  reasonError.value = ''
  return true
}

async function handleSubmit() {
  if (submitting.value || !props.user || !validateForm()) {
    if (!props.user) {
      return
    }

    ElMessage.warning(reasonError.value)
    return
  }

  try {
    submitting.value = true

    await userStore.freezeUser(props.user.id, {
      freezeStatus: formState.freezeStatus,
      reason: formState.reason.trim() || undefined,
    })

    ElMessage.success(`${dialogTitle.value}成功`)
    emit('success')
    handleClose()
  } catch {
    // 请求层已经提示失败原因，这里只阻止弹窗点击链路产生未处理拒绝。
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="880px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <ConsoleDetailLayout class="user-freeze-dialog__layout">
      <template #main>
        <section class="user-freeze-dialog__panel">
          <div class="user-freeze-dialog__header">
            <p class="user-freeze-dialog__eyebrow">Freeze Control</p>
            <h2>{{ dialogTitle }}</h2>
            <p class="user-freeze-dialog__description">
              冻结、受限和解冻都直接对齐后端冻结接口；弹窗在这里统一补足目标状态与原因，避免列表页各自拼接不一致的管理语义。
            </p>
          </div>

          <el-form label-position="top">
            <el-form-item label="目标状态">
              <el-select v-model="formState.freezeStatus" class="user-freeze-dialog__field">
                <el-option
                  :label="FreezeStatusLabel[FreezeStatus.NORMAL]"
                  :value="FreezeStatus.NORMAL"
                />
                <el-option
                  :label="FreezeStatusLabel[FreezeStatus.RESTRICTED]"
                  :value="FreezeStatus.RESTRICTED"
                />
                <el-option
                  :label="FreezeStatusLabel[FreezeStatus.FROZEN]"
                  :value="FreezeStatus.FROZEN"
                />
              </el-select>
            </el-form-item>
            <el-form-item :label="isUnfreeze ? '处理说明（选填）' : '限制原因 / 冻结原因'">
              <!-- RESTRICTED 与 FROZEN 都是有效业务状态，弹窗必须允许管理员明确区分，而不是把受限一律折叠成冻结。 -->
              <el-input
                v-model="formState.reason"
                type="textarea"
                :rows="4"
                :placeholder="isUnfreeze ? '可补充本次解冻说明' : '请输入限制或冻结原因'"
              />
              <p v-if="reasonError" class="user-freeze-dialog__error">{{ reasonError }}</p>
            </el-form-item>
          </el-form>
        </section>
      </template>

      <template #aside>
        <ConsoleAsidePanel
          title="状态说明"
          description="系统管理员在冻结前需要同时确认当前状态、目标状态和原因规则，避免把受限与冻结两种业务语义混用。"
        >
          <dl class="user-freeze-dialog__summary">
            <div>
              <dt>用户账号</dt>
              <dd>{{ user?.username || '-' }}</dd>
            </div>
            <div>
              <dt>当前状态</dt>
              <dd>{{ currentStatusLabel }}</dd>
            </div>
            <div>
              <dt>目标状态</dt>
              <dd>{{ targetStatusLabel }}</dd>
            </div>
          </dl>

          <ConsoleFeedbackSurface state="confirm" class="user-freeze-dialog__tip">
            <strong>{{ targetStatusLabel }}</strong>
            <p>{{ handlingDescription }}</p>
            <p v-if="requiresReason">当前操作必须填写限制或冻结原因，供详情页与后续审计复用。</p>
            <p v-else>恢复正常时原因可留空，仅在需要补充处理说明时填写。</p>
          </ConsoleFeedbackSurface>
        </ConsoleAsidePanel>
      </template>
    </ConsoleDetailLayout>

    <template #footer>
      <div class="user-freeze-dialog__footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button :disabled="submitting" type="primary" @click="handleSubmit">确认</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.user-freeze-dialog__panel {
  padding: 24px 28px;
  border: 1px solid var(--app-border-soft);
  border-radius: 28px;
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-card);
}

.user-freeze-dialog__header {
  margin-bottom: 22px;
}

.user-freeze-dialog__eyebrow,
.user-freeze-dialog__header h2,
.user-freeze-dialog__description {
  margin: 0;
}

.user-freeze-dialog__eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--app-tone-danger-text);
}

.user-freeze-dialog__header h2 {
  margin-top: 10px;
  color: var(--app-text-primary);
}

.user-freeze-dialog__description {
  margin-top: 12px;
  line-height: 1.75;
  color: var(--app-text-secondary);
}

.user-freeze-dialog__field {
  width: 100%;
}

.user-freeze-dialog__summary {
  display: grid;
  gap: 14px;
  margin: 0;
}

.user-freeze-dialog__summary dt {
  font-size: 13px;
  color: var(--app-text-secondary);
}

.user-freeze-dialog__summary dd {
  margin: 6px 0 0;
  font-weight: 600;
  color: var(--app-text-primary);
}

.user-freeze-dialog__tip {
  min-height: 0;
  align-items: flex-start;
  padding: 18px 20px;
  text-align: left;
  background: linear-gradient(180deg, var(--app-tone-danger-surface), var(--app-surface-card));
}

.user-freeze-dialog__tip strong,
.user-freeze-dialog__tip p {
  margin: 0;
}

.user-freeze-dialog__tip p {
  color: var(--app-text-secondary);
  line-height: 1.7;
}

.user-freeze-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.user-freeze-dialog__error {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--app-tone-danger-text);
}
</style>
