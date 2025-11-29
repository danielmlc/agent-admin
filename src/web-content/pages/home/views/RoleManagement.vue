<template>
  <div class="role-management">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span class="title">角色管理</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleCreateRole">
              <el-icon class="el-icon--left">
                <Plus />
              </el-icon>新增角色
            </el-button>
            <el-button type="success" @click="handleCreatePermission">
              <el-icon class="el-icon--left">
                <Plus />
              </el-icon>新增权限
            </el-button>
          </div>
        </div>
      </template>

      <!-- 角色列表 -->
      <el-table v-loading="loading" :data="roleList" border style="width: 100%">
        <el-table-column prop="name" label="角色名称" width="180" />
        <el-table-column prop="description" label="描述" />
        <el-table-column label="默认角色" width="100" align="center">
          <template #default="scope">
            <el-tag v-if="scope.row.isDefault" type="success">是</el-tag>
            <el-tag v-else type="info">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="包含权限" min-width="200">
          <template #default="scope">
            <el-tag v-for="perm in scope.row.permissions" :key="perm.id" size="small" style="margin-right: 5px; margin-bottom: 5px;">
              {{ perm.description || perm.code }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template #default="scope">
            <el-button link type="primary" @click="handleEditRole(scope.row)">编辑</el-button>
            <el-button link type="danger" @click="handleDeleteRole(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 角色编辑/创建对话框 -->
    <el-dialog v-model="roleDialogVisible" :title="isEdit ? '编辑角色' : '新增角色'" width="600px" @close="resetRoleForm">
      <el-form ref="roleFormRef" :model="roleForm" :rules="roleRules" label-width="80px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="roleForm.description" type="textarea" placeholder="请输入角色描述" />
        </el-form-item>
        <el-form-item label="默认角色" prop="isDefault">
          <el-switch v-model="roleForm.isDefault" />
        </el-form-item>
        <el-form-item label="权限分配">
          <el-transfer v-model="roleForm.permissions" :data="permissionList" :titles="['未选权限', '已选权限']"
            :props="{ key: 'id', label: 'description' }" filterable filter-placeholder="搜索权限">
            <template #default="{ option }">
              <span>{{ option.description }} - {{ option.code }}</span>
            </template>
          </el-transfer>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRoleForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 权限创建对话框 -->
    <el-dialog v-model="permissionDialogVisible" title="新增权限" width="500px" @close="resetPermissionForm">
      <el-form ref="permissionFormRef" :model="permissionForm" :rules="permissionRules" label-width="80px">
        <el-form-item label="权限代码" prop="code">
          <el-input v-model="permissionForm.code" placeholder="如: user:create" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="permissionForm.description" placeholder="请输入权限描述" />
        </el-form-item>
        <el-form-item label="资源" prop="resource">
          <el-input v-model="permissionForm.resource" placeholder="如: user" />
        </el-form-item>
        <el-form-item label="操作" prop="action">
          <el-input v-model="permissionForm.action" placeholder="如: create" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="permissionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPermissionForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { homeApi } from '../api'

// 数据定义
const loading = ref(false)
const roleList = ref([])
const permissionList = ref([])
const roleDialogVisible = ref(false)
const permissionDialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const currentRoleId = ref('')

const roleFormRef = ref()
const roleForm = reactive({
  name: '',
  description: '',
  isDefault: false,
  permissions: [] as string[]
})

const permissionFormRef = ref()
const permissionForm = reactive({
  code: '',
  description: '',
  resource: '',
  action: ''
})

const roleRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }]
}

const permissionRules = {
  code: [{ required: true, message: '请输入权限代码', trigger: 'blur' }],
  description: [{ required: true, message: '请输入权限描述', trigger: 'blur' }]
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const [rolesRes, permsRes] = await Promise.all([
      homeApi.getRoles(),
      homeApi.getPermissions()
    ])
    roleList.value = rolesRes.data
    permissionList.value = permsRes.data
  } catch (error) {
    console.error('加载数据失败', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 角色操作
const handleCreateRole = () => {
  isEdit.value = false
  currentRoleId.value = ''
  resetRoleForm()
  roleDialogVisible.value = true
}

const handleEditRole = (role: any) => {
  isEdit.value = true
  currentRoleId.value = role.id
  roleForm.name = role.name
  roleForm.description = role.description
  roleForm.isDefault = role.isDefault
  roleForm.permissions = role.permissions.map((p: any) => p.id)
  roleDialogVisible.value = true
}

const handleDeleteRole = (role: any) => {
  ElMessageBox.confirm(
    `确定要删除角色 "${role.name}" 吗？此操作不可逆。`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await homeApi.deleteRole(role.id)
      ElMessage.success('删除成功')
      loadData()
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  })
}

const submitRoleForm = async () => {
  if (!roleFormRef.value) return
  await roleFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitting.value = true
      try {
        if (isEdit.value) {
          await homeApi.updateRole(currentRoleId.value, roleForm)
          ElMessage.success('更新成功')
        } else {
          await homeApi.createRole(roleForm)
          ElMessage.success('创建成功')
        }
        roleDialogVisible.value = false
        loadData()
      } catch (error: any) {
        ElMessage.error(error.response?.data?.message || '操作失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const resetRoleForm = () => {
  roleForm.name = ''
  roleForm.description = ''
  roleForm.isDefault = false
  roleForm.permissions = []
  if (roleFormRef.value) {
    roleFormRef.value.clearValidate()
  }
}

// 权限操作
const handleCreatePermission = () => {
  resetPermissionForm()
  permissionDialogVisible.value = true
}

const submitPermissionForm = async () => {
  if (!permissionFormRef.value) return
  await permissionFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitting.value = true
      try {
        await homeApi.createPermission(permissionForm)
        ElMessage.success('权限创建成功')
        permissionDialogVisible.value = false
        // 重新加载权限列表，方便在角色表单中选择
        const permsRes = await homeApi.getPermissions()
        permissionList.value = permsRes.data
      } catch (error: any) {
        ElMessage.error(error.response?.data?.message || '操作失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const resetPermissionForm = () => {
  permissionForm.code = ''
  permissionForm.description = ''
  permissionForm.resource = ''
  permissionForm.action = ''
  if (permissionFormRef.value) {
    permissionFormRef.value.clearValidate()
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="less">
.role-management {
  .box-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .title {
        font-size: 18px;
        font-weight: bold;
      }
    }
  }
}
</style>
