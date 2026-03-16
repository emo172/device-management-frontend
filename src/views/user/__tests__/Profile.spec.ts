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
})
