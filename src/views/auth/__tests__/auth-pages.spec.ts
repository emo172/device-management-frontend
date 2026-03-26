import { defineComponent, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const pushMock = vi.fn()
const loginMock = vi.fn()
const registerMock = vi.fn()
const sendVerificationCodeMock = vi.fn()
const resetPasswordMock = vi.fn()
const authStoreState = reactive({
  loading: false,
})

const routeState = {
  query: {} as Record<string, unknown>,
}

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    useRoute: () => routeState,
    useRouter: () => ({ push: pushMock }),
  }
})

vi.mock('@/stores/modules/auth', () => ({
  useAuthStore: () => ({
    get loading() {
      return authStoreState.loading
    },
    login: loginMock,
    register: registerMock,
    resetPassword: resetPasswordMock,
    sendVerificationCode: sendVerificationCodeMock,
  }),
}))

const elementStubs = {
  ElButton: defineComponent({
    name: 'ElButtonStub',
    props: {
      disabled: Boolean,
      loading: Boolean,
      size: {
        type: String,
        default: '',
      },
      nativeType: {
        type: String,
        default: 'button',
      },
    },
    emits: ['click'],
    template:
      '<button :disabled="disabled || loading" :data-loading="loading ? \'true\' : \'false\'" :data-size="size" :type="nativeType" @click="$emit(\'click\')"><slot /></button>',
  }),
  ElCard: defineComponent({
    name: 'ElCardStub',
    template: '<div class="el-card-stub"><slot /></div>',
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
      size: {
        type: String,
        default: '',
      },
    },
    emits: ['update:modelValue'],
    template:
      '<input :name="name" :type="type" :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  }),
  ElLink: defineComponent({
    name: 'ElLinkStub',
    template: '<a><slot /></a>',
  }),
  RouterLink: defineComponent({
    name: 'RouterLinkStub',
    props: {
      to: {
        type: [String, Object],
        required: true,
      },
    },
    template: '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>',
  }),
}

function mountPage(component: object) {
  return mount(component, {
    global: {
      stubs: elementStubs,
    },
  })
}

describe('auth public pages', () => {
  beforeEach(() => {
    authStoreState.loading = false
    routeState.query = {}
    pushMock.mockReset()
    loginMock.mockReset()
    registerMock.mockReset()
    sendVerificationCodeMock.mockReset()
    resetPasswordMock.mockReset()
  })

  it('登录成功后优先跳转 redirect 参数', async () => {
    routeState.query = { redirect: '/devices?keyword=示波器' }
    loginMock.mockResolvedValue(undefined)

    const Login = (await import('../Login.vue')).default
    const wrapper = mountPage(Login)

    await wrapper.get('input[name="account"]').setValue('demo')
    await wrapper.get('input[name="password"]').setValue('Password123')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('进入设备管理工作台')
    expect(wrapper.text()).toContain(
      '使用账号或注册邮箱登录，继续处理你的设备查询、预约与审批相关工作。',
    )
    expect(wrapper.text()).toContain('登录并继续')
    expect(wrapper.text()).toContain('没有账号？去注册')
    expect(wrapper.text()).toContain('忘记密码？')
    expect(wrapper.find('.auth-panel__surface').exists()).toBe(true)
    expect(wrapper.find('.auth-panel__actions').exists()).toBe(true)
    expect(loginMock).toHaveBeenCalledWith({ account: 'demo', password: 'Password123' })
    expect(pushMock).toHaveBeenCalledWith('/devices?keyword=示波器')
  })

  it('登录请求进行中时会禁用提交并阻止重复提交', async () => {
    let resolveLogin: (() => void) | null = null
    loginMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          authStoreState.loading = true
          resolveLogin = () => {
            authStoreState.loading = false
            resolve()
          }
        }),
    )

    const Login = (await import('../Login.vue')).default
    const wrapper = mountPage(Login)

    await wrapper.get('input[name="account"]').setValue('demo')
    await wrapper.get('input[name="password"]').setValue('Password123')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const submitButton = wrapper.get('button[type="submit"]')
    expect(loginMock).toHaveBeenCalledTimes(1)
    expect(submitButton.attributes('data-loading')).toBe('true')
    expect(submitButton.attributes()).toHaveProperty('disabled')

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(loginMock).toHaveBeenCalledTimes(1)

    const finishLogin = resolveLogin as (() => void) | null
    if (typeof finishLogin === 'function') {
      finishLogin()
    }
    await flushPromises()
  })

  it('登录页会拦截仅输入空白的账号和密码', async () => {
    const Login = (await import('../Login.vue')).default
    const wrapper = mountPage(Login)

    await wrapper.get('input[name="account"]').setValue('   ')
    await wrapper.get('input[name="password"]').setValue('   ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(loginMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请输入账号')
    expect(wrapper.text()).toContain('请输入密码')
  })

  it('注册页会阻止无效表单提交', async () => {
    const Register = (await import('../Register.vue')).default
    const wrapper = mountPage(Register)

    await wrapper.get('input[name="username"]').setValue('')
    await wrapper.get('input[name="email"]').setValue('invalid-email')
    await wrapper.get('input[name="password"]').setValue('short')
    await wrapper.get('input[name="confirmPassword"]').setValue('different')
    await wrapper.get('input[name="realName"]').setValue('测试用户')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('注册系统账号')
    expect(wrapper.text()).toContain(
      '填写基础资料后即可完成注册，进入系统继续进行设备预约与个人操作。',
    )
    expect(wrapper.text()).toContain('注册并进入系统')
    expect(wrapper.text()).toContain('已有账号？去登录')
    expect(wrapper.find('.auth-panel__surface').exists()).toBe(true)
    expect(wrapper.find('.auth-panel__actions').exists()).toBe(true)
    expect(registerMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请输入用户名')
    expect(wrapper.text()).toContain('请输入合法的邮箱地址')
    expect(wrapper.text()).toContain('密码至少 8 位且需同时包含字母和数字')
    expect(wrapper.text()).toContain('两次输入的密码不一致')
  })

  it('注册成功后会跳转到仪表盘', async () => {
    registerMock.mockResolvedValue(undefined)

    const Register = (await import('../Register.vue')).default
    const wrapper = mountPage(Register)

    await wrapper.get('input[name="username"]').setValue('new-user')
    await wrapper.get('input[name="email"]').setValue('new-user@example.com')
    await wrapper.get('input[name="password"]').setValue('Password123')
    await wrapper.get('input[name="confirmPassword"]').setValue('Password123')
    await wrapper.get('input[name="realName"]').setValue('新用户')
    await wrapper.get('input[name="phone"]').setValue('')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(registerMock).toHaveBeenCalledWith({
      username: 'new-user',
      email: 'new-user@example.com',
      password: 'Password123',
      realName: '新用户',
      phone: '',
    })
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
  })

  it('注册请求进行中时会禁用提交并阻止重复提交', async () => {
    let resolveRegister: (() => void) | null = null
    registerMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          authStoreState.loading = true
          resolveRegister = () => {
            authStoreState.loading = false
            resolve()
          }
        }),
    )

    const Register = (await import('../Register.vue')).default
    const wrapper = mountPage(Register)

    await wrapper.get('input[name="username"]').setValue('new-user')
    await wrapper.get('input[name="email"]').setValue('new-user@example.com')
    await wrapper.get('input[name="password"]').setValue('Password123')
    await wrapper.get('input[name="confirmPassword"]').setValue('Password123')
    await wrapper.get('input[name="realName"]').setValue('新用户')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const submitButton = wrapper.get('button[type="submit"]')
    expect(registerMock).toHaveBeenCalledTimes(1)
    expect(submitButton.attributes('data-loading')).toBe('true')
    expect(submitButton.attributes()).toHaveProperty('disabled')

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(registerMock).toHaveBeenCalledTimes(1)

    const finishRegister = resolveRegister as (() => void) | null
    if (typeof finishRegister === 'function') {
      finishRegister()
    }
    await flushPromises()
  })

  it('忘记密码页发送验证码后会进入 60 秒倒计时', async () => {
    vi.useFakeTimers()
    sendVerificationCodeMock.mockResolvedValue(undefined)

    const ForgotPassword = (await import('../ForgotPassword.vue')).default
    const wrapper = mountPage(ForgotPassword)

    expect(wrapper.text()).toContain('重置登录密码')
    expect(wrapper.text()).toContain('返回登录')
    expect(wrapper.text()).not.toContain('注册新账号')
    expect(wrapper.get('[data-testid="send-code-button"]').attributes('data-size')).toBe('large')
    const forgotFooterLinks = wrapper.findAll('.auth-panel__actions .auth-panel__link')
    expect(forgotFooterLinks).toHaveLength(1)
    expect(forgotFooterLinks[0]?.attributes('data-to')).toBe('/login')

    await wrapper.get('input[name="email"]').setValue('demo@example.com')
    await wrapper.get('[data-testid="send-code-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('.auth-panel__surface').exists()).toBe(true)
    expect(wrapper.find('.auth-panel__actions').exists()).toBe(true)
    expect(sendVerificationCodeMock).toHaveBeenCalledWith({ email: 'demo@example.com' })
    const getCountdownValue = () =>
      Number(wrapper.get('[data-testid="send-code-button"]').text().match(/\d+/)?.[0])

    expect(getCountdownValue()).toBe(60)

    vi.advanceTimersByTime(1000)
    await flushPromises()
    expect(getCountdownValue()).toBe(59)

    vi.advanceTimersByTime(59000)
    await flushPromises()
    expect(wrapper.get('[data-testid="send-code-button"]').text()).toContain('发送验证码')

    vi.useRealTimers()
  })

  it('重置密码页提交成功后会调用重置接口并返回登录页', async () => {
    resetPasswordMock.mockResolvedValue(undefined)

    const ResetPassword = (await import('../ResetPassword.vue')).default
    const wrapper = mountPage(ResetPassword)

    expect(wrapper.text()).toContain('重置登录密码')
    expect(wrapper.text()).toContain('返回登录')
    expect(wrapper.text()).not.toContain('注册新账号')
    const resetFooterLinks = wrapper.findAll('.auth-panel__actions .auth-panel__link')
    expect(resetFooterLinks).toHaveLength(1)
    expect(resetFooterLinks[0]?.attributes('data-to')).toBe('/login')

    await wrapper.get('input[name="email"]').setValue('demo@example.com')
    await wrapper.get('input[name="verificationCode"]').setValue('123456')
    await wrapper.get('input[name="password"]').setValue('Password123')
    await wrapper.get('input[name="confirmPassword"]').setValue('Password123')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.auth-panel__surface').exists()).toBe(true)
    expect(wrapper.find('.auth-panel__actions').exists()).toBe(true)
    expect(resetPasswordMock).toHaveBeenCalledWith({
      email: 'demo@example.com',
      verificationCode: '123456',
      newPassword: 'Password123',
    })
    expect(pushMock).toHaveBeenCalledWith('/login')
  })
})
