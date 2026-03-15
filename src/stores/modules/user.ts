import { defineStore } from 'pinia'

import * as roleApi from '@/api/roles'
import * as userApi from '@/api/users'

interface UserStoreState {
  roleList: roleApi.RoleResponse[]
  currentManagedUser: userApi.UserAdminResponse | null
  lastPermissionUpdate: {
    roleId: string
    permissionIds: string[]
  } | null
  loading: boolean
}

function createDefaultState(): UserStoreState {
  return {
    roleList: [],
    currentManagedUser: null,
    lastPermissionUpdate: null,
    loading: false,
  }
}

/**
 * 用户管理域状态。
 * 后端当前没有提供用户列表读取能力，因此这里只承接真实存在的角色列表、状态修改、角色修改和冻结处理结果。
 */
export const useUserStore = defineStore('user', {
  state: (): UserStoreState => createDefaultState(),

  actions: {
    /**
     * 角色列表是系统管理员配置入口的前置数据，必须与真实角色接口保持一致，不能自行拼权限树。
     */
    async fetchRoleList() {
      this.loading = true

      try {
        const roleList = await roleApi.getRoleList()
        this.roleList = roleList
        return roleList
      } finally {
        this.loading = false
      }
    },

    /**
     * 管理动作都以最后一次后端回显作为当前操作上下文，供页面抽屉或提示条复用。
     */
    setCurrentManagedUser(user: userApi.UserAdminResponse) {
      this.currentManagedUser = user
    },

    /**
     * 用户状态采用后端真实数字口径，前端不擅自改成字符串枚举，避免联调时语义错位。
     */
    async updateUserStatus(userId: string, payload: userApi.UpdateUserStatusRequest) {
      const user = await userApi.updateUserStatus(userId, payload)
      this.setCurrentManagedUser(user)
      return user
    },

    /**
     * 角色修改必须提交 roleId，Store 负责透传并保存最新结果，便于后续操作确认回显。
     */
    async updateUserRole(userId: string, payload: userApi.UpdateUserRoleRequest) {
      const user = await userApi.updateUserRole(userId, payload)
      this.setCurrentManagedUser(user)
      return user
    },

    /**
     * 冻结操作单独走后端专用接口，避免页面错误把冻结视为普通字段编辑。
     */
    async freezeUser(userId: string, payload: userApi.FreezeUserRequest) {
      const user = await userApi.freezeUser(userId, payload)
      this.setCurrentManagedUser(user)
      return user
    },

    /**
     * 角色权限更新当前只有写接口，因此仅保留最后一次成功提交的上下文，供页面提示“已保存”使用。
     */
    async updateRolePermissions(roleId: string, payload: roleApi.UpdateRolePermissionsRequest) {
      await roleApi.updateRolePermissions(roleId, payload)
      this.lastPermissionUpdate = {
        roleId,
        permissionIds: [...payload.permissionIds],
      }
    },

    /**
     * 用户管理页切换上下文时清空上一次操作结果，避免把别人的冻结结果误显示到新用户上。
     */
    resetState() {
      Object.assign(this, createDefaultState())
    },
  },
})
