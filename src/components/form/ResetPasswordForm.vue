<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

import { useAuthStore } from '@/stores/modules/auth'
import { isValidPassword } from '@/utils/validate'

interface ResetPasswordFormErrors {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

interface ResetPasswordFormState {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

/**
 * 当前登录用户修改密码表单。
 * 该组件只负责旧密码校验、新密码复杂度校验与提交认证 Store，方便在个人中心弹窗等已登录场景复用。
 */
const emit = defineEmits<{
  success: []
  cancel: []
}>()

const authStore = useAuthStore()
const submitting = ref(false)

const form = reactive<ResetPasswordFormState>({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const errors = reactive<ResetPasswordFormErrors>({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const submitButtonLoading = computed(() => authStore.loading || submitting.value)

/**
 * 重置密码弹窗可能被父层通过右上角、遮罩或 Esc 关闭。
 * 因此需要向父组件暴露统一重置能力，确保任何关闭路径都不会遗留旧密码、确认密码和校验提示。
 */
function resetForm() {
  form.oldPassword = ''
  form.newPassword = ''
  form.confirmPassword = ''
  errors.oldPassword = ''
  errors.newPassword = ''
  errors.confirmPassword = ''
}

function validateForm() {
  errors.oldPassword = form.oldPassword.trim() ? '' : '请输入旧密码'
  errors.newPassword = isValidPassword(form.newPassword)
    ? ''
    : '密码至少 8 位且需同时包含字母和数字'
  errors.confirmPassword =
    form.confirmPassword && form.confirmPassword === form.newPassword
      ? ''
      : '两次输入的新密码不一致'

  return Object.values(errors).every((value) => !value)
}

/**
 * 修改密码成功后清空本地表单。
 * 个人中心弹窗复用时需要回到干净状态，避免再次打开时泄露上一次输入的旧密码与新密码。
 */
async function handleSubmit() {
  if (submitButtonLoading.value || !validateForm()) {
    return
  }

  submitting.value = true

  try {
    await authStore.changePassword({
      oldPassword: form.oldPassword,
      newPassword: form.newPassword,
    })
    resetForm()
    emit('success')
  } finally {
    submitting.value = false
  }
}

function handleCancel() {
  resetForm()
  emit('cancel')
}

defineExpose({
  resetForm,
})
</script>

<template>
  <form class="reset-password-form" @submit.prevent="handleSubmit">
    <label class="reset-password-form__field">
      <span class="reset-password-form__label">旧密码</span>
      <el-input
        v-model="form.oldPassword"
        name="oldPassword"
        type="password"
        placeholder="请输入当前登录密码"
        autocomplete="current-password"
        show-password
      />
      <p v-if="errors.oldPassword" class="reset-password-form__error">{{ errors.oldPassword }}</p>
    </label>

    <label class="reset-password-form__field">
      <span class="reset-password-form__label">新密码</span>
      <el-input
        v-model="form.newPassword"
        name="newPassword"
        type="password"
        placeholder="至少 8 位，包含字母和数字"
        autocomplete="new-password"
        show-password
      />
      <p v-if="errors.newPassword" class="reset-password-form__error">{{ errors.newPassword }}</p>
    </label>

    <label class="reset-password-form__field">
      <span class="reset-password-form__label">确认新密码</span>
      <el-input
        v-model="form.confirmPassword"
        name="confirmPassword"
        type="password"
        placeholder="请再次输入新密码"
        autocomplete="new-password"
        show-password
      />
      <p v-if="errors.confirmPassword" class="reset-password-form__error">
        {{ errors.confirmPassword }}
      </p>
    </label>

    <div class="reset-password-form__actions">
      <el-button type="default" @click="handleCancel">取消</el-button>
      <el-button
        type="primary"
        native-type="submit"
        :disabled="submitButtonLoading"
        :loading="submitButtonLoading"
      >
        确认修改密码
      </el-button>
    </div>
  </form>
</template>

<style scoped lang="scss">
.reset-password-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.reset-password-form__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reset-password-form__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text-primary);
}

.reset-password-form__error {
  margin: 0;
  font-size: 13px;
  color: #dc2626;
}

.reset-password-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
