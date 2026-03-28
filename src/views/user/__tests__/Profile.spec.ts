import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { defineComponent, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserRole } from '@/enums/UserRole'

const updateProfileMock = vi.fn()
const changePasswordMock = vi.fn()
const replaceMock = vi.fn()

const routeState = reactive({
  path: '/profile',
  query: {} as Record<string, unknown>,
})

const authStoreState = reactive({
  currentUser: {
    userId: 'user-1',
    username: 'demo-user',
    email: 'demo@example.com',
    realName: '演示用户',
    phone: '13800138000',
    role: UserRole.USER,
  },
})

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    useRoute: () => routeState,
    useRouter: () => ({ replace: replaceMock }),
  }
})

vi.mock('@/stores/modules/auth', () => ({
  useAuthStore: () => ({
    get currentUser() {
      return authStoreState.currentUser
    },
    updateProfile: updateProfileMock,
    changePassword: changePasswordMock,
  }),
}))

const elementStubs = {
  ElButton: defineComponent({
    name: 'ElButtonStub',
    props: {
      disabled: Boolean,
      loading: Boolean,
      nativeType: {
        type: String,
        default: 'button',
      },
    },
    emits: ['click'],
    template:
      '<button :disabled="disabled || loading" :type="nativeType" @click="$emit(\'click\')"><slot /></button>',
  }),
  ElCard: defineComponent({
    name: 'ElCardStub',
    template: '<div><slot /></div>',
  }),
  ElDialog: defineComponent({
    name: 'ElDialogStub',
    props: {
      modelValue: Boolean,
    },
    emits: ['update:modelValue', 'close'],
    template:
      '<div v-if="modelValue" data-testid="password-dialog"><slot /><slot name="footer" /><button data-testid="dialog-request-close" @click="$emit(\'update:modelValue\', false); $emit(\'close\')"></button></div>',
  }),
  ElInput: defineComponent({
    name: 'ElInputStub',
    props: {
      modelValue: {
        type: String,
        default: '',
      },
      name: {
        type: String,
        default: '',
      },
      type: {
        type: String,
        default: 'text',
      },
      placeholder: {
        type: String,
        default: '',
      },
    },
    emits: ['update:modelValue'],
    template:
      '<input :name="name" :type="type" :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  }),
  ElTag: defineComponent({
    name: 'ElTagStub',
    template: '<span><slot /></span>',
  }),
  ConsolePageHero: defineComponent({
    name: 'ConsolePageHeroStub',
    template: '<section class="console-page-hero"><slot /><slot name="actions" /></section>',
  }),
  ConsoleDetailLayout: defineComponent({
    name: 'ConsoleDetailLayoutStub',
    template:
      '<div class="console-detail-layout"><div class="console-detail-layout__main"><slot name="main" /></div><aside class="console-detail-layout__aside"><slot name="aside" /></aside></div>',
  }),
  ConsoleAsidePanel: defineComponent({
    name: 'ConsoleAsidePanelStub',
    template: '<section class="console-aside-panel"><slot /></section>',
  }),
  ConsoleFeedbackSurface: defineComponent({
    name: 'ConsoleFeedbackSurfaceStub',
    template: '<section class="console-feedback-surface"><slot /></section>',
  }),
}

function readUserViewSource(fileName: string) {
  return readFileSync(resolve(process.cwd(), `src/views/user/${fileName}`), 'utf-8')
}

describe('Profile view', () => {
  beforeEach(() => {
    routeState.path = '/profile'
    routeState.query = {}
    authStoreState.currentUser = {
      userId: 'user-1',
      username: 'demo-user',
      email: 'demo@example.com',
      realName: '演示用户',
      phone: '13800138000',
      role: UserRole.USER,
    }
    updateProfileMock.mockReset()
    changePasswordMock.mockReset()
    replaceMock.mockReset()
  })

  it('保存个人资料时会调用 updateProfile', async () => {
    updateProfileMock.mockResolvedValue(undefined)

    const Profile = (await import('../Profile.vue')).default
    const wrapper = mount(Profile, {
      global: {
        stubs: elementStubs,
      },
    })

    expect(wrapper.find('.console-detail-layout').exists()).toBe(true)
    expect(wrapper.find('.console-aside-panel').exists()).toBe(true)

    await wrapper.get('input[name="realName"]').setValue('  新姓名  ')
    await wrapper.get('input[name="phone"]').setValue('13900139000')
    await wrapper.get('[data-testid="profile-form"]').trigger('submit')
    await flushPromises()

    expect(updateProfileMock).toHaveBeenCalledWith({
      realName: '新姓名',
      phone: '13900139000',
    })
  })

  it('路由 query 为 tab=password 时会直接打开修改密码交互', async () => {
    routeState.query = { tab: 'password' }

    const Profile = (await import('../Profile.vue')).default
    const wrapper = mount(Profile, {
      global: {
        stubs: elementStubs,
      },
    })

    expect(wrapper.get('[data-testid="password-dialog"]').text()).toContain('修改密码')
    expect(wrapper.find('input[name="oldPassword"]').exists()).toBe(true)
  })

  it('关闭密码弹窗后会清理 tab query 但保留其他查询参数', async () => {
    routeState.query = { tab: 'password', source: 'header', keyword: 'demo' }

    const Profile = (await import('../Profile.vue')).default
    const wrapper = mount(Profile, {
      global: {
        stubs: elementStubs,
      },
    })

    await wrapper.get('[data-testid="dialog-request-close"]').trigger('click')
    await flushPromises()

    expect(replaceMock).toHaveBeenCalledWith({
      path: '/profile',
      query: { source: 'header', keyword: 'demo' },
    })
    expect(replaceMock).toHaveBeenCalledTimes(1)
  })

  it('外部关闭后重新打开时密码表单会恢复干净状态', async () => {
    routeState.query = { tab: 'password', source: 'header' }

    const Profile = (await import('../Profile.vue')).default
    const wrapper = mount(Profile, {
      global: {
        stubs: elementStubs,
      },
    })

    await wrapper.get('input[name="oldPassword"]').setValue('   ')
    await wrapper.get('input[name="newPassword"]').setValue('short')
    await wrapper.get('input[name="confirmPassword"]').setValue('different')
    await wrapper.get('form.reset-password-form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('请输入旧密码')
    expect(wrapper.text()).toContain('密码至少 8 位且需同时包含字母和数字')
    expect(wrapper.text()).toContain('两次输入的新密码不一致')

    await wrapper.get('[data-testid="dialog-request-close"]').trigger('click')
    await flushPromises()

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect((wrapper.get('input[name="oldPassword"]').element as HTMLInputElement).value).toBe('')
    expect((wrapper.get('input[name="newPassword"]').element as HTMLInputElement).value).toBe('')
    expect((wrapper.get('input[name="confirmPassword"]').element as HTMLInputElement).value).toBe(
      '',
    )
    expect(wrapper.text()).not.toContain('请输入旧密码')
    expect(wrapper.text()).not.toContain('密码至少 8 位且需同时包含字母和数字')
    expect(wrapper.text()).not.toContain('两次输入的新密码不一致')
  })

  it('个人中心源码改为消费主题 token，避免资料卡和提示区在深色下保留浅色硬编码', () => {
    const source = readUserViewSource('Profile.vue')

    // 个人中心同时承载 hero、资料卡和侧栏提示，直接锁定页面级 token，避免后续回退成浅色玻璃底色。
    expect(source).toContain('var(--app-surface-card)')
    expect(source).toContain('var(--app-tone-success-surface)')
    expect(source).toContain('var(--app-tone-danger-text)')
    expect(source).toContain('var(--app-border-soft)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(source).not.toMatch(hardcodedColorPattern)
  })
})
