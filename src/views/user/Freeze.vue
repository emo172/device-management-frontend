<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, reactive, ref, watch } from 'vue'

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

const isUnfreeze = computed(() => formState.freezeStatus === FreezeStatus.NORMAL)
const requiresReason = computed(() => formState.freezeStatus !== FreezeStatus.NORMAL)
const dialogTitle = computed(() => {
  if (formState.freezeStatus === FreezeStatus.NORMAL) {
    return '解冻账号'
  }

  if (formState.freezeStatus === FreezeStatus.RESTRICTED) {
    return '限制账号'
  }

  return '冻结账号'
})

watch(
  () => [props.modelValue, props.user] as const,
  ([visible, user]) => {
    if (!visible || !user) {
      return
    }

    /**
     * 列表页的入口文案分为“冻结账号”和“解冻账号”。
     * 因此普通用户从“冻结账号”入口进入时，默认目标状态必须是 `FROZEN`，避免管理员什么都不改就误发恢复请求。
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
  if (!props.user || !validateForm()) {
    if (!props.user) {
      return
    }

    ElMessage.warning(reasonError.value)
    return
  }

  await userStore.freezeUser(props.user.id, {
    freezeStatus: formState.freezeStatus,
    reason: formState.reason.trim() || undefined,
  })

  ElMessage.success(`${dialogTitle.value}成功`)
  emit('success')
  handleClose()
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="460px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form label-position="top">
      <el-form-item label="目标状态">
        <el-select v-model="formState.freezeStatus" class="user-freeze-dialog__field">
          <el-option :label="FreezeStatusLabel[FreezeStatus.NORMAL]" :value="FreezeStatus.NORMAL" />
          <el-option
            :label="FreezeStatusLabel[FreezeStatus.RESTRICTED]"
            :value="FreezeStatus.RESTRICTED"
          />
          <el-option :label="FreezeStatusLabel[FreezeStatus.FROZEN]" :value="FreezeStatus.FROZEN" />
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

    <template #footer>
      <div class="user-freeze-dialog__footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.user-freeze-dialog__field {
  width: 100%;
}

.user-freeze-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.user-freeze-dialog__error {
  margin: 8px 0 0;
  font-size: 13px;
  color: #dc2626;
}
</style>
