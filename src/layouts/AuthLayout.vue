<script setup lang="ts">
import { Bell, Connection, Monitor } from '@element-plus/icons-vue'
import { computed, type Component } from 'vue'
import { useRoute } from 'vue-router'

import { useAppStore } from '@/stores/modules/app'

/**
 * 认证左栏能力项。
 * 每项都绑定图标与语气色，确保登录、注册、找回密码在共享母版中仍能表达不同的公开页意图。
 */
interface AuthFeatureItem {
  title: string
  description: string
  icon: Component
  tone: 'blue' | 'teal' | 'amber'
}

/**
 * 认证布局认可的公开路由名。
 * 用联合类型收紧登录、注册、找回密码与重置密码 4 个入口，避免映射表被任意字符串放大为弱类型字典。
 */
type AuthRouteName = 'Login' | 'Register' | 'ForgotPassword' | 'ResetPassword'

/**
 * 认证布局左栏内容。
 * 统一收口到路由名映射，避免后续登录、注册、找回密码页面各自重复维护首屏说明。
 */
interface AuthHeroContent {
  eyebrow: string
  title: string
  /** 部分公开入口只需要标题与能力点，不强制每个路由都保留大段说明。 */
  description?: string
  note?: string
  features: AuthFeatureItem[]
}

/**
 * 认证布局。
 * 该母版按公开路由切换左栏说明，同时保持右侧只承载表单本体，方便后续认证页继续复用双栏画布。
 */
const route = useRoute()
const appStore = useAppStore()
const AUTH_ROUTE_NAMES = ['Login', 'Register', 'ForgotPassword', 'ResetPassword'] as const
const DEFAULT_AUTH_ROUTE_NAME: AuthRouteName = 'Login'

/**
 * 认证母版只认固定 4 个公开路由名。
 * 运行时若遇到测试桩、异常跳转或未来未接入的新路由名，统一回退到登录文案，避免左栏出现空白。
 */
function isAuthRouteName(routeName: unknown): routeName is AuthRouteName {
  return typeof routeName === 'string' && AUTH_ROUTE_NAMES.includes(routeName as AuthRouteName)
}

/**
 * 公开认证页统一使用共享母版，但不同路由要强调不同任务：登录看当前系统能力，注册与找回密码看账号接入和恢复流程。
 */
const authHeroMap = {
  Login: {
    eyebrow: '',
    title: '智能设备管理系统',
    features: [
      {
        title: '设备信息集中查看',
        description: '统一浏览设备状态、分类与可用情况，减少跨页确认成本。',
        icon: Monitor,
        tone: 'blue',
      },
      {
        title: '预约与借还链路衔接',
        description: '从申请、签到到借还记录都沿用同一条操作路径，便于快速接续当前流程。',
        icon: Connection,
        tone: 'teal',
      },
      {
        title: '通知与状态同步',
        description: '审批结果、借还变更和提醒消息集中汇总，进入系统后即可继续处理。',
        icon: Bell,
        tone: 'amber',
      },
    ],
  },
  Register: {
    eyebrow: '',
    title: '创建系统账号',
    features: [
      {
        title: '设备权限统一接入',
        description: '新账号创建后直接进入公开能力入口，避免重复登录和额外初始化步骤。',
        icon: Monitor,
        tone: 'blue',
      },
      {
        title: '预约链路连续记录',
        description: '后续预约、签到与借还操作会持续关联当前账号，便于追踪个人使用记录。',
        icon: Connection,
        tone: 'teal',
      },
      {
        title: '提醒消息统一归档',
        description: '审核进度、逾期提醒和系统通知都会同步到同一通知中心。',
        icon: Bell,
        tone: 'amber',
      },
    ],
  },
  ForgotPassword: {
    eyebrow: '',
    title: '重置登录密码',
    features: [
      {
        title: '保留原有设备视角',
        description: '恢复访问后仍从同一账号查看自己的设备记录与使用上下文。',
        icon: Monitor,
        tone: 'blue',
      },
      {
        title: '找回流程清晰可追踪',
        description: '验证码与重置操作分步完成，避免在公开页一次承载过多动作。',
        icon: Connection,
        tone: 'teal',
      },
      {
        title: '重要提醒不易错过',
        description: '恢复访问后可继续查看审批与借还相关提醒，减少状态断层。',
        icon: Bell,
        tone: 'amber',
      },
    ],
  },
  ResetPassword: {
    eyebrow: '',
    title: '重新设置登录密码',
    description: '拿到验证码后即可在当前页完成密码更新，再回到登录页继续处理设备相关工作。',
    note: '重置密码不会自动登录，所以左栏强调“完成凭据修复后继续回到系统”，保持公开流程预期一致。',
    features: [
      {
        title: '账号上下文继续沿用',
        description: '密码更新只影响登录凭据，不会打散原有设备、预约和通知记录。',
        icon: Monitor,
        tone: 'blue',
      },
      {
        title: '公开流程单点收束',
        description: '验证码核验与新密码设置集中在同一视图，减少来回跳转带来的中断感。',
        icon: Connection,
        tone: 'teal',
      },
      {
        title: '后续提醒继续同步',
        description: '重新登录后即可恢复查看审批、借还与通知中心中的最新状态。',
        icon: Bell,
        tone: 'amber',
      },
    ],
  },
} satisfies Record<AuthRouteName, AuthHeroContent>

const currentRouteName = computed<AuthRouteName>(() =>
  isAuthRouteName(route.name) ? route.name : DEFAULT_AUTH_ROUTE_NAME,
)

const heroContent = computed<AuthHeroContent>(() => authHeroMap[currentRouteName.value])
</script>

<template>
  <main class="auth-layout auth-layout--compact" :data-resolved-theme="appStore.resolvedTheme">
    <section class="auth-layout__shell">
      <section class="auth-layout__hero-panel">
        <p v-if="heroContent.eyebrow" class="auth-layout__eyebrow">{{ heroContent.eyebrow }}</p>
        <h1 class="auth-layout__title auth-layout__title--single-line">{{ heroContent.title }}</h1>
        <p v-if="heroContent.description" class="auth-layout__description">
          {{ heroContent.description }}
        </p>
        <p v-if="heroContent.note" class="auth-layout__note">{{ heroContent.note }}</p>

        <ul class="auth-layout__feature-list">
          <li
            v-for="feature in heroContent.features"
            :key="feature.title"
            class="auth-layout__feature-item"
          >
            <span
              class="auth-layout__feature-icon"
              :class="`auth-layout__feature-icon--${feature.tone}`"
            >
              <component :is="feature.icon" />
            </span>

            <div class="auth-layout__feature-copy">
              <strong>{{ feature.title }}</strong>
              <span>{{ feature.description }}</span>
            </div>
          </li>
        </ul>
      </section>

      <div class="auth-layout__content-panel">
        <div class="auth-layout__content-inner">
          <slot />
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped lang="scss">
@use '@/assets/styles/console-shell' as shell;

.auth-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 20px;
  background:
    radial-gradient(circle at top left, var(--app-page-accent-strong), transparent 30%),
    radial-gradient(circle at right bottom, var(--app-page-accent), transparent 36%),
    linear-gradient(135deg, var(--app-page-bg) 0%, var(--app-page-bg-elevated) 100%);
}

.auth-layout__shell {
  @include shell.console-surface();

  display: grid;
  grid-template-columns: minmax(300px, 1.08fr) minmax(320px, 0.92fr);
  width: min(1040px, 100%);
  min-height: min(640px, calc(100vh - 40px));
  min-height: min(640px, calc(100dvh - 40px));
  border-radius: 32px;
  overflow: hidden;
}

.auth-layout__hero-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 14px;
  padding: 40px 42px 36px;
  background:
    linear-gradient(180deg, var(--app-surface-glass-strong), transparent),
    linear-gradient(135deg, var(--app-surface-glass), transparent);
}

.auth-layout__hero-panel::after {
  content: '';
  position: absolute;
  inset: 28px 24px auto auto;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--app-tone-brand-surface-strong), transparent 68%);
  pointer-events: none;
}

.auth-layout__eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--app-accent-amber);
}

.auth-layout__title {
  position: relative;
  margin: 0;
  max-width: 12ch;
  font-family: var(--app-font-family-display);
  font-size: clamp(30px, 3.3vw, 40px);
  line-height: 1.08;
  color: var(--app-text-primary);
  z-index: 1;
}

.auth-layout__title--single-line {
  max-width: none;
  white-space: nowrap;
}

.auth-layout__description,
.auth-layout__note {
  position: relative;
  margin: 0;
  max-width: 520px;
  font-size: 14px;
  line-height: 1.65;
  color: var(--app-text-secondary);
  z-index: 1;
}

.auth-layout__note {
  padding-top: 12px;
  border-top: 1px solid var(--app-border-strong);
  color: var(--app-text-secondary);
}

.auth-layout__feature-list {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 8px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.auth-layout__feature-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 12px 0;
  border-top: 1px solid var(--app-border-soft);
}

.auth-layout__feature-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid transparent;
}

.auth-layout__feature-icon :deep(svg) {
  width: 18px;
  height: 18px;
}

.auth-layout__feature-icon--blue {
  color: var(--app-accent-blue);
  background: var(--app-tone-brand-surface);
  border-color: var(--app-tone-brand-border);
}

.auth-layout__feature-icon--teal {
  color: var(--app-accent-teal);
  background: var(--app-tone-success-surface);
  border-color: var(--app-tone-success-border);
}

.auth-layout__feature-icon--amber {
  color: var(--app-accent-amber);
  background: var(--app-tone-warning-surface);
  border-color: var(--app-tone-warning-border);
}

.auth-layout__feature-copy {
  display: grid;
  gap: 4px;
}

.auth-layout__feature-copy strong {
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text-primary);
}

.auth-layout__feature-copy span {
  font-size: 13px;
  line-height: 1.55;
  color: var(--app-text-secondary);
}

.auth-layout__content-panel {
  display: flex;
  align-items: center;
  padding: 36px 42px;
  border-left: 1px solid var(--app-border-soft);
  background:
    linear-gradient(180deg, var(--app-surface-overlay), var(--app-surface-glass)),
    var(--app-surface-card);
}

.auth-layout__content-inner {
  width: 100%;
}

@media (max-width: 960px) {
  .auth-layout {
    padding: 18px;
  }

  .auth-layout__shell {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .auth-layout__hero-panel,
  .auth-layout__content-panel {
    padding: 28px 24px;
  }

  .auth-layout__content-panel {
    border-left: 0;
    border-top: 1px solid var(--app-border-soft);
  }

  .auth-layout__title--single-line {
    font-size: clamp(28px, 5vw, 36px);
  }
}

@media (max-width: 640px) {
  .auth-layout {
    padding: 14px;
  }

  .auth-layout__hero-panel,
  .auth-layout__content-panel {
    padding: 24px 20px;
  }

  .auth-layout__title--single-line {
    font-size: clamp(24px, 6.6vw, 30px);
  }
}

@media (max-height: 820px) {
  .auth-layout--compact {
    padding: 14px;
  }

  .auth-layout__shell {
    min-height: min(580px, calc(100vh - 28px));
    min-height: min(580px, calc(100dvh - 28px));
  }

  .auth-layout__hero-panel,
  .auth-layout__content-panel {
    padding: 28px 32px;
  }

  .auth-layout__title--single-line {
    font-size: clamp(24px, 2.6vw, 32px);
  }

  .auth-layout__feature-list {
    gap: 6px;
  }

  .auth-layout__feature-item {
    padding: 10px 0;
  }
}
</style>
