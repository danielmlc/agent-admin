import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

// 创建 axios 实例
const request: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 添加 token
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error) => {
    const { response, config } = error

    // 如果是 401 错误，尝试刷新 token
    if (response?.status === 401 && !config._retry) {
      config._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
          throw new Error('No refresh token')
        }

        // 刷新 token
        const res = await axios.post('/api/auth/refresh', {
          refreshToken
        })

        const newAccessToken = res.data.result.accessToken

        // 保存新的 token
        localStorage.setItem('access_token', newAccessToken)

        // 重试原请求
        config.headers.Authorization = `Bearer ${newAccessToken}`
        return request(config)
      } catch (err) {
        // 刷新失败，清除 token 并跳转到登录页
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login.html'
        return Promise.reject(err)
      }
    }

    return Promise.reject(error)
  }
)

export default request