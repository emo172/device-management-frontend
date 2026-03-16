<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/modules/auth'

interface LoginFormState {
  account: string
  password: string
}

interface LoginFormErrors {
  account: string
  password: string
}

/**
 * 登录页。
 * 该页负责承接会话失效后的回跳链路：登录成功后优先返回守卫附带的 `redirect`，否则回到仪表盘。
 */
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const submitting = ref(false)

const submitButtonLoading = computed(() => authStore.loading || submitting.value)

const form = reactive<LoginFormState>({
  account: '',
  password: '',
})

const errors = reactive<LoginFormErrors>({
  account: '',
  password: '',
})

function validateForm() {
  errors.account = form.account.trim() ? '' : '请输入账号'
  // 密码必填同样需要过滤纯空白输入，避免把看似已填写但实际无效的值提交给登录接口。
  errors.password = form.password.trim() ? '' : '请输入密码'

  return !errors.account && !errors.password
}

function resolveRedirectTarget() {
  const redirect = route.query.redirect

  if (typeof redirect === 'string' && redirect.trim()) {
    return redirect
  }

  return '/dashboard'
}

/**
 * 登录提交先校验必填，再触发认证 Store。
 * 跳转目标统一从路由守卫传入的 redirect 读取，避免公开页与守卫各自维护不同的回跳规则。
 */
async function handleSubmit() {
  if (submitButtonLoading.value || !validateForm()) {
    return
  }

  submitting.value = true

  try {
    await authStore.login({
      account: form.account.trim(),
      password: form.password,
    })

    await router.push(resolveRedirectTarget())
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="auth-panel">
    <div class="auth-panel__intro">
      <p class="auth-panel__eyebrow">Auth / Login</p>
      <h1 class="auth-panel__title">欢迎回来</h1>
      <p class="auth-panel__description">
        使用账号或邮箱登录系统，登录后会继续返回你刚才想访问的页面。
      </p>
    </div>

    <form class="auth-form" @submit.prevent="handleSubmit">
      <label class="auth-form__field">
        <span class="auth-form__label">账号</span>
        <el-input
          v-model.trim="form.account"
          name="account"
          placeholder="请输入用户名或邮箱"
          autocomplete="username"
          size="large"
        />
        <p v-if="errors.account" class="auth-form__error">{{ errors.account }}</p>
      </label>

      <label class="auth-form__field">
        <span class="auth-form__label">密码</span>
        <el-input
          v-model="form.password"
          name="password"
          type="password"
          placeholder="请输入密码"
          autocomplete="current-password"
          show-password
          size="large"
        />
        <p v-if="errors.password" class="auth-form__error">{{ errors.password }}</p>
      </label>

      <el-button
        class="auth-form__submit"
        type="primary"
        native-type="submit"
        size="large"
        :disabled="submitButtonLoading"
        :loading="submitButtonLoading"
      >
        登录
      </el-button>
    </form>

    <div class="auth-panel__footer auth-panel__footer--split">
      <RouterLink class="auth-panel__link" to="/register">没有账号？去注册</RouterLink>
      <RouterLink class="auth-panel__link" to="/forgot-password">忘记密码？</RouterLink>
    </div>
  </section>
</template>

<style scoped lang="scss">
@use '@/assets/styles/auth-pages' as authPages;

@include authPages.auth-panel-base;

.auth-panel__footer {
  align-items: center;
}

.auth-panel__footer--split {
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.auth-panel__link {
  font-size: 14px;
  font-weight: 600;
  color: #0f766e;
  text-decoration: none;
}

.auth-panel__link:hover {
  color: #115e59;
}

@media (max-width: 640px) {
  .auth-panel__footer--split {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
