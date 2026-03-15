import type { App, Plugin } from 'vue'

import { ElAvatar } from 'element-plus/es/components/avatar/index.mjs'
import { ElBadge } from 'element-plus/es/components/badge/index.mjs'
import { ElBreadcrumb, ElBreadcrumbItem } from 'element-plus/es/components/breadcrumb/index.mjs'
import { ElButton } from 'element-plus/es/components/button/index.mjs'
import {
  ElAside,
  ElContainer,
  ElHeader,
  ElMain,
} from 'element-plus/es/components/container/index.mjs'
import {
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
} from 'element-plus/es/components/dropdown/index.mjs'
import { ElIcon } from 'element-plus/es/components/icon/index.mjs'
import { ElMenu, ElMenuItem } from 'element-plus/es/components/menu/index.mjs'
import { ElScrollbar } from 'element-plus/es/components/scrollbar/index.mjs'
import { provideGlobalConfig } from 'element-plus/es/components/config-provider/index.mjs'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const elementPlusPlugins: Plugin[] = [
  ElAside,
  ElAvatar,
  ElBadge,
  ElBreadcrumb,
  ElBreadcrumbItem,
  ElButton,
  ElContainer,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElHeader,
  ElIcon,
  ElMain,
  ElMenu,
  ElMenuItem,
  ElScrollbar,
]

/**
 * 注册当前阶段实际用到的 Element Plus 组件与全局配置。
 * 改为从组件子路径按需导入，避免根入口把整库组件打进主包，从而缓解构建产物过大的问题。
 */
export function installElementPlus(app: App) {
  elementPlusPlugins.forEach((plugin) => {
    app.use(plugin)
  })

  provideGlobalConfig({ locale: zhCn }, app, true)
}
