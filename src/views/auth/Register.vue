<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/modules/auth'
import { isEmail, isPhone, isValidPassword } from '@/utils/validate'

interface RegisterFormState {
  username: string
  email: string
  password: string
  confirmPassword: string
  realName: string
  phone: string
}

interface RegisterFormErrors {
  username: string
  email: string
  password: string
  confirmPassword: string
  realName: string
  phone: string
}

/**
 * 注册页。
 * 注册成功后后端会直接返回令牌，因此这里不再要求用户二次登录，而是直接进入已登录态并跳转仪表盘。
 */
const authStore = useAuthStore()
const router = useRouter()
const submitting = ref(false)

const submitButtonLoading = computed(() => authStore.loading || submitting.value)

const form = reactive<RegisterFormState>({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  realName: '',
  phone: '',
})

const errors = reactive<RegisterFormErrors>({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  realName: '',
  phone: '',
})

/**
 * 注册规则需要同时覆盖后端基础约束与页面交互提示。
 * 手机号按需求允许留空，但一旦填写就必须符合大陆手机号格式，避免把明显错误的数据提前提交给后端。
 */
function validateForm() {
  errors.username = form.username.trim() ? '' : '请输入用户名'
  errors.email = isEmail(form.email.trim()) ? '' : '请输入合法的邮箱地址'
  errors.password = isValidPassword(form.password) ? '' : '密码至少 8 位且需同时包含字母和数字'
  errors.confirmPassword =
    form.confirmPassword && form.confirmPassword === form.password ? '' : '两次输入的密码不一致'
  errors.realName = form.realName.trim() ? '' : '请输入姓名'
  errors.phone = !form.phone.trim() || isPhone(form.phone.trim()) ? '' : '请输入合法的手机号'

  return Object.values(errors).every((value) => !value)
}

async function handleSubmit() {
  if (submitButtonLoading.value || !validateForm()) {
    return
  }

  submitting.value = true

  try {
    await authStore.register({
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      realName: form.realName.trim(),
      phone: form.phone.trim(),
    })

    await router.push('/dashboard')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="auth-panel auth-panel__surface">
    <div class="auth-panel__intro">
      <p class="auth-panel__eyebrow">Auth / Register</p>
      <h1 class="auth-panel__title">注册系统账号</h1>
      <p class="auth-panel__description">
        填写基础资料后即可完成注册，进入系统继续进行设备预约与个人操作。
      </p>
    </div>

    <form class="auth-form" @submit.prevent="handleSubmit">
      <div class="auth-form__grid">
        <label class="auth-form__field">
          <span class="auth-form__label">用户名</span>
          <el-input
            v-model.trim="form.username"
            name="username"
            placeholder="请输入用户名"
            size="large"
          />
          <p v-if="errors.username" class="auth-form__error">{{ errors.username }}</p>
        </label>

        <label class="auth-form__field">
          <span class="auth-form__label">邮箱</span>
          <el-input v-model.trim="form.email" name="email" placeholder="请输入邮箱" size="large" />
          <p v-if="errors.email" class="auth-form__error">{{ errors.email }}</p>
        </label>

        <label class="auth-form__field">
          <span class="auth-form__label">密码</span>
          <el-input
            v-model="form.password"
            name="password"
            type="password"
            placeholder="至少 8 位，包含字母和数字"
            show-password
            size="large"
          />
          <p v-if="errors.password" class="auth-form__error">{{ errors.password }}</p>
        </label>

        <label class="auth-form__field">
          <span class="auth-form__label">确认密码</span>
          <el-input
            v-model="form.confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            show-password
            size="large"
          />
          <p v-if="errors.confirmPassword" class="auth-form__error">{{ errors.confirmPassword }}</p>
        </label>

        <label class="auth-form__field">
          <span class="auth-form__label">姓名</span>
          <el-input
            v-model.trim="form.realName"
            name="realName"
            placeholder="请输入姓名"
            size="large"
          />
          <p v-if="errors.realName" class="auth-form__error">{{ errors.realName }}</p>
        </label>

        <label class="auth-form__field">
          <span class="auth-form__label">手机号（可选）</span>
          <el-input
            v-model.trim="form.phone"
            name="phone"
            placeholder="请输入手机号"
            size="large"
          />
          <p v-if="errors.phone" class="auth-form__error">{{ errors.phone }}</p>
        </label>
      </div>

      <el-button
        class="auth-form__submit"
        type="primary"
        native-type="submit"
        size="large"
        :disabled="submitButtonLoading"
        :loading="submitButtonLoading"
      >
        注册并进入系统
      </el-button>
    </form>

    <div class="auth-panel__actions">
      <div class="auth-panel__footer">
        <RouterLink class="auth-panel__link" to="/login">已有账号？去登录</RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
@use '@/assets/styles/auth-pages' as authPages;

@include authPages.auth-panel-base;

// 注册页字段更多，右栏适度放宽后才能在桌面端保留双列表单节奏，而不会把每个输入框压缩得过窄。
.auth-panel__surface {
  max-width: 480px;
}

.auth-form {
  gap: 16px;
}

.auth-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 12px;
}

.auth-panel__footer {
  justify-content: flex-start;
}

@media (max-width: 720px) {
  // 视口收窄时主动退回单列，避免双列字段在认证母版右栏里形成过密的竖向噪音。
  .auth-form__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-height: 820px) {
  .auth-panel__surface {
    max-width: 460px;
  }

  .auth-form {
    gap: 14px;
  }

  .auth-form__grid {
    gap: 12px 10px;
  }
}
</style>
