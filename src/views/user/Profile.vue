<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ResetPasswordForm from '@/components/form/ResetPasswordForm.vue'
import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleDetailLayout from '@/components/layout/ConsoleDetailLayout.vue'
import ConsoleFeedbackSurface from '@/components/layout/ConsoleFeedbackSurface.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import { UserRoleLabel } from '@/enums/UserRole'
import { useAuthStore } from '@/stores/modules/auth'
import { isPhone } from '@/utils/validate'

interface ProfileFormErrors {
  realName: string
  phone: string
}

interface ProfileFormState {
  realName: string
  phone: string
}

/**
 * 个人中心页。
 * 该页同时承接资料查看、可编辑资料维护与头部 `tab=password` 快捷跳转，避免用户从任意受保护页面进入后看到空白占位。
 */
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const submitting = ref(false)
const passwordDialogVisible = ref(false)
const passwordDialogClosing = ref(false)
const resetPasswordFormRef = ref<InstanceType<typeof ResetPasswordForm> | null>(null)

const profileForm = reactive<ProfileFormState>({
  realName: '',
  phone: '',
})

const errors = reactive<ProfileFormErrors>({
  realName: '',
  phone: '',
})

const currentUser = computed(() => authStore.currentUser)
const roleLabel = computed(() => {
  const role = currentUser.value?.role
  return role ? UserRoleLabel[role] : '-'
})
const saveButtonLoading = computed(() => authStore.loading || submitting.value)

watch(
  currentUser,
  (user) => {
    profileForm.realName = user?.realName ?? ''
    profileForm.phone = user?.phone ?? ''
  },
  { immediate: true },
)

watch(
  () => route.query.tab,
  (tab) => {
    /**
     * 头部菜单会跳到 `/profile?tab=password`。
     * 这里直接打开密码弹窗，确保快捷入口进入个人中心时立刻落到目标交互，而不是让用户再找一次按钮。
     */
    if (tab === 'password') {
      passwordDialogVisible.value = true
    }
  },
  { immediate: true },
)

function validateProfileForm() {
  errors.realName = profileForm.realName.trim() ? '' : '请输入姓名'

  const normalizedPhone = profileForm.phone.trim()
  errors.phone = !normalizedPhone || isPhone(normalizedPhone) ? '' : '请输入合法的手机号'

  return Object.values(errors).every((value) => !value)
}

/**
 * 资料更新严格遵循后端 `UpdateProfileRequest` 边界，只提交姓名与手机号。
 * 用户名和邮箱属于身份标识，不允许在个人中心本地随意修改，否则会与登录账号和后端认证口径冲突。
 */
async function handleSubmitProfile() {
  if (saveButtonLoading.value || !validateProfileForm()) {
    return
  }

  submitting.value = true

  try {
    await authStore.updateProfile({
      realName: profileForm.realName.trim(),
      phone: profileForm.phone.trim(),
    })
  } catch {
    // 请求层已经统一提示失败原因，这里只负责收口表单提交链路，避免出现未处理拒绝。
  } finally {
    submitting.value = false
  }
}

function handleOpenPasswordDialog() {
  passwordDialogVisible.value = true
}

async function clearPasswordTabQuery() {
  if (route.query.tab !== 'password') {
    return
  }

  const nextQuery = { ...route.query }
  delete nextQuery.tab
  await router.replace({ path: route.path, query: nextQuery })
}

/**
 * 密码弹窗的所有关闭路径都收敛到这里。
 * 这样无论来自取消按钮、右上角、遮罩点击、Esc 还是修改成功回调，都能同步清空 query 快捷入口并重置子表单状态。
 */
async function handleClosePasswordDialog() {
  /**
   * Element Plus 在同一次关闭里可能同时触发 `update:modelValue(false)` 与 `close`。
   * 这里用一次性关闭锁避免重复执行 `router.replace`，从而消除同一路径的重复跳转风险。
   */
  if (passwordDialogClosing.value) {
    return
  }

  passwordDialogClosing.value = true
  resetPasswordFormRef.value?.resetForm()
  passwordDialogVisible.value = false

  try {
    await clearPasswordTabQuery()
  } catch {
    // 路由替换失败时保持当前弹窗已关闭状态，避免关闭路径留下未处理拒绝。
  } finally {
    passwordDialogClosing.value = false
  }
}

function handlePasswordDialogVisibilityChange(visible: boolean) {
  if (visible) {
    passwordDialogVisible.value = true
    return
  }

  void handleClosePasswordDialog()
}
</script>

<template>
  <section class="profile-page">
    <ConsolePageHero
      eyebrow="User / Profile"
      title="个人中心"
      description="统一查看当前账号身份信息，并在不触碰登录标识的前提下维护姓名、手机号与密码。"
      class="profile-page__hero"
    >
      <template #actions>
        <el-button type="primary" @click="handleOpenPasswordDialog">修改密码</el-button>
      </template>
    </ConsolePageHero>

    <ConsoleDetailLayout class="profile-page__layout">
      <template #main>
        <el-card class="profile-card" shadow="never">
          <div class="profile-card__header">
            <div>
              <p class="profile-card__eyebrow">资料编辑</p>
              <h2 class="profile-card__title">维护可编辑资料</h2>
            </div>
          </div>

          <form
            data-testid="profile-form"
            class="profile-form"
            @submit.prevent="handleSubmitProfile"
          >
            <!-- 用户名与邮箱属于登录身份标识，当前后端仅开放展示，不允许在个人中心直接改写。 -->
            <label class="profile-form__field">
              <span class="profile-form__label">用户名</span>
              <el-input :model-value="currentUser?.username || ''" name="username" disabled />
              <p class="profile-form__hint">用户名由认证体系维护，个人中心仅展示不可修改。</p>
            </label>

            <label class="profile-form__field">
              <span class="profile-form__label">邮箱</span>
              <el-input :model-value="currentUser?.email || ''" name="email" disabled />
              <p class="profile-form__hint">邮箱作为登录与找回密码依据，当前页面不开放编辑。</p>
            </label>

            <label class="profile-form__field">
              <span class="profile-form__label">姓名</span>
              <el-input v-model="profileForm.realName" name="realName" placeholder="请输入姓名" />
              <p v-if="errors.realName" class="profile-form__error">{{ errors.realName }}</p>
            </label>

            <label class="profile-form__field">
              <span class="profile-form__label">手机号</span>
              <el-input v-model="profileForm.phone" name="phone" placeholder="请输入手机号" />
              <p v-if="errors.phone" class="profile-form__error">{{ errors.phone }}</p>
            </label>

            <div class="profile-form__actions">
              <el-button
                type="primary"
                native-type="submit"
                :disabled="saveButtonLoading"
                :loading="saveButtonLoading"
              >
                保存资料
              </el-button>
            </div>
          </form>
        </el-card>
      </template>

      <template #aside>
        <ConsoleAsidePanel
          title="账户概览"
          description="用户名与邮箱是认证标识，只展示不编辑；系统会把角色信息与密码快捷入口统一收口在这个侧栏。"
        >
          <div class="profile-page__aside-head">
            <div>
              <p class="profile-page__aside-user">{{ currentUser?.username || '-' }}</p>
              <p class="profile-page__aside-email">{{ currentUser?.email || '-' }}</p>
            </div>
            <el-tag type="info">{{ roleLabel }}</el-tag>
          </div>

          <dl class="profile-meta">
            <div class="profile-meta__item">
              <dt>姓名</dt>
              <dd>{{ currentUser?.realName || '-' }}</dd>
            </div>
            <div class="profile-meta__item">
              <dt>手机号</dt>
              <dd>{{ currentUser?.phone || '-' }}</dd>
            </div>
            <div class="profile-meta__item">
              <dt>角色</dt>
              <dd>{{ roleLabel }}</dd>
            </div>
          </dl>

          <ConsoleFeedbackSurface state="confirm" class="profile-page__security-tip">
            <strong>安全提醒</strong>
            <p>
              头部快捷入口会直接打开密码弹窗；关闭弹窗时会同步清理 `tab=password`
              查询参数，避免刷新后重复弹出。
            </p>
          </ConsoleFeedbackSurface>
        </ConsoleAsidePanel>
      </template>
    </ConsoleDetailLayout>

    <el-dialog
      :model-value="passwordDialogVisible"
      width="520px"
      title="修改密码"
      @update:model-value="handlePasswordDialogVisibilityChange"
      @close="handleClosePasswordDialog"
    >
      <ResetPasswordForm
        ref="resetPasswordFormRef"
        @cancel="handleClosePasswordDialog"
        @success="handleClosePasswordDialog"
      />
    </el-dialog>
  </section>
</template>

<style scoped lang="scss">
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-page__hero {
  background:
    radial-gradient(circle at top right, var(--app-tone-success-surface-strong), transparent 32%),
    linear-gradient(135deg, var(--app-surface-card-strong), var(--app-tone-success-surface));
}

.profile-card {
  border: 1px solid var(--app-border-soft);
  border-radius: 28px;
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-card);
}

.profile-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.profile-card__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--app-tone-success-text);
}

.profile-card__title {
  margin: 0;
  color: var(--app-text-primary);
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.profile-form__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profile-form__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text-primary);
}

.profile-form__hint,
.profile-form__error {
  margin: 0;
  font-size: 13px;
}

.profile-form__hint {
  color: var(--app-text-secondary);
}

.profile-form__error {
  color: var(--app-tone-danger-text);
}

.profile-form__actions {
  display: flex;
  justify-content: flex-end;
}

.profile-page__aside-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.profile-page__aside-user,
.profile-page__aside-email {
  margin: 0;
}

.profile-page__aside-user {
  font-size: 18px;
  font-weight: 700;
  color: var(--app-text-primary);
}

.profile-page__aside-email {
  margin-top: 6px;
  color: var(--app-text-secondary);
}

.profile-meta {
  display: grid;
  gap: 14px;
  margin: 0;
}

.profile-meta__item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 18px;
  border-radius: 18px;
  background: linear-gradient(
    135deg,
    var(--app-surface-card-strong),
    var(--app-tone-brand-surface)
  );
}

.profile-meta__item dt {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-secondary);
}

.profile-meta__item dd {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--app-text-primary);
}

.profile-page__security-tip {
  min-height: 0;
  align-items: flex-start;
  padding: 18px 20px;
  text-align: left;
}

.profile-page__security-tip strong,
.profile-page__security-tip p {
  margin: 0;
}

.profile-page__security-tip p {
  color: var(--app-text-secondary);
  line-height: 1.7;
}
</style>
