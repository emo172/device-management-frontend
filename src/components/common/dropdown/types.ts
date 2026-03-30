import type { Component } from 'vue'

/**
 * 统一按钮型下拉的菜单项契约，收口状态语义与展示补充信息，
 * 让业务页迁移时不再各自发明危险项、激活态和测试定位字段。
 */
export interface AppDropdownItem {
  key: string
  label: string
  icon?: Component
  meta?: string
  testId?: string
  active?: boolean
  disabled?: boolean
  danger?: boolean
  divided?: boolean
}
