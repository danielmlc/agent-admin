<template>
  <div class="home-container">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '200px'" class="sidebar">
      <div class="logo-area">
        <div class="logo-icon">G</div>
        <span v-if="!isCollapse" class="logo-text">但以理</span>
        <span v-if="!isCollapse" class="logo-subtext">后台管理</span>
      </div>

      <el-menu
        :default-active="currentRouteName"
        :collapse="isCollapse"
        :collapse-transition="false"
        class="sidebar-menu"
        background-color="#ffffff"
        text-color="#333333"
        active-text-color="#409EFF"
        router
      >
        <el-menu-item index="dashboard">
          <el-icon><Grid /></el-icon>
          <template #title>仪表盘</template>
        </el-menu-item>

        <el-menu-item index="user-management">
          <el-icon><User /></el-icon>
          <template #title>用户管理</template>
        </el-menu-item>

        <el-menu-item index="role-management">
          <el-icon><Lock /></el-icon>
          <template #title>角色权限管理</template>
        </el-menu-item>

        <el-menu-item index="security">
          <el-icon><Lock /></el-icon>
          <template #title>安全管理</template>
        </el-menu-item>
      </el-menu>

      <!-- 系统设置 -->
      <div class="sidebar-footer">
        <el-menu
          :collapse="isCollapse"
          class="sidebar-menu"
          background-color="#ffffff"
          text-color="#333333"
          router
        >
          <el-menu-item index="settings">
            <el-icon><Setting /></el-icon>
            <template #title>系统设置</template>
          </el-menu-item>
        </el-menu>
      </div>
    </el-aside>

    <!-- 主内容区 -->
    <el-container class="main-container">
      <!-- 顶部导航栏 -->
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-icon" @click="toggleSidebar">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <!-- 面包屑导航 -->
          <el-breadcrumb separator="/" class="breadcrumb">
            <el-breadcrumb-item :to="{ name: 'dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentRoute && currentRoute.name !== 'dashboard'">
              {{ currentRoute.meta?.title || currentRoute.name }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <!-- 通知图标 -->
          <el-badge :value="notificationCount" class="notification-badge">
            <el-icon class="header-icon" @click="handleNotification">
              <Bell />
            </el-icon>
          </el-badge>

          <!-- 帮助图标 -->
          <el-icon class="header-icon" @click="handleHelp">
            <QuestionFilled />
          </el-icon>

          <!-- 用户信息 -->
          <el-dropdown @command="handleUserCommand">
            <div class="user-info">
              <el-avatar :size="36" :src="userInfo.avatar" class="user-avatar">
                {{ userInfo.nickname?.charAt(0) || userInfo.username?.charAt(0) || 'U' }}
              </el-avatar>
              <div class="user-details">
                <div class="user-name">{{ userInfo.nickname || userInfo.username }}</div>
                <div class="user-role">{{ userInfo.email || userInfo.phone }}</div>
              </div>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人资料</el-dropdown-item>
                <el-dropdown-item command="settings">账户设置</el-dropdown-item>
                <el-dropdown-item command="changePassword">修改密码</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容 -->
      <el-main class="content-main">
        <router-view v-slot="{ Component }">
          <component :is="Component" :userInfo="userInfo" />
        </router-view>
      </el-main>
    </el-container>

    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="changePasswordDialogVisible"
      title="修改密码"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="changePasswordFormRef"
        :model="changePasswordForm"
        :rules="changePasswordRules"
        label-width="100px"
        style="padding-left: 15px; padding-right: 15px;"
      >
        <el-form-item label="原密码" prop="oldPassword">
          <el-input
            v-model="changePasswordForm.oldPassword"
            type="password"
            placeholder="请输入原密码"
            show-password
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="changePasswordForm.newPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
            show-password
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="changePasswordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
            autocomplete="off"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="changePasswordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleChangePassword" :loading="changePasswordLoading">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Grid,
  CircleCheck,
  Calendar,
  User,
  DataAnalysis,
  Setting,
  Fold,
  Expand,
  Search,
  Bell,
  QuestionFilled,
  Plus,
  TrendCharts,
  Lock,
  Tools
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { homeApi } from './api'

const router = useRouter()
const route = useRoute()

// 侧边栏折叠状态
const isCollapse = ref(false)

// 当前路由
const currentRoute = computed(() => route)
const currentRouteName = computed(() => route.name as string)

// 通知数量
const notificationCount = ref(5)

// 用户信息
const userInfo = ref({
  username: '',
  nickname: '',
  email: '',
  phone: '',
  avatar: ''
})

// 修改密码对话框
const changePasswordDialogVisible = ref(false)
const changePasswordLoading = ref(false)
const changePasswordFormRef = ref()
const changePasswordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 修改密码表单验证规则
const validateConfirmPassword = (rule: any, value: any, callback: any) => {
  if (value === '') {
    callback(new Error('请再次输入新密码'))
  } else if (value !== changePasswordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const changePasswordRules = {
  oldPassword: [
    { required: true, message: '请输入原密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

// 切换侧边栏
const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value
}

// 通知处理
const handleNotification = () => {
  ElMessage.info('查看通知功能开发中...')
  // TODO: 调用 homeApi.getNotifications()
}

// 帮助处理
const handleHelp = () => {
  ElMessage.info('帮助功能开发中...')
  // TODO: 打开帮助文档
}

// 用户下拉菜单命令处理
const handleUserCommand = (command: string) => {
  switch (command) {
    case 'profile':
      ElMessage.info('个人资料功能开发中...')
      // TODO: 调用 homeApi.getUserProfile()
      break
    case 'settings':
      ElMessage.info('账户设置功能开发中...')
      // TODO: 打开设置页面
      break
    case 'changePassword':
      changePasswordDialogVisible.value = true
      break
    case 'logout':
      handleLogout()
      break
  }
}

// 修改密码
const handleChangePassword = async () => {
  if (!changePasswordFormRef.value) return

  await changePasswordFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return

    try {
      changePasswordLoading.value = true
      await homeApi.changePassword({
        oldPassword: changePasswordForm.oldPassword,
        newPassword: changePasswordForm.newPassword
      })

      ElMessage.success('密码修改成功，请重新登录')
      changePasswordDialogVisible.value = false

      // 清空表单
      changePasswordForm.oldPassword = ''
      changePasswordForm.newPassword = ''
      changePasswordForm.confirmPassword = ''
      changePasswordFormRef.value.resetFields()

      // 清除token并跳转到登录页
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setTimeout(() => {
        window.location.href = '/login.html'
      }, 1000)
    } catch (error: any) {
      console.error(error)
      ElMessage.error(error.response?.data?.message || '修改密码失败')
    } finally {
      changePasswordLoading.value = false
    }
  })
}

// 退出登录
const handleLogout = async () => {
  try {
    await homeApi.logout()
    ElMessage.success('退出登录成功')
  } catch (error) {
    console.error('退出登录失败:', error)
    // 即使后端退出失败，前端也要执行清除操作
  } finally {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setTimeout(() => {
      window.location.href = '/login.html'
    }, 500)
  }
}


// 加载用户信息
const loadUserInfo = async () => {
  try {
    const res = await homeApi.getUserProfile()
    userInfo.value = {
      username: res.data.result.username,
      nickname: res.data.result.nickname,
      email: res.data.result.email,
      phone: res.data.result.phone,
      avatar: res.data.result.avatar
    }
  } catch (error: any) {
    console.error('获取用户信息失败:', error)
    ElMessage.error('获取用户信息失败')
    // 如果获取用户信息失败（可能是token过期），跳转到登录页
    if (error.response?.status === 401) {
      setTimeout(() => {
        window.location.href = '/login.html'
      }, 1000)
    }
  }
}

// 组件挂载时加载数据
onMounted(async () => {
  await loadUserInfo()
})
</script>

<style lang="less" scoped>
.home-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #f5f7fa;
}

// 侧边栏样式
.sidebar {
  background-color: #ffffff;
  border-right: 1px solid #e6e8eb;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;

  .logo-area {
    height: 64px;
    display: flex;
    align-items: center;
    padding: 0 16px;
    border-bottom: 1px solid #e6e8eb;
    gap: 12px;

    .logo-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: bold;
      flex-shrink: 0;
    }

    .logo-text {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      white-space: nowrap;
    }

    .logo-subtext {
      font-size: 12px;
      color: #999;
      white-space: nowrap;
    }
  }

  .sidebar-menu {
    border: none;
    flex: 1;
    overflow-y: auto;

    :deep(.el-menu-item) {
      height: 48px;
      line-height: 48px;
      margin: 4px 8px;
      border-radius: 6px;

      &.is-active {
        background-color: #ecf5ff;
      }

      &:hover {
        background-color: #f5f7fa;
      }
    }
  }

  .sidebar-footer {
    border-top: 1px solid #e6e8eb;
    padding: 8px 0;
  }
}

// 主容器
.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// 顶部导航栏
.header {
  background-color: #ffffff;
  border-bottom: 1px solid #e6e8eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;

    .collapse-icon {
      font-size: 20px;
      cursor: pointer;
      color: #606266;
      transition: color 0.3s;

      &:hover {
        color: #409EFF;
      }
    }

    .breadcrumb {
      font-size: 14px;

      :deep(.el-breadcrumb__item) {
        .el-breadcrumb__inner {
          color: #606266;
          font-weight: 400;

          &.is-link {
            color: #409EFF;

            &:hover {
              color: #66b1ff;
            }
          }
        }

        &:last-child .el-breadcrumb__inner {
          color: #303133;
          font-weight: 500;
        }
      }
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 20px;

    .notification-badge {
      cursor: pointer;
    }

    .header-icon {
      font-size: 20px;
      cursor: pointer;
      color: #606266;
      transition: color 0.3s;

      &:hover {
        color: #409EFF;
      }
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;

      .user-avatar {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      .user-details {
        .user-name {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }

        .user-role {
          font-size: 12px;
          color: #999;
        }
      }
    }
  }
}

// 主内容区
.content-main {
  background-color: #f5f7fa;
  overflow-y: auto;
  padding: 24px;
}
</style>
