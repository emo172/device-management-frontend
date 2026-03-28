<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/modules/auth'
import { isEmail, isValidPassword } from '@/utils/validate'

/**
 * 密码重置面板入参。
 * 这四个文案字段由 `ForgotPassword.vue` / `ResetPassword.vue` 两个公开路由按各自进入场景传入，
 * 用于在复用同一套表单逻辑时保留独立页面的标题、说明和辅助引导语义。
 */
interface PasswordResetPanelProps {
  /** 页面眉标，说明当前是忘记密码入口还是独立重置密码入口。 */
  eyebrow: string
  /** 页面主标题，突出当前路由要完成的核心动作。 */
  title: string
  /** 主说明文案，解释本页为何需要邮箱验证码与新密码。 */
  description: string
  /** 底部辅助提示，承接验证码、重新登录等补充业务说明。 */
  helperText: string
}

interface PasswordResetFormState {
  email: string
  verificationCode: string
  password: string
  confirmPassword: string
}

interface PasswordResetFormErrors {
  email: string
  verificationCode: string
  password: string
  confirmPassword: string
}

const props = defineProps<PasswordResetPanelProps>()

/**
 * 密码重置表单。
 * 忘记密码页与重置密码页虽然来自不同公开入口，但两条链路最终都要完成邮箱校验、验证码冷却和重置成功后返回登录，
 * 因此继续共用同一套表单与交互契约，避免两个公开页面在校验口径或提交结果上出现分叉。
 */
const authStore = useAuthStore()
const router = useRouter()

const form = reactive<PasswordResetFormState>({
  email: '',
  verificationCode: '',
  password: '',
  confirmPassword: '',
})

const errors = reactive<PasswordResetFormErrors>({
  email: '',
  verificationCode: '',
  password: '',
  confirmPassword: '',
})

const sendingCode = ref(false)
const submitting = ref(false)
const countdown = ref(0)

let countdownTimer: number | null = null

const sendCodeLabel = computed(() => {
  if (countdown.value <= 0) {
    return '发送验证码'
  }

  return `${countdown.value} 秒后重试`
})

function clearCountdownTimer() {
  if (countdownTimer !== null) {
    window.clearInterval(countdownTimer)
    countdownTimer = null
  }
}

/**
 * 验证码发送成功后立即启动 60 秒冷却。
 * 这样可以在前端侧抑制重复点击，减少短时间内对同一邮箱连续发送验证码的无效请求。
 */
function startCountdown() {
  clearCountdownTimer()
  countdown.value = 60

  countdownTimer = window.setInterval(() => {
    countdown.value -= 1

    if (countdown.value <= 0) {
      countdown.value = 0
      clearCountdownTimer()
    }
  }, 1000)
}

function validateEmailField() {
  errors.email = isEmail(form.email.trim()) ? '' : '请输入合法的邮箱地址'
  return !errors.email
}

function validateSubmitForm() {
  validateEmailField()
  errors.verificationCode = form.verificationCode.trim() ? '' : '请输入验证码'
  errors.password = isValidPassword(form.password) ? '' : '密码至少 8 位且需同时包含字母和数字'
  errors.confirmPassword =
    form.confirmPassword && form.confirmPassword === form.password ? '' : '两次输入的密码不一致'

  return Object.values(errors).every((value) => !value)
}

async function handleSendCode() {
  if (countdown.value > 0 || sendingCode.value || !validateEmailField()) {
    return
  }

  sendingCode.value = true

  try {
    await authStore.sendVerificationCode({ email: form.email.trim() })
    startCountdown()
  } finally {
    sendingCode.value = false
  }
}

/**
 * 重置密码成功后统一返回登录页。
 * 后端当前不会在重置密码后直接签发新令牌，因此页面需要明确引导用户重新登录获取新会话。
 */
async function handleSubmit() {
  if (submitting.value || !validateSubmitForm()) {
    return
  }

  submitting.value = true

  try {
    await authStore.resetPassword({
      email: form.email.trim(),
      verificationCode: form.verificationCode.trim(),
      newPassword: form.password,
    })

    await router.push('/login')
  } finally {
    submitting.value = false
  }
}

onBeforeUnmount(() => {
  clearCountdownTimer()
})
</script>

<template>
  <section class="auth-panel auth-panel__surface">
    <div class="auth-panel__intro">
      <p class="auth-panel__eyebrow">{{ props.eyebrow }}</p>
      <h1 class="auth-panel__title">{{ props.title }}</h1>
      <p class="auth-panel__description">{{ props.description }}</p>
    </div>

    <form class="auth-form" @submit.prevent="handleSubmit">
      <label class="auth-form__field">
        <span class="auth-form__label">邮箱</span>
        <el-input
          v-model.trim="form.email"
          name="email"
          placeholder="请输入注册邮箱"
          autocomplete="email"
          size="large"
        />
        <p v-if="errors.email" class="auth-form__error">{{ errors.email }}</p>
      </label>

      <div class="auth-form__inline">
        <label class="auth-form__field auth-form__field--grow">
          <span class="auth-form__label">验证码</span>
          <el-input
            v-model.trim="form.verificationCode"
            name="verificationCode"
            placeholder="请输入验证码"
            size="large"
          />
          <p v-if="errors.verificationCode" class="auth-form__error">
            {{ errors.verificationCode }}
          </p>
        </label>

        <div class="auth-form__action">
          <span class="auth-form__label auth-form__label--ghost">操作</span>
          <el-button
            data-testid="send-code-button"
            type="default"
            size="large"
            :disabled="countdown > 0 || sendingCode"
            @click="handleSendCode"
          >
            {{ sendCodeLabel }}
          </el-button>
        </div>
      </div>

      <label class="auth-form__field">
        <span class="auth-form__label">新密码</span>
        <el-input
          v-model="form.password"
          name="password"
          type="password"
          placeholder="至少 8 位，包含字母和数字"
          autocomplete="new-password"
          show-password
          size="large"
        />
        <p v-if="errors.password" class="auth-form__error">{{ errors.password }}</p>
      </label>

      <label class="auth-form__field">
        <span class="auth-form__label">确认新密码</span>
        <el-input
          v-model="form.confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="请再次输入新密码"
          autocomplete="new-password"
          show-password
          size="large"
        />
        <p v-if="errors.confirmPassword" class="auth-form__error">{{ errors.confirmPassword }}</p>
      </label>

      <el-button
        class="auth-form__submit"
        type="primary"
        native-type="submit"
        :loading="submitting"
      >
        确认重置密码
      </el-button>
    </form>

    <div class="auth-panel__actions">
      <div class="auth-panel__helper-block">
        <p class="auth-panel__helper">{{ props.helperText }}</p>
      </div>

      <div class="auth-panel__footer auth-panel__footer--single">
        <RouterLink class="auth-panel__link" to="/login">返回登录</RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
@use '@/assets/styles/auth-pages' as authPages;

@include authPages.auth-panel-base;

.auth-panel__helper-block {
  padding-left: 12px;
  // 辅助提示边线改走全局弱边框 token，避免深色主题下继续保留浅色透明描边。
  border-left: 2px solid var(--app-border-soft);
}

.auth-panel__helper {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--app-text-secondary);
}

.auth-form__field--grow {
  flex: 1;
}

.auth-form__inline {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.auth-form__action {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 144px;
}

.auth-form__label--ghost {
  color: transparent;
}

.auth-panel__footer--single {
  align-items: center;
}

@media (max-width: 720px) {
  .auth-form__inline {
    flex-direction: column;
  }

  .auth-form__action {
    width: 100%;
  }

  .auth-form__label--ghost {
    display: none;
  }
}
</style>
