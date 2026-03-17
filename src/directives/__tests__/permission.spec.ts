import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia } from 'pinia'

import { UserRole } from '@/enums/UserRole'
import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { permissionDirective } from '../permission'

function createAuthUser(role: UserRole) {
  return {
    userId: 'user-1',
    username: 'tester',
    email: 'tester@example.com',
    realName: '测试用户',
    phone: '13800000000',
    role,
  }
}

function mountWithPermission(bindingValue: UserRole | UserRole[]) {
  const pinia = createAppPinia()
  setActivePinia(pinia)

  const authStore = useAuthStore()

  const wrapper = mount(
    defineComponent({
      setup() {
        return {
          authStore,
          bindingValue,
        }
      },
      template: `
        <section :data-role="authStore.userRole ?? 'NONE'">
          <button data-test="action" v-permission="bindingValue">受控操作</button>
        </section>
      `,
    }),
    {
      global: {
        plugins: [pinia],
        directives: {
          permission: permissionDirective,
        },
      },
    },
  )

  return {
    authStore,
    wrapper,
  }
}

function mountWithReactivePermission(initialBindingValue: UserRole | UserRole[]) {
  const pinia = createAppPinia()
  setActivePinia(pinia)

  const authStore = useAuthStore()
  const bindingValue = ref<UserRole | UserRole[]>(initialBindingValue)

  const wrapper = mount(
    defineComponent({
      setup() {
        return {
          bindingValue,
        }
      },
      template: '<button data-test="action" v-permission="bindingValue">受控操作</button>',
    }),
    {
      global: {
        plugins: [pinia],
        directives: {
          permission: permissionDirective,
        },
      },
    },
  )

  return {
    authStore,
    bindingValue,
    wrapper,
  }
}

describe('permission directive', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows element when current role matches a single required role', async () => {
    const { authStore, wrapper } = mountWithPermission(UserRole.SYSTEM_ADMIN)

    authStore.setCurrentUser(createAuthUser(UserRole.SYSTEM_ADMIN))
    await nextTick()

    const button = wrapper.get('[data-test="action"]')
    expect(button.isVisible()).toBe(true)
  })

  it('shows element when current role matches one of multiple required roles', async () => {
    const { authStore, wrapper } = mountWithPermission([
      UserRole.DEVICE_ADMIN,
      UserRole.SYSTEM_ADMIN,
    ])

    authStore.setCurrentUser(createAuthUser(UserRole.DEVICE_ADMIN))
    await nextTick()

    const button = wrapper.get('[data-test="action"]')
    expect(button.isVisible()).toBe(true)
  })

  it('hides element when current role does not have permission', async () => {
    const { authStore, wrapper } = mountWithPermission(UserRole.SYSTEM_ADMIN)

    authStore.setCurrentUser(createAuthUser(UserRole.USER))
    await nextTick()

    const button = wrapper.get('[data-test="action"]')
    expect(button.isVisible()).toBe(false)
  })

  it('updates element visibility after role changes', async () => {
    const { authStore, wrapper } = mountWithPermission(UserRole.SYSTEM_ADMIN)

    authStore.setCurrentUser(createAuthUser(UserRole.USER))
    await nextTick()

    let button = wrapper.get('[data-test="action"]')
    expect((button.element as HTMLButtonElement).style.display).toBe('none')

    authStore.setCurrentUser(createAuthUser(UserRole.SYSTEM_ADMIN))
    await nextTick()

    button = wrapper.get('[data-test="action"]')
    expect((button.element as HTMLButtonElement).style.display).toBe('')
  })

  it('uses the latest binding value after permission expression changes', async () => {
    const { authStore, bindingValue, wrapper } = mountWithReactivePermission(UserRole.SYSTEM_ADMIN)

    authStore.setCurrentUser(createAuthUser(UserRole.SYSTEM_ADMIN))
    await nextTick()

    let button = wrapper.get('[data-test="action"]')
    expect((button.element as HTMLButtonElement).style.display).toBe('')

    bindingValue.value = UserRole.USER
    await nextTick()

    button = wrapper.get('[data-test="action"]')
    expect((button.element as HTMLButtonElement).style.display).toBe('none')

    authStore.setCurrentUser(createAuthUser(UserRole.USER))
    await nextTick()

    button = wrapper.get('[data-test="action"]')
    expect((button.element as HTMLButtonElement).style.display).toBe('')
  })
})
