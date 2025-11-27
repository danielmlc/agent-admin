<template>
  <div class="login-container">
    <div class="login-box">
      <h1 class="login-title">XXXXX管理系统</h1>

      <el-tabs v-model="activeTab" class="login-tabs">
        <!-- 账号密码登录 -->
        <el-tab-pane label="账号密码登录" name="password">
          <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" class="login-form">
            <el-form-item prop="username">
              <el-input
                v-model="passwordForm.username"
                placeholder="请输入您的用户名/邮箱"
                size="large"
                :prefix-icon="User"
              />
            </el-form-item>

            <el-form-item prop="password">
              <el-input
                v-model="passwordForm.password"
                type="password"
                placeholder="请输入您的密码"
                size="large"
                :prefix-icon="Lock"
                show-password
              />
              <div class="forgot-password">
                <a href="#" @click.prevent="handleForgotPassword">忘记密码?</a>
              </div>
            </el-form-item>

            <el-form-item v-if="showCaptcha" prop="captchaCode" class="captcha-item">
              <div class="captcha-input-wrapper">
                <el-input
                  v-model="passwordForm.captchaCode"
                  placeholder="请输入验证码"
                  size="large"
                  style="flex: 1"
                />
                <div class="captcha-image" @click="refreshCaptcha" v-loading="captchaLoading">
                  <div v-if="captchaImage" v-html="captchaImage"></div>
                  <span v-else class="captcha-placeholder">点击获取</span>
                </div>
              </div>
            </el-form-item>

            <el-form-item>
              <el-checkbox v-model="rememberMe">记住我</el-checkbox>
            </el-form-item>

            <el-button
              type="primary"
              size="large"
              :loading="loginLoading"
              @click="handlePasswordLogin"
              class="login-button"
            >
              登 录
            </el-button>
          </el-form>
        </el-tab-pane>

        <!-- 手机号登录 -->
        <el-tab-pane label="手机号登录" name="sms">
          <el-form :model="smsForm" :rules="smsRules" ref="smsFormRef" class="login-form">
            <el-form-item prop="phone">
              <el-input
                v-model="smsForm.phone"
                placeholder="请输入手机号"
                size="large"
                :prefix-icon="Iphone"
              />
            </el-form-item>

            <el-form-item prop="smsCode">
              <div class="sms-code-wrapper">
                <el-input
                  v-model="smsForm.smsCode"
                  placeholder="请输入验证码"
                  size="large"
                  style="flex: 1"
                />
                <el-button
                  size="large"
                  :disabled="smsCountdown > 0"
                  @click="handleSendSms"
                  class="sms-button"
                >
                  {{ smsCountdown > 0 ? `${smsCountdown}秒后重试` : '获取验证码' }}
                </el-button>
              </div>
            </el-form-item>

            <el-button
              type="primary"
              size="large"
              :loading="loginLoading"
              @click="handleSmsLogin"
              class="login-button"
            >
              登 录
            </el-button>
          </el-form>
        </el-tab-pane>

        <!-- 扫码登录 -->
        <!-- <el-tab-pane label="扫码登录" name="qrcode">
          <div class="qrcode-login">
            <div class="qrcode-placeholder">
              <el-icon :size="80"><QrCode /></el-icon>
              <p>扫码登录功能开发中...</p>
            </div>
          </div>
        </el-tab-pane> -->
      </el-tabs>

      <!-- 图形验证码弹窗 -->
      <el-dialog
        v-model="showCaptchaDialog"
        title="发送短信验证码"
        width="350px"
        :close-on-click-modal="false"
      >
        <div class="captcha-dialog-content">
          <p class="captcha-tip">请输入图形验证码</p>
          <div class="captcha-input-wrapper" style="padding-left: 10px;">
            <el-input
              v-model="dialogCaptchaCode"
              placeholder="请输入验证码"
              size="large"
              style="flex: 1"
              @keyup.enter="confirmSendSms"
            />
            <div class="captcha-image" @click="refreshCaptcha" v-loading="captchaLoading">
              <div v-if="captchaImage" v-html="captchaImage"></div>
            </div>
          </div>
        </div>
        <template #footer>
          <el-button @click="showCaptchaDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmSendSms">确定</el-button>
        </template>
      </el-dialog>

      <!-- 第三方登录 -->
      <div class="third-party-login">
        <div class="divider">
          <span>第三方登录</span>
        </div>
        <div class="third-party-icons">
          <div class="icon-item wechat-icon" @click="handleWechatLogin" title="微信登录">
            <el-icon :size="24"><ChatDotRound /></el-icon>
          </div>
          <div class="icon-item github-icon" @click="handleGithubLogin" title="GitHub登录">
            <svg viewBox="0 0 1024 1024" class="github-svg">
              <path d="M512 42.666667A464.64 464.64 0 0 0 42.666667 502.186667 460.373333 460.373333 0 0 0 363.52 938.666667c23.466667 4.266667 32-9.813333 32-22.186667v-78.08c-130.56 27.733333-158.293333-61.44-158.293333-61.44a122.026667 122.026667 0 0 0-52.053334-67.413333c-42.666667-28.16 3.413333-27.733333 3.413334-27.733334a98.56 98.56 0 0 1 71.68 47.36 101.12 101.12 0 0 0 136.533333 37.973334 99.413333 99.413333 0 0 1 29.866667-61.44c-104.106667-11.52-213.333333-50.773333-213.333334-226.986667a177.066667 177.066667 0 0 1 47.36-124.16 161.28 161.28 0 0 1 4.693334-121.173333s39.68-12.373333 128 46.933333a455.68 455.68 0 0 1 234.666666 0c89.6-59.306667 128-46.933333 128-46.933333a161.28 161.28 0 0 1 4.693334 121.173333A177.066667 177.066667 0 0 1 810.666667 477.866667c0 176.64-110.08 215.466667-213.333334 226.986666a106.666667 106.666667 0 0 1 32 85.333334v125.866666c0 14.933333 8.533333 26.88 32 22.186667A460.8 460.8 0 0 0 981.333333 502.186667 464.64 464.64 0 0 0 512 42.666667" fill="currentColor"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Lock, Iphone, QrCode, ChatDotRound } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { authApi } from './api'

// 当前选中的标签页
const activeTab = ref('password')

// 记住我
const rememberMe = ref(false)

// 登录加载状态
const loginLoading = ref(false)

// 验证码相关
const captchaImage = ref('')
const captchaId = ref('')
const captchaLoading = ref(false)
const showCaptcha = ref(false) // 是否显示验证码输入框
const loginFailCount = ref(0) // 登录失败次数

// 验证码弹窗
const showCaptchaDialog = ref(false)
const dialogCaptchaCode = ref('')

// 短信验证码倒计时
const smsCountdown = ref(0)
let smsTimer: number | null = null

// 表单引用
const passwordFormRef = ref<FormInstance>()
const smsFormRef = ref<FormInstance>()

// 账号密码登录表单
const passwordForm = reactive({
  username: '',
  password: '',
  captchaCode: ''
})

// 手机号登录表单
const smsForm = reactive({
  phone: '',
  smsCode: ''
})

// 表单验证规则
const passwordRules = reactive<FormRules>({
  username: [
    { required: true, message: '请输入用户名/邮箱', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  captchaCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' }
  ]
})

const smsRules = reactive<FormRules>({
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  smsCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码长度为6位', trigger: 'blur' }
  ]
})

// 获取验证码
const getCaptcha = async () => {
  try {
    captchaLoading.value = true
    const res = await authApi.getCaptcha()
    captchaImage.value = res.data.result.image
    captchaId.value = res.data.result.id
  } catch (error: any) {
    ElMessage.error(error.message || '获取验证码失败')
  } finally {
    captchaLoading.value = false
  }
}

// 刷新验证码
const refreshCaptcha = () => {
  getCaptcha()
}

// 检查登录失败次数
const checkLoginFailCount = async (username: string) => {
  if (!username) {
    showCaptcha.value = false
    return
  }

  try {
    const res = await authApi.getLoginFailCount(username)
    loginFailCount.value = res.data.result.count
    showCaptcha.value = res.data.result.requireCaptcha

    // 如果需要验证码，自动获取
    if (showCaptcha.value && !captchaImage.value) {
      await getCaptcha()
    }
  } catch (error: any) {
    console.error('检查登录失败次数失败:', error)
  }
}

// 监听用户名变化
watch(() => passwordForm.username, (newUsername) => {
  checkLoginFailCount(newUsername)
})

// 发送短信验证码
const handleSendSms = async () => {
  if (!smsForm.phone) {
    ElMessage.warning('请先输入手机号')
    return
  }

  if (!/^1[3-9]\d{9}$/.test(smsForm.phone)) {
    ElMessage.warning('手机号格式不正确')
    return
  }

  // 先获取图形验证码
  if (!captchaId.value) {
    await getCaptcha()
  }

  // 打开验证码弹窗
  dialogCaptchaCode.value = ''
  showCaptchaDialog.value = true
}

// 确认发送短信
const confirmSendSms = async () => {
  if (!dialogCaptchaCode.value) {
    ElMessage.warning('请输入验证码')
    return
  }

  try {
    await authApi.sendSmsCode({
      phone: smsForm.phone,
      captchaId: captchaId.value,
      captchaCode: dialogCaptchaCode.value
    })

    ElMessage.success('验证码发送成功')
    showCaptchaDialog.value = false

    // 开始倒计时
    smsCountdown.value = 60
    smsTimer = setInterval(() => {
      smsCountdown.value--
      if (smsCountdown.value <= 0 && smsTimer) {
        clearInterval(smsTimer)
        smsTimer = null
      }
    }, 1000) as any

    // 刷新图形验证码
    await getCaptcha()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '发送验证码失败')
    // 刷新图形验证码
    await getCaptcha()
  }
}

// 账号密码登录
const handlePasswordLogin = async () => {
  if (!passwordFormRef.value) return

  await passwordFormRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      loginLoading.value = true
      // 构建登录请求参数
      const loginData: any = {
        username: passwordForm.username,
        password: passwordForm.password
      }

      // 只在需要验证码时才传递验证码参数
      if (showCaptcha.value) {
        loginData.captchaId = captchaId.value
        loginData.captchaCode = passwordForm.captchaCode
      }

      const res = await authApi.loginByUsername(loginData)
      console.log('login', res)
      // 保存 token
      localStorage.setItem('access_token', res.data.result.accessToken)
      localStorage.setItem('refresh_token', res.data.result.refreshToken)

      if (rememberMe.value) {
        localStorage.setItem('remember_username', passwordForm.username)
      } else {
        localStorage.removeItem('remember_username')
      }

      ElMessage.success('登录成功')

      // 跳转到首页
      setTimeout(() => {
        window.location.href = '/home.html'
      }, 500)
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || '登录失败')

      // 登录失败后重新检查失败次数
      await checkLoginFailCount(passwordForm.username)

      // 如果显示验证码，刷新验证码并清空输入
      if (showCaptcha.value) {
        await getCaptcha()
        passwordForm.captchaCode = ''
      }
    } finally {
      loginLoading.value = false
    }
  })
}

// 手机号登录
const handleSmsLogin = async () => {
  if (!smsFormRef.value) return

  await smsFormRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      loginLoading.value = true
      const res = await authApi.loginBySms({
        phone: smsForm.phone,
        smsCode: smsForm.smsCode
      })

      // 保存 token
      localStorage.setItem('access_token', res.data.result.accessToken)
      localStorage.setItem('refresh_token', res.data.result.refreshToken)

      ElMessage.success('登录成功')

      // 跳转到首页
      setTimeout(() => {
        window.location.href = '/home.html'
      }, 500)
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || '登录失败')
      smsForm.smsCode = ''
    } finally {
      loginLoading.value = false 
    }
  })
}

// 忘记密码
const handleForgotPassword = () => {
  ElMessage.info('请联系管理员重置密码')
}

// 微信登录
const handleWechatLogin = () => {
  ElMessage.info('微信登录功能开发中...')
}

// GitHub 登录
const handleGithubLogin = () => {
  // 跳转到后端 GitHub OAuth 授权端点
  window.location.href = 'http://localhost:3001/api/auth/oauth/github'
}

// 组件挂载时获取验证码
onMounted(() => {
  getCaptcha()

  // 如果之前记住了用户名，自动填充
  const rememberedUsername = localStorage.getItem('remember_username')
  if (rememberedUsername) {
    passwordForm.username = rememberedUsername
    rememberMe.value = true
  }
})

// 组件卸载时清除定时器
onBeforeUnmount(() => {
  if (smsTimer) {
    clearInterval(smsTimer)
  }
})
</script>

<style lang="less" scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 450px;
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.login-title {
  text-align: center;
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0 0 30px;
}

.login-tabs {
  :deep(.el-tabs__nav-wrap::after) {
    display: none;
  }

  :deep(.el-tabs__item) {
    font-size: 15px;
    padding: 0 10px;
  }

  :deep(.el-tabs__active-bar) {
    background-color: #409eff;
  }
}

.login-form {
  margin-top: 30px;
}

.captcha-item {
  :deep(.el-form-item__content) {
    flex-direction: column;
    align-items: stretch;
  }
}

.captcha-input-wrapper {
  display: flex;
  gap: 10px;
  align-items: center;
  padding-ri: 5%;
  padding-left: 0px;
}

.captcha-image {
  width: 100px;
  height: 40px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;

  .captcha-placeholder {
    font-size: 12px;
    color: #909399;
  }

  :deep(svg) {
    width: 100%;
    height: 100%;
  }
}

.forgot-password {
  text-align: right;
  margin-top: 5px;

  a {
    font-size: 13px;
    color: #409eff;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.sms-code-wrapper {
  display: flex;
  gap: 10px;
}

.sms-button {
  width: 120px;
  flex-shrink: 0;
}

.login-button {
  width: 100%;
  margin-top: 10px;
  height: 44px;
  font-size: 16px;
}

.qrcode-login {
  padding: 40px 0;
}

.qrcode-placeholder {
  text-align: center;
  color: #909399;

  p {
    margin-top: 20px;
    font-size: 14px;
  }
}

.third-party-login {
  margin-top: 30px;
}

.divider {
  text-align: center;
  position: relative;
  margin: 20px 0;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 1px;
    background: #e4e7ed;
  }

  span {
    position: relative;
    background: white;
    padding: 0 15px;
    color: #909399;
    font-size: 13px;
  }
}

.third-party-icons {
  display: flex;
  justify-content: center;
  gap: 30px;
}

.icon-item {
  width: 40px;
  height: 40px;
  border: 1px solid #e4e7ed;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  flex-shrink: 0;

  &:hover {
    border-color: #409eff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
  }

  .github-svg {
    width: 24px;
    height: 24px;
    display: block;
  }

  :deep(.el-icon) {
    font-size: 24px;
  }
}

.wechat-icon {
  color: #00D504;
}

.github-icon {
  color: #191717;
}

// 验证码弹窗样式
.captcha-dialog-content {
  .captcha-tip {
    margin-bottom: 16px;
    color: #606266;
    font-size: 14px;
    padding: 10px;
  }
}
</style>