import { type WatchSource, watch } from 'vue'

/**
 * 用户主题偏好只记录显式选择，保留 `system` 以便在系统外观变化时实时跟随。
 */
export type ThemePreference = 'light' | 'dark' | 'system'

/**
 * 最终生效主题只允许是明亮或暗色，两者都会直接影响 DOM 数据属性与浏览器原生控件配色。
 */
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'theme_preference'

const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)'

function getSafeStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function getSafeMediaQueryList(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null
  }

  try {
    return window.matchMedia(THEME_MEDIA_QUERY)
  } catch {
    return null
  }
}

/**
 * 主题解析器负责把三态偏好收敛成真正可落到页面上的两态主题。
 */
export function resolveThemePreference(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') {
    return systemPrefersDark ? 'dark' : 'light'
  }

  return preference
}

/**
 * 读取本地持久化偏好时必须做白名单校验，避免脏值把首屏主题写坏。
 */
export function getStoredThemePreference(): ThemePreference {
  const storage = getSafeStorage()

  if (!storage) {
    return 'system'
  }

  let storedPreference: string | null = null

  try {
    storedPreference = storage.getItem(THEME_STORAGE_KEY)
  } catch {
    return 'system'
  }

  if (
    storedPreference === 'light' ||
    storedPreference === 'dark' ||
    storedPreference === 'system'
  ) {
    return storedPreference
  }

  return 'system'
}

/**
 * 主题偏好需要独立写入 localStorage，确保 `index.html` 的首屏预注入脚本可以在应用启动前读取到最新选择。
 */
export function persistThemePreference(preference: ThemePreference) {
  const storage = getSafeStorage()

  if (!storage) {
    return
  }

  try {
    storage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // 主题偏好写入失败时退化为仅保留当前会话状态，不能影响界面继续渲染。
  }
}

/**
 * 浏览器不支持 `matchMedia` 时默认按亮色兜底，避免 SSR 或测试环境直接抛错。
 */
export function getSystemPrefersDark(): boolean {
  return getSafeMediaQueryList()?.matches ?? false
}

/**
 * 首屏预注入与运行时接管都统一写 `data-theme` 和 `color-scheme`，保证 CSS 变量与原生表单控件视觉一致。
 */
export function applyResolvedTheme(theme: ResolvedTheme) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

/**
 * 运行时主题同步必须继续复用入口层已有的 DOM 挂载口径，
 * 这样头部手动切换和系统主题变化都会走同一条 `data-theme` / `color-scheme` 链路，避免图表与样式根节点分叉。
 */
export function registerResolvedThemeDomSync(themeSource: WatchSource<ResolvedTheme>) {
  return watch(
    themeSource,
    (theme) => {
      applyResolvedTheme(theme)
    },
    {
      immediate: true,
    },
  )
}

/**
 * 系统主题变化只上报 `matches`，具体是否跟随由 Store 内部根据当前偏好自行决定。
 */
export function registerSystemThemeListener(onChange: (systemPrefersDark: boolean) => void) {
  const mediaQueryList = getSafeMediaQueryList()

  if (!mediaQueryList) {
    return () => undefined
  }

  const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
    onChange(event.matches)
  }

  if (typeof mediaQueryList.addEventListener === 'function') {
    try {
      mediaQueryList.addEventListener('change', handleChange)
    } catch {
      return () => undefined
    }

    return () => {
      try {
        mediaQueryList.removeEventListener('change', handleChange)
      } catch {
        // 监听清理失败只会影响回收，不应阻断应用流程。
      }
    }
  }

  try {
    mediaQueryList.addListener(handleChange)
  } catch {
    return () => undefined
  }

  return () => {
    try {
      mediaQueryList.removeListener(handleChange)
    } catch {
      // 同上，旧版 API 的清理失败也只做静默降级。
    }
  }
}
