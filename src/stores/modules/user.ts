import { defineStore } from 'pinia'

import * as roleApi from '@/api/roles'
import * as userApi from '@/api/users'
import { UserRole } from '@/enums/UserRole'

interface UserStoreState {
  roleList: roleApi.RoleResponse[]
  currentRolePermissionTree: roleApi.RolePermissionTreeModuleResponse[]
  selectedRoleId: string
  reservationTargetUsers: userApi.UserListItemResponse[]
  adminUserList: userApi.UserListItemResponse[]
  adminUserTotal: number
  adminUserQuery: userApi.UserListQuery
  currentManagedUser: ManagedUserSnapshot | null
  lastPermissionUpdate: {
    roleId: string
    permissionIds: string[]
    updatedAt: string
  } | null
  pendingRequestCount: number
  loading: boolean
  detailLoading: boolean
  detailRequestVersion: number
  rolePermissionLoading: boolean
  rolePermissionRequestVersion: number
}

type ManagedUserSnapshot = Partial<userApi.UserAdminResponse & userApi.UserDetailResponse> & {
  username: string
  status: number
  freezeStatus: userApi.FreezeUserRequest['freezeStatus']
  roleId: string
  userId?: string
  id?: string
}

function startListLoading(state: UserStoreState) {
  state.pendingRequestCount += 1
  state.loading = true
}

/**
 * 用户管理域存在角色列表、后台列表、代预约列表等并发请求。
 * 这里使用计数器收口加载态，避免某一个较快请求先结束时把另一个仍在进行的请求错误地显示为已完成。
 */
function finishListLoading(state: UserStoreState) {
  state.pendingRequestCount = Math.max(0, state.pendingRequestCount - 1)
  state.loading = state.pendingRequestCount > 0
}

function resolveManagedUserId(user: Partial<ManagedUserSnapshot>): string | null {
  if ('id' in user && typeof user.id === 'string') {
    return user.id
  }

  if ('userId' in user && typeof user.userId === 'string') {
    return user.userId
  }

  return null
}

function normalizeRoleName(roleName: string | undefined): UserRole | undefined {
  if (roleName === UserRole.USER) {
    return UserRole.USER
  }

  if (roleName === UserRole.DEVICE_ADMIN) {
    return UserRole.DEVICE_ADMIN
  }

  if (roleName === UserRole.SYSTEM_ADMIN) {
    return UserRole.SYSTEM_ADMIN
  }

  return undefined
}

/**
 * 管理动作接口返回的是最小回显，但用户列表需要立刻看到禁用、冻结、角色变更结果。
 * 因此这里统一按 UUID 回写已有行，避免管理员操作后还要手动刷新才能确认结果。
 */
function syncAdminUserList(
  adminUserList: userApi.UserListItemResponse[],
  payload: Partial<ManagedUserSnapshot>,
  roleList: roleApi.RoleResponse[],
) {
  const managedUserId = resolveManagedUserId(payload)

  if (!managedUserId) {
    return adminUserList
  }

  const resolvedRoleName =
    normalizeRoleName('roleName' in payload ? payload.roleName : undefined) ||
    normalizeRoleName(roleList.find((role) => role.id === payload.roleId)?.name) ||
    undefined

  return adminUserList.map((user) => {
    if (user.id !== managedUserId) {
      return user
    }

    return {
      ...user,
      username: payload.username ?? user.username,
      status: payload.status ?? user.status,
      freezeStatus: payload.freezeStatus ?? user.freezeStatus,
      roleId: payload.roleId ?? user.roleId,
      roleName: resolvedRoleName ?? user.roleName,
    }
  })
}

/**
 * 角色列表刷新后，需要把后台用户列表里已有的 `roleId` 重新映射成最新角色名称。
 * 这样即使用户管理接口的管理动作只回显 `roleId`，列表列也能立即显示正确中文角色语义。
 */
function syncAdminUserRoleNames(
  adminUserList: userApi.UserListItemResponse[],
  roleList: roleApi.RoleResponse[],
) {
  if (!roleList.length) {
    return adminUserList
  }

  return adminUserList.map((user) => ({
    ...user,
    roleName:
      normalizeRoleName(roleList.find((role) => role.id === user.roleId)?.name) ?? user.roleName,
  }))
}

/**
 * 权限树保存使用的是“整体覆盖”语义。
 * 因此保存成功后需要立即把当前树的 `selected` 回写为最新结果，避免管理员误以为保存没有生效。
 */
function syncRolePermissionTreeSelection(
  modules: roleApi.RolePermissionTreeModuleResponse[],
  permissionIds: string[],
) {
  const selectedPermissionIds = new Set(permissionIds)

  return modules.map((moduleItem) => ({
    ...moduleItem,
    permissions: moduleItem.permissions.map((permission) => ({
      ...permission,
      selected: selectedPermissionIds.has(permission.permissionId),
    })),
  }))
}

function createDefaultState(): UserStoreState {
  return {
    roleList: [],
    currentRolePermissionTree: [],
    selectedRoleId: '',
    reservationTargetUsers: [],
    adminUserList: [],
    adminUserTotal: 0,
    adminUserQuery: { page: 1, size: 10 },
    currentManagedUser: null,
    lastPermissionUpdate: null,
    pendingRequestCount: 0,
    loading: false,
    detailLoading: false,
    detailRequestVersion: 0,
    rolePermissionLoading: false,
    rolePermissionRequestVersion: 0,
  }
}

/**
 * 用户管理域状态。
 * 当前后端把用户管理与角色授权都归在 `USER_AUTH` 域，因此这里统一承接“用户列表 + 角色列表”基础状态；
 * 具体的页面级重置仍拆成用户管理与角色授权两个方向，避免一个页面清理上下文时误伤另一个页面。
 */
export const useUserStore = defineStore('user', {
  state: (): UserStoreState => createDefaultState(),

  actions: {
    /**
     * 角色列表是系统管理员配置入口的前置数据，必须与真实角色接口保持一致，不能自行拼权限树。
     */
    async fetchRoleList() {
      startListLoading(this)

      try {
        const roleList = await roleApi.getRoleList()
        this.roleList = roleList
        this.adminUserList = syncAdminUserRoleNames(this.adminUserList, roleList)
        return roleList
      } finally {
        finishListLoading(this)
      }
    },

    /**
     * 代预约只能指向普通用户。
     * Store 在读取后立即过滤非 USER 角色，避免创建页把系统管理员或设备管理员误暴露成可预约目标。
     */
    async fetchReservationTargetUsers(query: userApi.UserListQuery = { page: 1, size: 100 }) {
      startListLoading(this)

      try {
        const result = await userApi.getUserList(query)
        this.reservationTargetUsers = result.records.filter((user) => user.roleName === 'USER')
        return this.reservationTargetUsers
      } finally {
        finishListLoading(this)
      }
    },

    /**
     * 后台用户列表只服务系统管理员。
     * Store 保存最后一次查询条件，便于列表页在冻结、禁用、分配角色后按同一分页口径继续展示结果。
     */
    async fetchAdminUserList(query: userApi.UserListQuery = { page: 1, size: 10 }) {
      startListLoading(this)

      try {
        const result = await userApi.getUserList(query)
        this.adminUserList = result.records
        this.adminUserTotal = result.total
        this.adminUserQuery = { ...query }
        return result
      } finally {
        finishListLoading(this)
      }
    },

    /**
     * 用户详情页需要完整风险信息，因此单独缓存详情快照，避免列表页只拿最小字段时误渲染为空。
     */
    async fetchUserDetail(userId: string) {
      const requestVersion = this.detailRequestVersion + 1
      this.detailRequestVersion = requestVersion
      this.detailLoading = true
      this.currentManagedUser = null

      try {
        const user = await userApi.getUserDetail(userId)
        if (requestVersion !== this.detailRequestVersion) {
          return user
        }

        this.setCurrentManagedUser(user)
        return user
      } catch (error) {
        if (requestVersion === this.detailRequestVersion) {
          this.currentManagedUser = null
        }

        throw error
      } finally {
        if (requestVersion === this.detailRequestVersion) {
          this.detailLoading = false
        }
      }
    },

    /**
     * 角色权限树必须按当前选中角色实时拉取。
     * 这里引入请求版本保护，避免管理员快速切换角色时旧请求晚到，把新角色的权限树覆盖掉。
     */
    async fetchRolePermissionTree(roleId: string) {
      const requestVersion = this.rolePermissionRequestVersion + 1
      this.rolePermissionRequestVersion = requestVersion
      this.selectedRoleId = roleId
      this.rolePermissionLoading = true

      try {
        const tree = await roleApi.getRolePermissionTree(roleId)

        if (
          requestVersion !== this.rolePermissionRequestVersion ||
          roleId !== this.selectedRoleId
        ) {
          return tree
        }

        this.currentRolePermissionTree = tree
        return tree
      } finally {
        if (requestVersion === this.rolePermissionRequestVersion) {
          this.rolePermissionLoading = false
        }
      }
    },

    /**
     * 用户详情切换到新用户前必须先清空旧快照。
     * 否则在新请求尚未返回或请求失败时，页面会短暂展示上一个人的信息，形成陈旧状态泄漏。
     */
    resetCurrentManagedUser() {
      this.detailRequestVersion += 1
      this.detailLoading = false
      this.currentManagedUser = null
    },

    /**
     * 管理动作都以最后一次后端回显作为当前操作上下文，供页面抽屉或提示条复用。
     */
    setCurrentManagedUser(user: ManagedUserSnapshot) {
      this.currentManagedUser = user
      this.adminUserList = syncAdminUserList(this.adminUserList, user, this.roleList)
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
        updatedAt: new Date().toISOString(),
      }

      if (this.selectedRoleId === roleId) {
        this.currentRolePermissionTree = syncRolePermissionTreeSelection(
          this.currentRolePermissionTree,
          payload.permissionIds,
        )
      }
    },

    /**
     * 用户管理页自己的筛选、详情和加载态需要支持单独重置。
     * 这样不会把角色授权页正在使用的角色列表与权限树一起清空，减少跨页面隐式耦合。
     */
    resetUserManagementState() {
      this.reservationTargetUsers = []
      this.adminUserList = []
      this.adminUserTotal = 0
      this.adminUserQuery = { page: 1, size: 10 }
      this.pendingRequestCount = 0
      this.loading = false
      this.resetCurrentManagedUser()
    },

    /**
     * 角色权限页离开时只清理授权上下文，不影响用户管理页基础列表。
     */
    resetRolePermissionState() {
      this.selectedRoleId = ''
      this.currentRolePermissionTree = []
      this.lastPermissionUpdate = null
      this.rolePermissionLoading = false
      this.rolePermissionRequestVersion += 1
    },

    /**
     * 兼容现有调用方的统一重置入口。
     * 当前默认只重置用户管理上下文，避免把角色授权页共享的角色基础数据一起擦掉。
     */
    resetState() {
      this.resetUserManagementState()
    },
  },
})
