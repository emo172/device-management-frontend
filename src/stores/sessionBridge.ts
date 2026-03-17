import { ElMessage } from 'element-plus/es/components/message/index.mjs'

import type { FatalErrorState } from '@/stores/modules/app'
import { clearTokens } from '@/utils/token'

type SessionResetHandler = () => void | Promise<void>
type UnauthorizedHandlerContext = {
  redirect?: string
}
type UnauthorizedHandler = (context: UnauthorizedHandlerContext) => void | Promise<void>
type FatalErrorHandler = (error: FatalErrorState) => void | Promise<void>

let sessionResetHandler: SessionResetHandler | null = null
let unauthorizedHandler: UnauthorizedHandler | null = null
let fatalErrorHandler: FatalErrorHandler | null = null
let unauthorizedHandlingPromise: Promise<void> | null = null
let fatalErrorHandlingPromise: Promise<void> | null = null

const authEntryPaths = new Set(['/login', '/register', '/forgot-password', '/reset-password'])

function normalizeUnauthorizedRedirect(redirect?: string) {
  if (!redirect) {
    return undefined
  }

  const path = redirect.split('?')[0] ?? redirect

  if (authEntryPaths.has(path)) {
    return undefined
  }

  return redirect
}

/**
 * 注册全局会话重置回调。
 * 请求层不能直接依赖认证 Store，否则会与 `auth -> api -> request` 形成循环；这里用桥接函数把“谁来清理 Store”延后到入口层装配。
 */
export function registerSessionResetHandler(handler: SessionResetHandler) {
  sessionResetHandler = handler
}

/**
 * 执行当前已注册的会话重置逻辑。
 * 若应用尚未完成装配，则退化为 no-op，请求层仍会继续执行令牌清理与登录跳转。
 */
export async function runSessionResetHandler() {
  await sessionResetHandler?.()
}

/**
 * 注册统一未授权处理回调。
 * 请求层、认证 Store 与路由守卫都可能识别出 401，但真正的登录导航必须交给入口层装配，
 * 这样才能基于当前路由、目标路由或公开页白名单生成正确的 redirect，避免基础设施彼此反向依赖。
 */
export function registerUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler
}

/**
 * 执行统一未授权处理链。
 * 这里负责清 token、复位会话内存态并提示登录失效；具体导航由入口层注入，
 * 从而让 request / auth / router 只声明“发生了未授权”，而不再各自拼一遍登录跳转。
 * 同一时间窗内若多个入口同时命中 401，则只接受首个触发者：
 * 否则会出现重复清 token、重复 reset Store、重复弹错与多次登录导航，用户只会看到抖动后的最后一次跳转结果。
 */
export async function runUnauthorizedHandler(context: UnauthorizedHandlerContext = {}) {
  if (unauthorizedHandlingPromise) {
    return unauthorizedHandlingPromise
  }

  unauthorizedHandlingPromise = (async () => {
    clearTokens()

    try {
      await runSessionResetHandler()
    } catch {
      // 会话复位失败不能阻止登录跳转，否则 401 会停留在错误页面继续触发更多无效请求。
    }

    ElMessage.error('登录已过期，请重新登录')

    await unauthorizedHandler?.({
      redirect: normalizeUnauthorizedRedirect(context.redirect),
    })
  })()

  try {
    await unauthorizedHandlingPromise
  } finally {
    unauthorizedHandlingPromise = null
  }
}

/**
 * 注册统一致命错误处理回调。
 * request / auth / router / main 只负责上报故障快照，由入口层决定如何写入 Store 并导航到 500，
 * 避免多个基础设施同时依赖 appStore 和 router 形成耦合链。
 */
export function registerFatalErrorHandler(handler: FatalErrorHandler) {
  fatalErrorHandler = handler
}

/**
 * 执行当前已注册的致命错误处理逻辑。
 * 若入口层尚未完成注册，则退化为 no-op，保证底层调用方不会因为 500 兜底未装配而再次抛错。
 * 并发上报时采用“处理窗口内首个错误优先”的策略：
 * 首个错误已经足以把应用导向 `/500`，后续错误若继续并发写快照，只会制造无序覆盖和重复导航。
 */
export async function runFatalErrorHandler(error: FatalErrorState) {
  if (fatalErrorHandlingPromise) {
    return fatalErrorHandlingPromise
  }

  fatalErrorHandlingPromise = (async () => {
    await fatalErrorHandler?.(error)
  })()

  try {
    await fatalErrorHandlingPromise
  } finally {
    fatalErrorHandlingPromise = null
  }
}
