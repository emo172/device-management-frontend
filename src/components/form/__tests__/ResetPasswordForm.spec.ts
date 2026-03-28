import { defineComponent, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const changePasswordMock = vi.fn()
const authStoreState = reactive({
  loading: false,
})

vi.mock('@/stores/modules/auth', () => ({
  useAuthStore: () => ({
    get loading() {
      return authStoreState.loading
    },
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
}

function readResetPasswordFormSource() {
  return readFileSync(resolve(process.cwd(), 'src/components/form/ResetPasswordForm.vue'), 'utf-8')
}

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    authStoreState.loading = false
    changePasswordMock.mockReset()
  })

  it('重置密码表单错误态与输入区只消费主题 token', () => {
    const source = readResetPasswordFormSource()

    expect(source).toContain('var(--app-tone-danger-solid)')
    expect(source).toContain('var(--app-surface-card-strong)')
    expect(source).toContain('var(--app-border-strong)')
    expect(source).not.toContain('#dc2626')
  })

  it('会拦截无效密码表单并展示校验信息', async () => {
    const ResetPasswordForm = (await import('../ResetPasswordForm.vue')).default
    const wrapper = mount(ResetPasswordForm, {
      global: {
        stubs: elementStubs,
      },
    })

    await wrapper.get('input[name="oldPassword"]').setValue('')
    await wrapper.get('input[name="newPassword"]').setValue('short')
    await wrapper.get('input[name="confirmPassword"]').setValue('different')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(changePasswordMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请输入旧密码')
    expect(wrapper.text()).toContain('密码至少 8 位且需同时包含字母和数字')
    expect(wrapper.text()).toContain('两次输入的新密码不一致')
  })

  it('提交有效表单时会调用 changePassword', async () => {
    changePasswordMock.mockResolvedValue(undefined)

    const ResetPasswordForm = (await import('../ResetPasswordForm.vue')).default
    const wrapper = mount(ResetPasswordForm, {
      global: {
        stubs: elementStubs,
      },
    })

    await wrapper.get('input[name="oldPassword"]').setValue('OldPassword123')
    await wrapper.get('input[name="newPassword"]').setValue('NewPassword123')
    await wrapper.get('input[name="confirmPassword"]').setValue('NewPassword123')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(changePasswordMock).toHaveBeenCalledWith({
      oldPassword: 'OldPassword123',
      newPassword: 'NewPassword123',
    })
  })

  it('调用暴露的 resetForm 后会清空输入值和错误提示', async () => {
    const ResetPasswordForm = (await import('../ResetPasswordForm.vue')).default
    const wrapper = mount(ResetPasswordForm, {
      global: {
        stubs: elementStubs,
      },
    })

    await wrapper.get('input[name="oldPassword"]').setValue('')
    await wrapper.get('input[name="newPassword"]').setValue('short')
    await wrapper.get('input[name="confirmPassword"]').setValue('different')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('请输入旧密码')
    ;(wrapper.vm as unknown as { resetForm: () => void }).resetForm()
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
