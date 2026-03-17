import { watch } from 'vue'
import type { DirectiveBinding, ObjectDirective, WatchStopHandle } from 'vue'
import type { Pinia } from 'pinia'

import { UserRole } from '@/enums/UserRole'
import { useAuthStore } from '@/stores/modules/auth'

type PermissionValue = UserRole | UserRole[]

interface PermissionElement extends HTMLElement {
  __permissionOriginalDisplay__?: string
  __permissionBindingValue__?: PermissionValue
  __permissionWatchStop__?: WatchStopHandle
}

interface PermissionBindingInstance {
  $pinia?: Pinia
}

/**
 * 元素级权限指令。
 * 这里用 `display: none` 而不是直接移除节点，避免与 Vue 自身的挂载、更新和卸载流程相互打架，
 * 同时保留原始 DOM 引用，并把最新绑定值缓存在元素实例上，确保角色变化时不会继续使用旧权限表达式。
 */
function applyPermission(
  el: PermissionElement,
  authStore: ReturnType<typeof useAuthStore>,
  value: PermissionValue | undefined,
) {
  const requiredRoles = normalizePermissionValue(value)
  const currentRole = authStore.userRole
  const hasPermission = currentRole !== null && requiredRoles.includes(currentRole)

  toggleElementVisibility(el, hasPermission)
}

/**
 * 指令既要兼容全局单例 Pinia，也要兼容单测里通过 `global.plugins` 注入的独立 Pinia 实例。
 */
function resolvePinia(binding: DirectiveBinding<PermissionValue>) {
  return (binding.instance as PermissionBindingInstance | null)?.$pinia
}

/**
 * 无效绑定值默认按“无权限”处理，避免因为模板误传值把管理员专属入口暴露给普通角色。
 */
function normalizePermissionValue(value: PermissionValue | undefined): UserRole[] {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'string') {
    return [value as UserRole]
  }

  return []
}

/**
 * 保留元素原始 display，确保角色恢复后不会把原本的 `inline-flex`、`grid` 等展示方式改坏。
 */
function toggleElementVisibility(el: PermissionElement, visible: boolean) {
  if (el.__permissionOriginalDisplay__ === undefined) {
    el.__permissionOriginalDisplay__ = el.style.display
  }

  el.style.display = visible ? el.__permissionOriginalDisplay__ : 'none'
}

export const permissionDirective: ObjectDirective<PermissionElement, PermissionValue> = {
  mounted(el, binding) {
    const authStore = useAuthStore(resolvePinia(binding))
    el.__permissionBindingValue__ = binding.value

    el.__permissionWatchStop__ = watch(
      () => authStore.userRole,
      () => {
        applyPermission(el, authStore, el.__permissionBindingValue__)
      },
      {
        immediate: true,
      },
    )
  },
  updated(el, binding) {
    const authStore = useAuthStore(resolvePinia(binding))
    el.__permissionBindingValue__ = binding.value
    applyPermission(el, authStore, el.__permissionBindingValue__)
  },
  unmounted(el) {
    el.__permissionWatchStop__?.()
  },
}
