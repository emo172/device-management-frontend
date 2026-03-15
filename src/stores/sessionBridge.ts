type SessionResetHandler = () => void | Promise<void>

let sessionResetHandler: SessionResetHandler | null = null

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
