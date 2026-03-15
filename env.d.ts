/// <reference types="vite/client" />

/**
 * Element Plus 标签类型会被多个枚举模块直接复用。
 * 根级声明可确保 `vue-tsc --build` 在项目引用模式下也能稳定拿到该全局别名，避免只在局部声明文件中生效。
 */
type StatusTagType = '' | 'success' | 'info' | 'warning' | 'danger' | 'primary'
