import { defineStore } from 'pinia'

import * as roleApi from '@/api/roles'
import * as userApi from '@/api/users'

interface UserStoreState {
  roleList: roleApi.RoleResponse[]
  reservationTargetUsers: userApi.UserListItemResponse[]
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
    reservationTargetUsers: [],
    currentManagedUser: null,
    lastPermissionUpdate: null,
    loading: false,
  }
}

/**
 * 用户管理域状态。
 * 除系统管理员维护用户外，预约创建页也需要在代预约场景读取 USER 列表，因此把“代预约目标用户”查询一起收口到这里。
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
     * 代预约只能指向普通用户。
     * Store 在读取后立即过滤非 USER 角色，避免创建页把系统管理员或设备管理员误暴露成可预约目标。
     */
    async fetchReservationTargetUsers(query: userApi.UserListQuery = { page: 1, size: 100 }) {
      this.loading = true

      try {
        const result = await userApi.getUserList(query)
        this.reservationTargetUsers = result.records.filter((user) => user.roleName === 'USER')
        return this.reservationTargetUsers
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
