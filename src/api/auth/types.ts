/**
 * 登录请求 DTO。
 * 对应后端 `LoginRequest`，`account` 同时支持用户名或邮箱，前端不能拆成两个独立字段发送。
 */
export interface LoginRequest {
  account: string
  password: string
}

/**
 * 登录/注册成功后的认证结果。
 * 后端成功时已经由请求层解包为业务 `data`，这里直接描述令牌与用户身份信息。
 */
export interface AuthResult {
  userId: string
  username: string
  role: string
  accessToken: string
  refreshToken: string
}

/**
 * 注册请求 DTO。
 * 对应后端 `RegisterRequest`，注册成功后直接返回认证结果而不是仅返回布尔值。
 */
export interface RegisterRequest {
  username: string
  password: string
  email: string
  realName: string
  phone: string
}

/**
 * 当前登录用户资料。
 * 对应后端 `CurrentUserResponse`，供鉴权、个人中心与菜单权限判断复用。
 */
export interface CurrentUserResponse {
  userId: string
  username: string
  email: string
  realName: string
  phone: string
  role: string
}

/**
 * 更新个人资料请求。
 * 后端仅允许修改真实姓名与手机号，邮箱和用户名不应通过该接口提交。
 */
export interface UpdateProfileRequest {
  realName: string
  phone: string
}

/**
 * 修改密码请求。
 * 需要同时携带旧密码与新密码，避免服务端无法执行历史密码与身份校验。
 */
export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
}

/**
 * 发送重置验证码请求。
 * 密码找回按邮箱发送验证码，字段名必须与后端 `email` 保持一致。
 */
export interface SendVerificationCodeRequest {
  email: string
}

/**
 * 重置密码请求。
 * 验证码与新密码一起提交，避免前端自行拼装旧口径字段名。
 */
export interface ResetPasswordRequest {
  email: string
  verificationCode: string
  newPassword: string
}
