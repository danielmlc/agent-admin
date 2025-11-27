<template>
  <div class="oauth-callback-container">
    <div class="callback-card">
      <div class="loading-content" v-if="!error">
        <el-icon class="is-loading" :size="48" color="#409EFF">
          <Loading />
        </el-icon>
        <h2>正在登录...</h2>
        <p>请稍候，我们正在为您完成登录</p>
      </div>

      <div class="error-content" v-else>
        <el-icon :size="48" color="#F56C6C">
          <CircleClose />
        </el-icon>
        <h2>登录失败</h2>
        <p>{{ error }}</p>
        <el-button type="primary" @click="backToLogin">返回登录页</el-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, CircleClose } from '@element-plus/icons-vue'

const router = useRouter()
const error = ref('')

onMounted(() => {
  // 从 URL 中获取 token
  const hash = window.location.hash
  const searchParams = new URLSearchParams(hash.split('?')[1])

  const accessToken = searchParams.get('accessToken')
  const refreshToken = searchParams.get('refreshToken')
  const errorMsg = searchParams.get('error')

  if (errorMsg) {
    // 登录失败
    error.value = decodeURIComponent(errorMsg)
    return
  }

  if (accessToken && refreshToken) {
    // 保存 token 到 localStorage
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)

    ElMessage.success('登录成功！')

    // 延迟跳转到首页
    setTimeout(() => {
      // 跳转到 home 页面（根据实际路由调整）
      window.location.href = '/#/home'
    }, 500)
  } else {
    error.value = '未能获取到登录凭证，请重新登录'
  }
})

const backToLogin = () => {
  window.location.href = '/#/'
}
</script>

<style lang="less" scoped>
.oauth-callback-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.callback-card {
  background: white;
  border-radius: 10px;
  padding: 60px 80px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  text-align: center;
  min-width: 400px;
}

.loading-content,
.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;

  h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #303133;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #909399;
  }
}

.is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
