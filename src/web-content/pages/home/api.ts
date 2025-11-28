import request from '../../utils/request'

/**
 * Home 页面相关 API
 * 所有方法暂时只预留，未实现真实调用
 */

export const homeApi = {
  /**
   * 获取仪表盘数据
   */
  getDashboardData () {
    return request.get('/home/dashboard')
  },

  /**
   * 获取统计数据
   */
  getStats () {
    return request.get('/home/stats')
  },

  /**
   * 获取最近活动列表
   */
  getRecentActivities (params?: { limit?: number }) {
    return request.get('/home/activities', { params })
  },

  /**
   * 获取通知列表
   */
  getNotifications (params?: { page?: number; pageSize?: number }) {
    return request.get('/home/notifications', { params })
  },

  /**
   * 标记通知为已读
   */
  markNotificationRead (id: string) {
    return request.put(`/home/notifications/${id}/read`)
  },

  /**
   * 获取用户个人资料
   */
  getUserProfile () {
    return request.get('/auth/profile')
  },

  /**
   * 更新用户个人资料
   */
  updateUserProfile (data: any) {
    return request.put('/user/profile', data)
  },

  /**
   * 修改密码
   */
  changePassword (data: { oldPassword: string; newPassword: string }) {
    return request.put('/users/change-password', data)
  },

  /**
   * 退出登录
   */
  logout () {
    return request.post('/auth/logout')
  },

  /**
   * 获取用户列表
   */
  getUserList (params?: { keyword?: string; status?: string; page?: number; pageSize?: number }) {
    return request.get('/users', { params })
  },

  /**
   * 获取用户详情
   */
  getUserDetail (id: string) {
    return request.get(`/users/${id}`)
  },

  /**
   * 创建用户
   */
  createUser (data: any) {
    return request.post('/users', data)
  },

  /**
   * 更新用户
   */
  updateUser (id: string, data: any) {
    return request.patch(`/users/${id}`, data)
  },

  /**
   * 删除用户
   */
  deleteUser (id: string) {
    return request.delete(`/users/${id}`)
  },

  /**
   * 重置用户密码
   */
  resetUserPassword (id: string, newPassword: string) {
    return request.put(`/users/${id}/reset-password`, { newPassword })
  },

  /**
   * 创建新任务
   */
  createTask (data: any) {
    return request.post('/tasks', data)
  },

  /**
   * 获取任务列表
   */
  getTasks (params?: { status?: string; page?: number; pageSize?: number }) {
    return request.get('/tasks', { params })
  },

  /**
   * 更新任务
   */
  updateTask (id: string, data: any) {
    return request.put(`/tasks/${id}`, data)
  },

  /**
   * 删除任务
   */
  deleteTask (id: string) {
    return request.delete(`/tasks/${id}`)
  },

  /**
   * 创建日程
   */
  createSchedule (data: any) {
    return request.post('/schedules', data)
  },

  /**
   * 获取日程列表
   */
  getSchedules (params?: { startDate?: string; endDate?: string }) {
    return request.get('/schedules', { params })
  },

  /**
   * 更新日程
   */
  updateSchedule (id: string, data: any) {
    return request.put(`/schedules/${id}`, data)
  },

  /**
   * 删除日程
   */
  deleteSchedule (id: string) {
    return request.delete(`/schedules/${id}`)
  },

  /**
   * 创建客户
   */
  createClient (data: any) {
    return request.post('/clients', data)
  },

  /**
   * 获取客户列表
   */
  getClients (params?: { page?: number; pageSize?: number; keyword?: string }) {
    return request.get('/clients', { params })
  },

  /**
   * 获取客户详情
   */
  getClientDetail (id: string) {
    return request.get(`/clients/${id}`)
  },

  /**
   * 更新客户信息
   */
  updateClient (id: string, data: any) {
    return request.put(`/clients/${id}`, data)
  },

  /**
   * 删除客户
   */
  deleteClient (id: string) {
    return request.delete(`/clients/${id}`)
  },

  /**
   * 获取数据分析报表
   */
  getAnalytics (params?: { startDate?: string; endDate?: string; type?: string }) {
    return request.get('/analytics', { params })
  },

  /**
   * 导出数据报表
   */
  exportAnalytics (params?: { startDate?: string; endDate?: string; format?: string }) {
    return request.get('/analytics/export', { params, responseType: 'blob' })
  },

  /**
   * 获取系统设置
   */
  getSettings () {
    return request.get('/settings')
  },

  /**
   * 更新系统设置
   */
  updateSettings (data: any) {
    return request.put('/settings', data)
  },

  /**
   * 获取登录日志
   */
  getLoginLogs (params?: { status?: string; loginType?: string; page?: number; pageSize?: number }) {
    return request.get('/auth/login-logs', { params })
  },

  /**
   * 获取刷新Token列表
   */
  getRefreshTokens () {
    return request.get('/auth/refresh-tokens')
  },

  /**
   * 撤销指定的刷新Token
   */
  revokeRefreshToken (tokenId: string) {
    return request.delete(`/auth/refresh-tokens/${tokenId}`)
  },

  /**
   * 撤销所有刷新Token（除当前）
   */
  revokeAllRefreshTokens () {
    return request.delete('/auth/refresh-tokens')
  },

  /**
   * 获取配置组列表
   */
  getConfigGroups () {
    return request.get('/configs/groups')
  },

  /**
   * 获取全局配置列表
   */
  getGlobalConfigs (params?: { group?: string; page?: number; pageSize?: number }) {
    return request.get('/configs/global', { params })
  },

  /**
   * 创建全局配置
   */
  createGlobalConfig (data: any) {
    return request.post('/configs/global', data)
  },

  /**
   * 更新全局配置
   */
  updateGlobalConfig (id: string, data: any) {
    return request.put(`/configs/global/${id}`, data)
  },

  /**
   * 删除全局配置
   */
  deleteGlobalConfig (id: string) {
    return request.delete(`/configs/global/${id}`)
  },

  /**
   * 获取用户配置列表
   */
  getUserConfigs (params?: { group?: string }) {
    return request.get('/configs/user', { params })
  },

  /**
   * 获取单个用户配置
   */
  getUserConfig (group: string, key: string) {
    return request.get(`/configs/user/${group}/${key}`)
  },

  /**
   * 设置用户配置
   */
  setUserConfig (group: string, key: string, data: { value: string; valueType: string }) {
    return request.put(`/configs/user/${group}/${key}`, data)
  },

  /**
   * 删除用户配置（恢复默认）
   */
  deleteUserConfig (group: string, key: string) {
    return request.delete(`/configs/user/${group}/${key}`)
  },

  /**
   * 获取公开配置
   */
  getPublicConfigs () {
    return request.get('/configs/public')
  },

  /**
   * 角色和权限管理 API
   */

  // 获取所有角色
  getRoles () {
    return request.get('/roles')
  },

  // 获取角色详情
  getRoleDetail (id: string) {
    return request.get(`/roles/${id}`)
  },

  // 创建角色
  createRole (data: { name: string; description?: string; isDefault?: boolean; permissions?: string[] }) {
    return request.post('/roles', data)
  },

  // 更新角色
  updateRole (id: string, data: { name?: string; description?: string; isDefault?: boolean; permissions?: string[] }) {
    return request.patch(`/roles/${id}`, data)
  },

  // 删除角色
  deleteRole (id: string) {
    return request.delete(`/roles/${id}`)
  },

  // 获取所有权限
  getPermissions () {
    return request.get('/roles/permissions/list')
  },

  // 创建权限
  createPermission (data: { code: string; description?: string; resource?: string; action?: string }) {
    return request.post('/roles/permissions', data)
  }
}

