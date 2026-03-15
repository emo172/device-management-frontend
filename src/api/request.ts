import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { ElMessage } from 'element-plus'

import router from '@/router'
import type { ApiResponse } from '@/types/api'
import { clearTokens, getAccessToken } from '@/utils/token'

type RawApiResponse<T> = AxiosResponse<ApiResponse<T>>

/**
 * 统一请求实例类型。
 * 基础设施层约定“成功时直接返回业务 data”，避免后续 API 模块重复书写 response.data.data。
 */
export interface RequestInstance extends Omit<
  AxiosInstance,
  | 'request'
  | 'get'
  | 'delete'
  | 'head'
  | 'options'
  | 'post'
  | 'put'
  | 'patch'
  | 'postForm'
  | 'putForm'
  | 'patchForm'
> {
  request<T = unknown, D = unknown>(config: AxiosRequestConfig<D>): Promise<T>
  get<T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
  delete<T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
  head<T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
  options<T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
  post<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>
  put<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>
  patch<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>
  postForm<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ): Promise<T>
  putForm<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ): Promise<T>
  patchForm<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ): Promise<T>
}

async function unwrapResponseData<T>(requestPromise: Promise<RawApiResponse<T>>): Promise<T> {
  const response = await requestPromise
  return response.data.data
}

/**
 * Axios 基础实例。
 * 当前固定走 /api 前缀，开发环境由 Vite 代理消费 VITE_API_BASE_URL，
 * 生产环境再交给 Nginx 统一反向代理，避免前端业务模块感知部署差异。
 */
const rawService = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

const rawRequest = rawService.request.bind(rawService) as AxiosInstance['request']
const rawGet = rawService.get.bind(rawService) as AxiosInstance['get']
const rawDelete = rawService.delete.bind(rawService) as AxiosInstance['delete']
const rawHead = rawService.head.bind(rawService) as AxiosInstance['head']
const rawOptions = rawService.options.bind(rawService) as AxiosInstance['options']
const rawPost = rawService.post.bind(rawService) as AxiosInstance['post']
const rawPut = rawService.put.bind(rawService) as AxiosInstance['put']
const rawPatch = rawService.patch.bind(rawService) as AxiosInstance['patch']
const rawPostForm = rawService.postForm.bind(rawService) as AxiosInstance['postForm']
const rawPutForm = rawService.putForm.bind(rawService) as AxiosInstance['putForm']
const rawPatchForm = rawService.patchForm.bind(rawService) as AxiosInstance['patchForm']

/**
 * 请求拦截器负责把 Access Token 自动拼进 Authorization。
 * 这样业务 API 模块只关注 DTO，不需要重复书写鉴权逻辑。
 */
rawService.interceptors.request.use(
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
 * 响应拦截器负责校验后端统一响应壳，
 * 成功时由下方的 unwrapResponseData 再提取业务 data，避免 API 模块手写双层 data 访问。
 */
rawService.interceptors.response.use(
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

const service = rawService as RequestInstance

service.request = <T = unknown, D = unknown>(config: AxiosRequestConfig<D>) =>
  unwrapResponseData<T>(rawRequest<ApiResponse<T>, RawApiResponse<T>, D>(config))

service.get = <T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>) =>
  unwrapResponseData<T>(rawGet<ApiResponse<T>, RawApiResponse<T>, D>(url, config))

service.delete = <T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>) =>
  unwrapResponseData<T>(rawDelete<ApiResponse<T>, RawApiResponse<T>, D>(url, config))

service.head = <T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>) =>
  unwrapResponseData<T>(rawHead<ApiResponse<T>, RawApiResponse<T>, D>(url, config))

service.options = <T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>) =>
  unwrapResponseData<T>(rawOptions<ApiResponse<T>, RawApiResponse<T>, D>(url, config))

service.post = <T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>) =>
  unwrapResponseData<T>(rawPost<ApiResponse<T>, RawApiResponse<T>, D>(url, data, config))

service.put = <T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>) =>
  unwrapResponseData<T>(rawPut<ApiResponse<T>, RawApiResponse<T>, D>(url, data, config))

service.patch = <T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>) =>
  unwrapResponseData<T>(rawPatch<ApiResponse<T>, RawApiResponse<T>, D>(url, data, config))

service.postForm = <T = unknown, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig<D>,
) => unwrapResponseData<T>(rawPostForm<ApiResponse<T>, RawApiResponse<T>, D>(url, data, config))

service.putForm = <T = unknown, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig<D>,
) => unwrapResponseData<T>(rawPutForm<ApiResponse<T>, RawApiResponse<T>, D>(url, data, config))

service.patchForm = <T = unknown, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig<D>,
) => unwrapResponseData<T>(rawPatchForm<ApiResponse<T>, RawApiResponse<T>, D>(url, data, config))

export default service
