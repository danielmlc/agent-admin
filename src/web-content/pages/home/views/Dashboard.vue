<template>
  <div class="dashboard-content">
    <div class="greeting">
      <h1>{{ greeting }}</h1>
      <p>一切准备就绪,开始新的一天吧。</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon tasks">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.todayTasks }}</div>
            <div class="stat-label">今日待办</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon schedules">
            <el-icon><Calendar /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.upcomingSchedules }}</div>
            <div class="stat-label">即将到来的日程</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon clients">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.newClients }}</div>
            <div class="stat-label">新客户</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon analytics">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.completionRate }}%</div>
            <div class="stat-label">完成率</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions">
      <h3>快捷操作</h3>
      <div class="action-buttons">
        <el-button type="primary" @click="handleQuickAction('newTask')">
          <el-icon><Plus /></el-icon>
          新建任务
        </el-button>
        <el-button @click="handleQuickAction('newSchedule')">
          <el-icon><Plus /></el-icon>
          添加日程
        </el-button>
        <el-button @click="handleQuickAction('newClient')">
          <el-icon><Plus /></el-icon>
          新增客户
        </el-button>
      </div>
    </div>

    <!-- 最近活动 -->
    <div class="recent-activities">
      <h3>最近活动</h3>
      <el-timeline>
        <el-timeline-item
          v-for="activity in recentActivities"
          :key="activity.id"
          :timestamp="activity.time"
          :type="activity.type"
        >
          {{ activity.content }}
        </el-timeline-item>
      </el-timeline>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { CircleCheck, Calendar, User, TrendCharts, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 用户信息(通过 props 传入或从 store 获取)
const props = defineProps<{
  userInfo?: {
    nickname?: string
    username?: string
  }
}>()

// 统计数据
const stats = ref({
  todayTasks: 12,
  upcomingSchedules: 5,
  newClients: 8,
  completionRate: 85
})

// 最近活动
const recentActivities = ref([
  {
    id: 1,
    content: '完成了任务「产品需求整理」',
    time: '2 小时前',
    type: 'success'
  },
  {
    id: 2,
    content: '添加了新客户「张三」',
    time: '4 小时前',
    type: 'primary'
  },
  {
    id: 3,
    content: '创建了日程「团队会议」',
    time: '6 小时前',
    type: 'info'
  },
  {
    id: 4,
    content: '更新了数据报表',
    time: '1 天前',
    type: 'warning'
  }
])

// 计算问候语
const greeting = computed(() => {
  const hour = new Date().getHours()
  const displayName = props.userInfo?.nickname || props.userInfo?.username || '用户'

  if (hour < 12) return `早上好, ${displayName}!`
  if (hour < 18) return `下午好, ${displayName}!`
  return `晚上好, ${displayName}!`
})

// 快捷操作处理
const handleQuickAction = (action: string) => {
  const actionMap: Record<string, string> = {
    newTask: '新建任务',
    newSchedule: '添加日程',
    newClient: '新增客户'
  }
  ElMessage.info(`${actionMap[action]}功能开发中...`)
}
</script>

<style lang="less" scoped>
.dashboard-content {
  .greeting {
    margin-bottom: 24px;

    h1 {
      font-size: 28px;
      font-weight: 600;
      color: #333;
      margin: 0 0 8px 0;
    }

    p {
      font-size: 14px;
      color: #909399;
      margin: 0;
    }
  }

  .stats-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    margin-bottom: 24px;

    .stat-card {
      :deep(.el-card__body) {
        padding: 20px;
      }

      .stat-content {
        display: flex;
        align-items: center;
        gap: 16px;

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: white;

          &.tasks {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }

          &.schedules {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }

          &.clients {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          }

          &.analytics {
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          }
        }

        .stat-info {
          .stat-value {
            font-size: 32px;
            font-weight: 600;
            color: #333;
            line-height: 1;
            margin-bottom: 8px;
          }

          .stat-label {
            font-size: 14px;
            color: #909399;
          }
        }
      }
    }
  }

  .quick-actions {
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 24px;

    h3 {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin: 0 0 16px 0;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
  }

  .recent-activities {
    background-color: white;
    padding: 20px;
    border-radius: 8px;

    h3 {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin: 0 0 16px 0;
    }
  }
}
</style>
