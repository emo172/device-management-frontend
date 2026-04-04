import type { App, Plugin } from 'vue'

import { ElAlert } from 'element-plus/es/components/alert/index.mjs'
import { ElAvatar } from 'element-plus/es/components/avatar/index.mjs'
import { ElBadge } from 'element-plus/es/components/badge/index.mjs'
import { ElBreadcrumb, ElBreadcrumbItem } from 'element-plus/es/components/breadcrumb/index.mjs'
import { ElButton } from 'element-plus/es/components/button/index.mjs'
import { ElCard } from 'element-plus/es/components/card/index.mjs'
import {
  ElAside,
  ElContainer,
  ElHeader,
  ElMain,
} from 'element-plus/es/components/container/index.mjs'
import { ElDescriptions } from 'element-plus/es/components/descriptions/index.mjs'
import { ElDatePicker } from 'element-plus/es/components/date-picker/index.mjs'
import { ElDialog } from 'element-plus/es/components/dialog/index.mjs'
import {
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
} from 'element-plus/es/components/dropdown/index.mjs'
import { ElEmpty } from 'element-plus/es/components/empty/index.mjs'
import { ElForm } from 'element-plus/es/components/form/index.mjs'
import { ElIcon } from 'element-plus/es/components/icon/index.mjs'
import { ElImage } from 'element-plus/es/components/image/index.mjs'
import { ElInput } from 'element-plus/es/components/input/index.mjs'
import { ElInputNumber } from 'element-plus/es/components/input-number/index.mjs'
import { ElLoadingDirective } from 'element-plus/es/components/loading/index.mjs'
import { ElMenu, ElMenuItem } from 'element-plus/es/components/menu/index.mjs'
import { ElPagination } from 'element-plus/es/components/pagination/index.mjs'
import { ElRadioButton, ElRadioGroup } from 'element-plus/es/components/radio/index.mjs'
import { ElScrollbar } from 'element-plus/es/components/scrollbar/index.mjs'
import { ElOption, ElSelect } from 'element-plus/es/components/select/index.mjs'
import { ElTable } from 'element-plus/es/components/table/index.mjs'
import { ElTag } from 'element-plus/es/components/tag/index.mjs'
import { ElTimeline } from 'element-plus/es/components/timeline/index.mjs'
import { ElTooltip } from 'element-plus/es/components/tooltip/index.mjs'
import { ElTree } from 'element-plus/es/components/tree/index.mjs'
import { ElTreeSelect } from 'element-plus/es/components/tree-select/index.mjs'
import { ElUpload } from 'element-plus/es/components/upload/index.mjs'
import { provideGlobalConfig } from 'element-plus/es/components/config-provider/index.mjs'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

/**
 * 当前项目采用手动按需注册 Element Plus 的方式控制入口体积。
 * 因此这里必须覆盖仓库里已经真实落地的组件，否则页面测试即便使用了组件桩，运行时仍会出现未知标签。
 */
const elementPlusPlugins: Plugin[] = [
  ElAside,
  ElAlert,
  ElAvatar,
  ElBadge,
  ElBreadcrumb,
  ElBreadcrumbItem,
  ElButton,
  ElCard,
  ElContainer,
  ElDescriptions,
  ElDatePicker,
  ElDialog,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElEmpty,
  ElForm,
  ElHeader,
  ElIcon,
  ElImage,
  ElInput,
  ElInputNumber,
  ElMain,
  ElMenu,
  ElMenuItem,
  ElOption,
  ElPagination,
  ElScrollbar,
  ElSelect,
  ElTable,
  ElTag,
  ElTimeline,
  ElTooltip,
  ElTree,
  ElTreeSelect,
  ElUpload,
]

/**
 * 注册当前阶段实际用到的 Element Plus 组件与全局配置。
 * 改为从组件子路径按需导入，避免根入口把整库组件打进主包，从而缓解构建产物过大的问题。
 */
export function installElementPlus(app: App) {
  elementPlusPlugins.forEach((plugin) => {
    app.use(plugin)
  })

  /**
   * Element Plus 的 `ElRadioGroup` / `ElRadioButton` 属于 no-op install 组件。
   * 创建页直接使用这两个标签时，若仍走 `app.use()` 将不会真正注册，运行态会继续报 unresolved component。
   */
  app.component('ElRadioButton', ElRadioButton)
  app.component('ElRadioGroup', ElRadioGroup)

  /**
   * `v-loading` 并不是模板组件，而是设备列表等页面直接依赖的指令。
   * 若只注册组件不注册指令，表格加载态会在运行时报错，和认证页缺少输入框属于同一类基础设施缺口。
   */
  app.directive('loading', ElLoadingDirective)

  provideGlobalConfig({ locale: zhCn }, app, true)
}
