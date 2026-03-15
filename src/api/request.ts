import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'

import router from '@/router'
import type { ApiResponse } from '@/types/api'
import { clearTokens, getAccessToken } from '@/utils/token'

/**
 * Axios 基础实例。
 * 当前固定走 /api 前缀，开发环境由 Vite 代理消费 VITE_API_BASE_URL，
 * 生产环境再交给 Nginx 统一反向代理，避免前端业务模块感知部署差异。
 */
const service = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 请求拦截器负责把 Access Token 自动拼进 Authorization。
 * 这样业务 API 模块只关注 DTO，不需要重复书写鉴权逻辑。
 */
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = getAccessToken()

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    return config
  },
  (error) => Promise.reject(error),
)

/**
 * 响应拦截器统一拆包后端的 { code, message, data } 结构，
 * 同时集中处理鉴权失败和通用提示，避免每个业务模块自行判断。
 */
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    const { code, message } = response.data

    if (code === 0) {
      return response
    }

    const errorMessage = message || '请求失败'
    ElMessage.error(errorMessage)
    return Promise.reject(new Error(errorMessage))
  },
  (error: AxiosError<ApiResponse<unknown>>) => {
    const status = error.response?.status
    const responseMessage = error.response?.data?.message

    if (status === 401) {
      clearTokens()
      void router.push('/login')
      ElMessage.error('登录已过期，请重新登录')
      return Promise.reject(error)
    }

    if (status === 403) {
      ElMessage.error('没有权限执行此操作')
      return Promise.reject(error)
    }

    if (status === 400) {
      ElMessage.error(responseMessage || '请求参数错误')
      return Promise.reject(error)
    }

    ElMessage.error(responseMessage || '网络错误，请稍后重试')
    return Promise.reject(error)
  },
)

export default service
