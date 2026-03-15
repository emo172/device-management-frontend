import request from '@/api/request'

import type {
  AuthResult,
  ChangePasswordRequest,
  CurrentUserResponse,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  SendVerificationCodeRequest,
  UpdateProfileRequest,
} from './types'

export type {
  AuthResult,
  ChangePasswordRequest,
  CurrentUserResponse,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  SendVerificationCodeRequest,
  UpdateProfileRequest,
} from './types'

/**
 * 登录。
 * 对应 `POST /api/auth/login`，请求层会直接返回业务 `data`，这里不再包装 `ApiResponse`。
 */
export function login(data: LoginRequest) {
  return request.post<AuthResult, LoginRequest>('/auth/login', data)
}

/**
 * 注册。
 * 对应 `POST /api/auth/register`，注册成功后后端直接返回完整令牌集，前端无需二次登录。
 */
export function register(data: RegisterRequest) {
  return request.post<AuthResult, RegisterRequest>('/auth/register', data)
}

/**
 * 查询当前登录用户。
 * 对应 `GET /api/auth/me`，用于页面初始化阶段恢复当前会话身份。
 */
export function getCurrentUser() {
  return request.get<CurrentUserResponse>('/auth/me')
}

/**
 * 更新当前用户资料。
 * 对应 `PUT /api/auth/profile`，仅提交允许修改的资料字段，避免误改认证主键字段。
 */
export function updateProfile(data: UpdateProfileRequest) {
  return request.put<CurrentUserResponse, UpdateProfileRequest>('/auth/profile', data)
}

/**
 * 修改当前用户密码。
 * 对应 `POST /api/auth/change-password`，成功后后端仅返回空业务体。
 */
export function changePassword(data: ChangePasswordRequest) {
  return request.post<void, ChangePasswordRequest>('/auth/change-password', data)
}

/**
 * 发送密码重置验证码。
 * 对应 `POST /api/auth/verification-code`，验证码发送渠道由后端统一编排。
 */
export function sendVerificationCode(data: SendVerificationCodeRequest) {
  return request.post<void, SendVerificationCodeRequest>('/auth/verification-code', data)
}

/**
 * 使用验证码重置密码。
 * 对应 `POST /api/auth/reset-password`，字段名与后端 DTO 保持一致，避免验证码校验失败。
 */
export function resetPassword(data: ResetPasswordRequest) {
  return request.post<void, ResetPasswordRequest>('/auth/reset-password', data)
}
