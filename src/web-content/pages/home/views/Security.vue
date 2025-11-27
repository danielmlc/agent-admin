<template>
  <div class="security-container">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <h3>安全管理</h3>
          <p class="card-subtitle">查看您的登录日志和Token刷新记录</p>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="security-tabs">
        <!-- 登录日志 -->
        <el-tab-pane label="登录日志" name="loginLogs">
          <div class="tab-content">
            <!-- 搜索栏 -->
            <div class="search-bar">
              <el-form :inline="true" :model="loginLogQuery" class="search-form">
                <el-form-item label="登录状态">
                  <el-select v-model="loginLogQuery.status" placeholder="全部" clearable style="width: 120px">
                    <el-option label="成功" value="success" />
                    <el-option label="失败" value="failed" />
                  </el-select>
                </el-form-item>
                <el-form-item label="登录方式">
                  <el-select v-model="loginLogQuery.loginType" placeholder="全部" clearable style="width: 120px">
                    <el-option label="密码登录" value="password" />
                    <el-option label="短信登录" value="sms" />
                    <el-option label="微信登录" value="wechat" />
                    <el-option label="GitHub" value="github" />
                  </el-select>
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="loadLoginLogs" :loading="loginLogLoading">
                    <el-icon><Search /></el-icon>
                    查询
                  </el-button>
                  <el-button @click="resetLoginLogQuery">重置</el-button>
                </el-form-item>
              </el-form>
            </div>

            <!-- 登录日志表格 -->
            <el-table
              :data="loginLogs"
              v-loading="loginLogLoading"
              stripe
              style="width: 100%"
              :default-sort="{ prop: 'createdAt', order: 'descending' }"
            >
              <el-table-column prop="createdAt" label="登录时间" width="180" sortable>
                <template #default="{ row }">
                  {{ formatDateTime(row.createdAt) }}
                </template>
              </el-table-column>
              <el-table-column prop="loginType" label="登录方式" width="120">
                <template #default="{ row }">
                  <el-tag :type="getLoginTypeTagType(row.loginType)" size="small">
                    {{ getLoginTypeText(row.loginType) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
                    {{ row.status === 'success' ? '成功' : '失败' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="ipAddress" label="IP地址" width="150" />
              <el-table-column prop="location" label="登录地点" width="150" />
              <el-table-column prop="userAgent" label="设备信息" min-width="200" show-overflow-tooltip />
              <el-table-column prop="failureReason" label="失败原因" width="150" show-overflow-tooltip>
                <template #default="{ row }">
                  <span v-if="row.status === 'failed'" class="failure-reason">
                    {{ row.failureReason || '-' }}
                  </span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
            </el-table>

            <!-- 分页 -->
            <div class="pagination-wrapper">
              <el-pagination
                v-model:current-page="loginLogQuery.page"
                v-model:page-size="loginLogQuery.pageSize"
                :page-sizes="[10, 20, 50, 100]"
                :total="loginLogTotal"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="loadLoginLogs"
                @current-change="loadLoginLogs"
              />
            </div>
          </div>
        </el-tab-pane>

        <!-- Token刷新记录 -->
        <el-tab-pane label="Token刷新记录" name="refreshTokens">
          <div class="tab-content">
            <!-- 刷新按钮 -->
            <div class="action-bar">
              <el-button type="primary" @click="loadRefreshTokens" :loading="refreshTokenLoading">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
              <el-button type="danger" @click="handleRevokeAllTokens" :loading="revokeAllLoading">
                <el-icon><Delete /></el-icon>
                撤销所有Token
              </el-button>
            </div>

            <!-- Token列表 -->
            <div v-loading="refreshTokenLoading" class="token-list">
              <el-empty v-if="refreshTokens.length === 0" description="暂无Token刷新记录" />
              
              <div v-else class="token-items">
                <div
                  v-for="token in refreshTokens"
                  :key="token.id"
                  class="token-item"
                  :class="{ 'current-token': token.isCurrent }"
                >
                  <div class="token-header">
                    <div class="token-device">
                      <el-icon class="device-icon" :size="20">
                        <Monitor v-if="isDesktop(token.userAgent)" />
                        <Iphone v-else />
                      </el-icon>
                      <div class="device-info">
                        <div class="device-name">
                          {{ getDeviceName(token.userAgent) }}
                          <el-tag v-if="token.isCurrent" type="success" size="small" class="current-tag">
                            当前设备
                          </el-tag>
                        </div>
                        <div class="device-detail">{{ token.userAgent }}</div>
                      </div>
                    </div>
                    <el-button
                      v-if="!token.isCurrent"
                      type="danger"
                      size="small"
                      text
                      @click="handleRevokeToken(token.id)"
                    >
                      撤销
                    </el-button>
                  </div>
                  
                  <div class="token-details">
                    <div class="detail-item">
                      <el-icon><Location /></el-icon>
                      <span>IP地址：{{ token.ipAddress || '未知' }}</span>
                    </div>
                    <div class="detail-item">
                      <el-icon><Clock /></el-icon>
                      <span>创建时间：{{ formatDateTime(token.createdAt) }}</span>
                    </div>
                    <div class="detail-item">
                      <el-icon><Clock /></el-icon>
                      <span>最后使用：{{ formatDateTime(token.lastUsedAt) }}</span>
                    </div>
                    <div class="detail-item">
                      <el-icon><Timer /></el-icon>
                      <span>过期时间：{{ formatDateTime(token.expiresAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Refresh,
  Delete,
  Monitor,
  Iphone,
  Location,
  Clock,
  Timer
} from '@element-plus/icons-vue'
import { homeApi } from '../api'
import dayjs from 'dayjs'

// 当前激活的标签页
const activeTab = ref('loginLogs')

// 登录日志相关
const loginLogs = ref<any[]>([])
const loginLogLoading = ref(false)
const loginLogTotal = ref(0)
const loginLogQuery = reactive({
  status: '',
  loginType: '',
  page: 1,
  pageSize: 10
})

// Token刷新记录相关
const refreshTokens = ref<any[]>([])
const refreshTokenLoading = ref(false)
const revokeAllLoading = ref(false)

// 格式化日期时间
const formatDateTime = (date: string | Date) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

// 获取登录方式文本
const getLoginTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    password: '密码登录',
    sms: '短信登录',
    wechat: '微信登录',
    github: 'GitHub'
  }
  return typeMap[type] || type
}

// 获取登录方式标签类型
const getLoginTypeTagType = (type: string) => {
  const typeMap: Record<string, any> = {
    password: '',
    sms: 'success',
    wechat: 'warning',
    github: 'info'
  }
  return typeMap[type] || ''
}

// 判断是否为桌面设备
const isDesktop = (userAgent: string) => {
  if (!userAgent) return true
  return !/(Mobile|Android|iPhone|iPad)/i.test(userAgent)
}

// 获取设备名称
const getDeviceName = (userAgent: string) => {
  if (!userAgent) return '未知设备'
  
  if (/Windows/i.test(userAgent)) return 'Windows 电脑'
  if (/Mac/i.test(userAgent)) return 'Mac 电脑'
  if (/Linux/i.test(userAgent)) return 'Linux 电脑'
  if (/iPhone/i.test(userAgent)) return 'iPhone'
  if (/iPad/i.test(userAgent)) return 'iPad'
  if (/Android/i.test(userAgent)) return 'Android 设备'
  
  return '未知设备'
}

// 加载登录日志
const loadLoginLogs = async () => {
  try {
    loginLogLoading.value = true
    const res = await homeApi.getLoginLogs(loginLogQuery)
    loginLogs.value = res.data.result.data
    loginLogTotal.value = res.data.result.total
  } catch (error: any) {
    console.error('加载登录日志失败:', error)
    ElMessage.error(error.response?.data?.message || '加载登录日志失败')
  } finally {
    loginLogLoading.value = false
  }
}

// 重置登录日志查询条件
const resetLoginLogQuery = () => {
  loginLogQuery.status = ''
  loginLogQuery.loginType = ''
  loginLogQuery.page = 1
  loadLoginLogs()
}

// 加载Token刷新记录
const loadRefreshTokens = async () => {
  try {
    refreshTokenLoading.value = true
    const res = await homeApi.getRefreshTokens()
    refreshTokens.value = res.data.result
  } catch (error: any) {
    console.error('加载Token刷新记录失败:', error)
    ElMessage.error(error.response?.data?.message || '加载Token刷新记录失败')
  } finally {
    refreshTokenLoading.value = false
  }
}

// 撤销单个Token
const handleRevokeToken = async (tokenId: string) => {
  try {
    await ElMessageBox.confirm('确定要撤销此Token吗？撤销后该设备需要重新登录。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await homeApi.revokeRefreshToken(tokenId)
    ElMessage.success('Token已撤销')
    await loadRefreshTokens()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('撤销Token失败:', error)
      ElMessage.error(error.response?.data?.message || '撤销Token失败')
    }
  }
}

// 撤销所有Token
const handleRevokeAllTokens = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要撤销所有Token吗？撤销后您需要在所有设备上重新登录。',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    revokeAllLoading.value = true
    await homeApi.revokeAllRefreshTokens()
    ElMessage.success('所有Token已撤销，即将跳转到登录页')
    
    // 清除本地token
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    
    setTimeout(() => {
      window.location.href = '/login.html'
    }, 1500)
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('撤销所有Token失败:', error)
      ElMessage.error(error.response?.data?.message || '撤销所有Token失败')
    }
  } finally {
    revokeAllLoading.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadLoginLogs()
  loadRefreshTokens()
})
</script>

<style lang="less" scoped>
.security-container {
  .page-card {
    :deep(.el-card__header) {
      padding: 20px 24px;
      border-bottom: 1px solid #e6e8eb;
    }

    :deep(.el-card__body) {
      padding: 0;
    }
  }

  .card-header {
    h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 600;
      color: #303133;
    }

    .card-subtitle {
      margin: 0;
      font-size: 14px;
      color: #909399;
    }
  }

  .security-tabs {
    :deep(.el-tabs__header) {
      padding: 0 24px;
      margin: 0;
    }

    :deep(.el-tabs__content) {
      padding: 0;
    }
  }

  .tab-content {
    padding: 24px;
  }

  .search-bar {
    margin-bottom: 20px;

    .search-form {
      :deep(.el-form-item) {
        margin-bottom: 0;
      }
    }
  }

  .action-bar {
    margin-bottom: 20px;
    display: flex;
    gap: 12px;
  }

  .pagination-wrapper {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }

  .failure-reason {
    color: #f56c6c;
  }

  // Token列表样式
  .token-list {
    min-height: 200px;
  }

  .token-items {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .token-item {
    border: 1px solid #e6e8eb;
    border-radius: 8px;
    padding: 16px;
    background-color: #fff;
    transition: all 0.3s;

    &:hover {
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    }

    &.current-token {
      border-color: #67c23a;
      background-color: #f0f9ff;
    }

    .token-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;

      .token-device {
        display: flex;
        gap: 12px;
        flex: 1;

        .device-icon {
          color: #409eff;
          flex-shrink: 0;
        }

        .device-info {
          flex: 1;

          .device-name {
            font-size: 16px;
            font-weight: 500;
            color: #303133;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 8px;

            .current-tag {
              font-weight: normal;
            }
          }

          .device-detail {
            font-size: 12px;
            color: #909399;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }
    }

    .token-details {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;

      .detail-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: #606266;

        .el-icon {
          color: #909399;
          font-size: 14px;
        }
      }
    }
  }
}
</style>
