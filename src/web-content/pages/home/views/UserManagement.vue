<template>
  <div class="user-management">
    <!-- 搜索和操作栏 -->
    <div class="toolbar">
      <div class="search-box">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索用户名、手机号、邮箱"
          clearable
          @clear="handleSearch"
          style="width: 300px; margin-right: 10px"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select
          v-model="searchStatus"
          placeholder="用户状态"
          clearable
          style="width: 150px; margin-right: 10px"
        >
          <el-option label="正常" value="normal" />
          <el-option label="禁用" value="disabled" />
          <el-option label="锁定" value="locked" />
        </el-select>
        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon>
          搜索
        </el-button>
      </div>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增用户
      </el-button>
    </div>

    <!-- 用户列表表格 -->
    <el-table :data="userList" border style="width: 100%" v-loading="loading">
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column prop="nickname" label="昵称" width="120" />
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column prop="email" label="邮箱" width="180" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.status === 'normal'" type="success">正常</el-tag>
          <el-tag v-else-if="row.status === 'disabled'" type="danger">禁用</el-tag>
          <el-tag v-else-if="row.status === 'locked'" type="warning">锁定</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column prop="lastLoginAt" label="最后登录" width="180">
        <template #default="{ row }">
          {{ row.lastLoginAt ? formatDate(row.lastLoginAt) : '从未登录' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" width="250">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
          <el-button link type="warning" @click="handleResetPassword(row)">重置密码</el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 新增/编辑用户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="userFormRef"
        :model="userForm"
        :rules="userFormRules"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="userForm.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="userForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input
            v-model="userForm.password"
            type="password"
            placeholder="请输入密码（至少6位）"
            show-password
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="userForm.status" placeholder="请选择状态">
            <el-option label="正常" value="normal" />
            <el-option label="禁用" value="disabled" />
            <el-option label="锁定" value="locked" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog
      v-model="resetPasswordDialogVisible"
      title="重置密码"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="resetPasswordFormRef"
        :model="resetPasswordForm"
        :rules="resetPasswordRules"
        label-width="100px"
      >
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="resetPasswordForm.newPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPasswordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleResetPasswordSubmit" :loading="resetPasswordLoading">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'
import { homeApi } from '../api'

// 搜索条件
const searchKeyword = ref('')
const searchStatus = ref('')

// 用户列表
const userList = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 新增/编辑对话框
const dialogVisible = ref(false)
const dialogTitle = ref('新增用户')
const isEdit = ref(false)
const submitLoading = ref(false)
const userFormRef = ref()
const userForm = reactive({
  id: '',
  username: '',
  nickname: '',
  phone: '',
  email: '',
  password: '',
  status: 'normal'
})

const userFormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ]
}

// 重置密码对话框
const resetPasswordDialogVisible = ref(false)
const resetPasswordLoading = ref(false)
const resetPasswordFormRef = ref()
const resetPasswordForm = reactive({
  userId: '',
  newPassword: ''
})

const resetPasswordRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ]
}

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

// 加载用户列表
const loadUserList = async () => {
  try {
    loading.value = true
    const res = await homeApi.getUserList({
      keyword: searchKeyword.value,
      status: searchStatus.value,
      page: currentPage.value,
      pageSize: pageSize.value
    })

    userList.value = res.data.result.data
    total.value = res.data.result.total
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载用户列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  loadUserList()
}

// 分页变化
const handlePageChange = (page: number) => {
  currentPage.value = page
  loadUserList()
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadUserList()
}

// 新增用户
const handleAdd = () => {
  isEdit.value = false
  dialogTitle.value = '新增用户'
  dialogVisible.value = true

  // 重置表单
  userForm.id = ''
  userForm.username = ''
  userForm.nickname = ''
  userForm.phone = ''
  userForm.email = ''
  userForm.password = ''
  userForm.status = 'normal'

  userFormRef.value?.resetFields()
}

// 编辑用户
const handleEdit = (row: any) => {
  isEdit.value = true
  dialogTitle.value = '编辑用户'
  dialogVisible.value = true

  userForm.id = row.id
  userForm.username = row.username
  userForm.nickname = row.nickname
  userForm.phone = row.phone
  userForm.email = row.email
  userForm.password = ''
  userForm.status = row.status
}

// 提交表单
const handleSubmit = async () => {
  if (!userFormRef.value) return

  await userFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return

    try {
      submitLoading.value = true

      if (isEdit.value) {
        // 编辑
        await homeApi.updateUser(userForm.id, {
          username: userForm.username,
          nickname: userForm.nickname,
          phone: userForm.phone,
          email: userForm.email,
          status: userForm.status
        })
        ElMessage.success('更新用户成功')
      } else {
        // 新增
        await homeApi.createUser({
          username: userForm.username,
          nickname: userForm.nickname,
          phone: userForm.phone,
          email: userForm.email,
          password: userForm.password,
          status: userForm.status
        })
        ElMessage.success('创建用户成功')
      }

      dialogVisible.value = false
      loadUserList()
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || '操作失败')
    } finally {
      submitLoading.value = false
    }
  })
}

// 重置密码
const handleResetPassword = (row: any) => {
  resetPasswordDialogVisible.value = true
  resetPasswordForm.userId = row.id
  resetPasswordForm.newPassword = ''
  resetPasswordFormRef.value?.resetFields()
}

// 提交重置密码
const handleResetPasswordSubmit = async () => {
  if (!resetPasswordFormRef.value) return

  await resetPasswordFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return

    try {
      resetPasswordLoading.value = true
      await homeApi.resetUserPassword(
        resetPasswordForm.userId,
        resetPasswordForm.newPassword
      )
      ElMessage.success('密码重置成功')
      resetPasswordDialogVisible.value = false
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || '重置密码失败')
    } finally {
      resetPasswordLoading.value = false
    }
  })
}

// 删除用户
const handleDelete = (row: any) => {
  ElMessageBox.confirm(
    `确定要删除用户 "${row.username}" 吗？此操作不可恢复！`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await homeApi.deleteUser(row.id)
      ElMessage.success('删除成功')
      loadUserList()
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }).catch(() => {
    // 取消删除
  })
}

// 组件挂载时加载数据
onMounted(() => {
  loadUserList()
})
</script>

<style lang="less" scoped>
.user-management {
  padding: 20px;
  background: #fff;
  border-radius: 4px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-box {
  display: flex;
  align-items: center;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

// 对话框表单样式
:deep(.el-dialog) {
  .el-dialog__body {
    padding: 20px 30px;
  }

  .el-form {
    .el-form-item {
      margin-bottom: 20px;
    }
  }
}
</style>
