import type { RouteRecordRaw } from 'vue-router'

/**
 * 认证公开路由。
 * 这些页面不要求登录，并统一使用 auth 布局承接登录、注册和找回密码场景。
 */
const authRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { title: '登录', requiresAuth: false, layout: 'auth' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/Register.vue'),
    meta: { title: '注册', requiresAuth: false, layout: 'auth' },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/auth/ForgotPassword.vue'),
    meta: { title: '忘记密码', requiresAuth: false, layout: 'auth' },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/auth/ResetPassword.vue'),
    meta: { title: '重置密码', requiresAuth: false, layout: 'auth' },
  },
]

export default authRoutes
