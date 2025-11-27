import request from '../../utils/request'

// 认证相关接口
export const authApi = {
  // 获取图形验证码
  getCaptcha () {
    return request.get('/auth/captcha')
  },

  // 获取登录失败次数
  getLoginFailCount (username: string) {
    return request.get('/auth/login-fail-count', { params: { username } })
  },

  // 发送短信验证码
  sendSmsCode (data: { phone: string; captchaId: string; captchaCode: string }) {
    return request.post('/auth/send-sms-code', data)
  },

  // 账号密码登录
  loginByUsername (data: {
    username: string
    password: string
    captchaId: string
    captchaCode: string
  }) {
    return request.post('/auth/login/username', data)
  },

  // 手机号登录
  loginBySms (data: { phone: string; smsCode: string }) {
    return request.post('/auth/login/sms', data)
  },

  // 刷新 token
  refreshToken (data: { refreshToken: string }) {
    return request.post('/auth/refresh', data)
  },

  // 登出
  logout () {
    return request.post('/auth/logout')
  },

  // 获取用户信息
  getProfile () {
    return request.get('/auth/profile')
  }
}

// 用户相关接口
export const userApi = {
  // 获取用户列表
  getUserList (params?: any) {
    return request.get('/users', { params })
  },

  // 获取用户详情
  getUserById (id: string) {
    return request.get(`/users/${id}`)
  },

  // 创建用户
  createUser (data: any) {
    return request.post('/users', data)
  },

  // 更新用户
  updateUser (id: string, data: any) {
    return request.patch(`/users/${id}`, data)
  },

  // 删除用户
  deleteUser (id: string) {
    return request.delete(`/users/${id}`)
  }
}