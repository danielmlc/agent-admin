<template>
  <div class="settings-container">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <h3>系统设置</h3>
          <p class="card-subtitle">管理全局配置和个人配置</p>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="settings-tabs">
        <!-- 全局配置 -->
        <el-tab-pane label="全局配置" name="global">
          <div class="tab-content">
            <!-- 工具栏 -->
            <div class="toolbar">
              <el-select
                v-model="selectedGroup"
                placeholder="选择配置组"
                clearable
                style="width: 200px"
                @change="handleGroupChange"
              >
                <el-option
                  v-for="group in configGroups"
                  :key="group.code"
                  :label="group.name"
                  :value="group.code"
                />
              </el-select>
              <el-button type="primary" @click="handleCreateConfig">
                <el-icon><Plus /></el-icon>
                新增配置
              </el-button>
            </div>

            <!-- 配置列表 -->
            <el-table
              :data="globalConfigs"
              v-loading="globalLoading"
              stripe
              style="width: 100%"
            >
              <el-table-column prop="group" label="分组" width="120">
                <template #default="{ row }">
                  <el-tag size="small">{{ row.groupName || row.group }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="key" label="配置键" width="200" />
              <el-table-column prop="value" label="配置值" min-width="200">
                <template #default="{ row }">
                  <config-value-display :value="row.value" :type="row.valueType" />
                </template>
              </el-table-column>
              <el-table-column prop="valueType" label="类型" width="100">
                <template #default="{ row }">
                  <el-tag :type="getValueTypeTagType(row.valueType)" size="small">
                    {{ row.valueType }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />
              <el-table-column prop="isPublic" label="公开" width="80" align="center">
                <template #default="{ row }">
                  <el-icon :color="row.isPublic ? '#67c23a' : '#909399'">
                    <Check v-if="row.isPublic" />
                    <Close v-else />
                  </el-icon>
                </template>
              </el-table-column>
              <el-table-column prop="isEditable" label="可编辑" width="80" align="center">
                <template #default="{ row }">
                  <el-icon :color="row.isEditable ? '#67c23a' : '#909399'">
                    <Check v-if="row.isEditable" />
                    <Close v-else />
                  </el-icon>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <el-button type="primary" size="small" text @click="handleEditConfig(row)">
                    编辑
                  </el-button>
                  <el-button type="danger" size="small" text @click="handleDeleteConfig(row)">
                    删除
                  </el-button>
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
          </div>
        </el-tab-pane>

        <!-- 个人配置 -->
        <el-tab-pane label="个人配置" name="user">
          <div class="tab-content">
            <!-- 配置组筛选 -->
            <div class="toolbar">
              <el-select
                v-model="userSelectedGroup"
                placeholder="选择配置组"
                clearable
                style="width: 200px"
                @change="loadUserConfigs"
              >
                <el-option
                  v-for="group in configGroups"
                  :key="group.code"
                  :label="group.name"
                  :value="group.code"
                />
              </el-select>
            </div>

            <!-- 配置卡片列表 -->
            <div v-loading="userLoading" class="user-config-list">
              <el-empty v-if="userConfigs.length === 0" description="暂无配置项" />
              
              <div v-else class="config-cards">
                <el-card
                  v-for="config in userConfigs"
                  :key="`${config.group}:${config.key}`"
                  class="config-card"
                  :class="{ 'is-customized': config.isUserConfig }"
                >
                  <template #header>
                    <div class="config-card-header">
                      <div class="config-title">
                        <span class="config-key">{{ config.key }}</span>
                        <el-tag v-if="config.isUserConfig" type="success" size="small">
                          已自定义
                        </el-tag>
                        <el-tag v-else type="info" size="small">
                          默认值
                        </el-tag>
                      </div>
                      <div class="config-actions">
                        <el-button
                          v-if="config.isEditable"
                          type="primary"
                          size="small"
                          @click="handleEditUserConfig(config)"
                        >
                          修改
                        </el-button>
                        <el-button
                          v-if="config.isUserConfig"
                          type="warning"
                          size="small"
                          @click="handleResetUserConfig(config)"
                        >
                          恢复默认
                        </el-button>
                      </div>
                    </div>
                  </template>

                  <div class="config-content">
                    <div class="config-info">
                      <div class="info-item">
                        <span class="label">分组：</span>
                        <el-tag size="small">{{ config.groupName || config.group }}</el-tag>
                      </div>
                      <div class="info-item" v-if="config.description">
                        <span class="label">描述：</span>
                        <span>{{ config.description }}</span>
                      </div>
                    </div>
                    <div class="config-value">
                      <div class="value-label">当前值：</div>
                      <div class="value-content">
                        <config-value-display :value="config.value" :type="config.valueType" />
                      </div>
                    </div>
                    <div class="config-value" v-if="config.defaultValue !== null && config.defaultValue !== undefined">
                      <div class="value-label">默认值：</div>
                      <div class="value-content default">
                        <config-value-display :value="config.defaultValue" :type="config.valueType" />
                      </div>
                    </div>
                  </div>
                </el-card>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 编辑全局配置对话框 -->
    <el-dialog
      v-model="configDialogVisible"
      :title="isEditMode ? '编辑配置' : '新增配置'"
      width="600px"
      @close="resetConfigForm"
    >
      <el-form
        ref="configFormRef"
        :model="configForm"
        :rules="configRules"
        label-width="100px"
      >
        <el-form-item label="配置组" prop="group">
          <el-input v-model="configForm.group" :disabled="isEditMode" placeholder="如：system" />
        </el-form-item>
        <el-form-item label="分组名称" prop="groupName">
          <el-input v-model="configForm.groupName" placeholder="如：系统配置" />
        </el-form-item>
        <el-form-item label="配置键" prop="key">
          <el-input v-model="configForm.key" :disabled="isEditMode" placeholder="如：siteName" />
        </el-form-item>
        <el-form-item label="值类型" prop="valueType">
          <el-select v-model="configForm.valueType" style="width: 100%">
            <el-option label="字符串" value="string" />
            <el-option label="数字" value="number" />
            <el-option label="布尔值" value="boolean" />
            <el-option label="JSON对象" value="json" />
            <el-option label="数组" value="array" />
          </el-select>
        </el-form-item>
        <el-form-item label="配置值" prop="value">
          <el-input
            v-if="configForm.valueType === 'string'"
            v-model="configForm.value"
            type="textarea"
            :rows="3"
            placeholder="请输入配置值"
          />
          <el-input-number
            v-else-if="configForm.valueType === 'number'"
            v-model.number="configForm.value"
            style="width: 100%"
          />
          <el-switch
            v-else-if="configForm.valueType === 'boolean'"
            v-model="configForm.value"
            active-text="是"
            inactive-text="否"
          />
          <el-input
            v-else
            v-model="configForm.value"
            type="textarea"
            :rows="5"
            placeholder="请输入JSON格式的值"
          />
        </el-form-item>
        <el-form-item label="默认值" prop="defaultValue">
          <el-input v-model="configForm.defaultValue" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="configForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="是否公开" prop="isPublic">
          <el-switch v-model="configForm.isPublic" active-text="是" inactive-text="否" />
        </el-form-item>
        <el-form-item label="可编辑" prop="isEditable">
          <el-switch v-model="configForm.isEditable" active-text="是" inactive-text="否" />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="configForm.sort" :min="0" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="configDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveConfig" :loading="saveLoading">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑用户配置对话框 -->
    <el-dialog
      v-model="userConfigDialogVisible"
      title="修改配置"
      width="500px"
      @close="resetUserConfigForm"
    >
      <el-form
        ref="userConfigFormRef"
        :model="userConfigForm"
        :rules="userConfigRules"
        label-width="100px"
      >
        <el-form-item label="配置键">
          <el-input :value="userConfigForm.key" disabled />
        </el-form-item>
        <el-form-item label="配置值" prop="value">
          <el-input
            v-if="userConfigForm.valueType === 'string'"
            v-model="userConfigForm.value"
            type="textarea"
            :rows="3"
          />
          <el-input-number
            v-else-if="userConfigForm.valueType === 'number'"
            v-model.number="userConfigForm.value"
            style="width: 100%"
          />
          <el-switch
            v-else-if="userConfigForm.valueType === 'boolean'"
            v-model="userConfigForm.value"
            active-text="是"
            inactive-text="否"
          />
          <el-input
            v-else
            v-model="userConfigForm.value"
            type="textarea"
            :rows="5"
            placeholder="请输入JSON格式的值"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userConfigDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveUserConfig" :loading="saveLoading">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, defineComponent, h } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Check,
  Close,
} from '@element-plus/icons-vue'
import { homeApi } from '../api'

// 配置值显示组件
const ConfigValueDisplay = defineComponent({
  props: {
    value: {
      type: [String, Number, Boolean, Object, Array],
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    return () => {
      if (props.type === 'boolean') {
        return h('span', { style: { color: props.value ? '#67c23a' : '#f56c6c' } }, 
          props.value ? '是' : '否'
        )
      } else if (props.type === 'json' || props.type === 'array') {
        return h('code', { style: { fontSize: '12px' } }, JSON.stringify(props.value))
      } else {
        return h('span', String(props.value))
      }
    }
  },
})

// 当前标签页
const activeTab = ref('global')

// 配置组列表
const configGroups = ref<any[]>([])

// 全局配置相关
const globalConfigs = ref<any[]>([])
const globalLoading = ref(false)
const selectedGroup = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 用户配置相关
const userConfigs = ref<any[]>([])
const userLoading = ref(false)
const userSelectedGroup = ref('')

// 配置对话框
const configDialogVisible = ref(false)
const isEditMode = ref(false)
const saveLoading = ref(false)
const configFormRef = ref()
const configForm = reactive({
  id: '',
  group: '',
  groupName: '',
  key: '',
  value: '' as any,
  valueType: 'string',
  description: '',
  isPublic: false,
  isEditable: true,
  defaultValue: '',
  sort: 0,
})

const configRules = {
  group: [{ required: true, message: '请输入配置组', trigger: 'blur' }],
  key: [{ required: true, message: '请输入配置键', trigger: 'blur' }],
  valueType: [{ required: true, message: '请选择值类型', trigger: 'change' }],
  value: [{ required: true, message: '请输入配置值', trigger: 'blur' }],
}

// 用户配置对话框
const userConfigDialogVisible = ref(false)
const userConfigFormRef = ref()
const userConfigForm = reactive({
  group: '',
  key: '',
  value: '' as any,
  valueType: 'string',
})

const userConfigRules = {
  value: [{ required: true, message: '请输入配置值', trigger: 'blur' }],
}

// 获取值类型标签类型
const getValueTypeTagType = (type: string) => {
  const typeMap: Record<string, any> = {
    string: '',
    number: 'success',
    boolean: 'warning',
    json: 'info',
    array: 'danger',
  }
  return typeMap[type] || ''
}

// 加载配置组
const loadConfigGroups = async () => {
  try {
    const res = await homeApi.getConfigGroups()
    configGroups.value = res.data.result
  } catch (error: any) {
    console.error('加载配置组失败:', error)
  }
}

// 加载全局配置
const loadGlobalConfigs = async () => {
  try {
    globalLoading.value = true
    const res = await homeApi.getGlobalConfigs({
      group: selectedGroup.value,
      page: currentPage.value,
      pageSize: pageSize.value
    })
    globalConfigs.value = res.data.result.data
    total.value = res.data.result.total
  } catch (error: any) {
    console.error('加载全局配置失败:', error)
    ElMessage.error(error.response?.data?.message || '加载全局配置失败')
  } finally {
    globalLoading.value = false
  }
}

// 加载用户配置
const loadUserConfigs = async () => {
  try {
    userLoading.value = true
    const res = await homeApi.getUserConfigs({ group: userSelectedGroup.value })
    userConfigs.value = res.data.result
  } catch (error: any) {
    console.error('加载用户配置失败:', error)
    ElMessage.error(error.response?.data?.message || '加载用户配置失败')
  } finally {
    userLoading.value = false
  }
}

// 新增配置
const handleCreateConfig = () => {
  isEditMode.value = false
  configDialogVisible.value = true
}

// 编辑配置
const handleEditConfig = (row: any) => {
  isEditMode.value = true
  Object.assign(configForm, {
    id: row.id,
    group: row.group,
    groupName: row.groupName,
    key: row.key,
    value: row.value,
    valueType: row.valueType,
    description: row.description,
    isPublic: row.isPublic,
    isEditable: row.isEditable,
    defaultValue: row.defaultValue || '',
    sort: row.sort,
  })
  configDialogVisible.value = true
}

// 删除配置
const handleDeleteConfig = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除此配置吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await homeApi.deleteGlobalConfig(row.id)
    ElMessage.success('配置已删除')
    await loadGlobalConfigs()
    await loadConfigGroups()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除配置失败:', error)
      ElMessage.error(error.response?.data?.message || '删除配置失败')
    }
  }
}

// 保存配置
const handleSaveConfig = async () => {
  if (!configFormRef.value) return

  await configFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return

    try {
      saveLoading.value = true

      // 转换值为字符串
      let valueStr = String(configForm.value)
      if (configForm.valueType === 'boolean') {
        valueStr = configForm.value ? 'true' : 'false'
      } else if (configForm.valueType === 'json' || configForm.valueType === 'array') {
        try {
          valueStr = typeof configForm.value === 'string' 
            ? configForm.value 
            : JSON.stringify(configForm.value)
        } catch (e) {
          ElMessage.error('JSON格式错误')
          return
        }
      }

      const data = {
        ...configForm,
        value: valueStr,
      }

      if (isEditMode.value) {
        await homeApi.updateGlobalConfig(configForm.id, data)
        ElMessage.success('配置已更新')
      } else {
        await homeApi.createGlobalConfig(data)
        ElMessage.success('配置已创建')
      }

      configDialogVisible.value = false
      await loadGlobalConfigs()
      await loadConfigGroups()
    } catch (error: any) {
      console.error('保存配置失败:', error)
      ElMessage.error(error.response?.data?.message || '保存配置失败')
    } finally {
      saveLoading.value = false
    }
  })
}

// 重置配置表单
const resetConfigForm = () => {
  Object.assign(configForm, {
    id: '',
    group: '',
    groupName: '',
    key: '',
    value: '',
    valueType: 'string',
    description: '',
    isPublic: false,
    isEditable: true,
    defaultValue: '',
    sort: 0,
  })
  configFormRef.value?.resetFields()
}

// 编辑用户配置
const handleEditUserConfig = (config: any) => {
  Object.assign(userConfigForm, {
    group: config.group,
    key: config.key,
    value: config.value,
    valueType: config.valueType,
  })
  userConfigDialogVisible.value = true
}

// 恢复默认配置
const handleResetUserConfig = async (config: any) => {
  try {
    await ElMessageBox.confirm('确定要恢复为默认值吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await homeApi.deleteUserConfig(config.group, config.key)
    ElMessage.success('已恢复为默认值')
    await loadUserConfigs()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('恢复默认配置失败:', error)
      ElMessage.error(error.response?.data?.message || '恢复默认配置失败')
    }
  }
}

// 保存用户配置
const handleSaveUserConfig = async () => {
  if (!userConfigFormRef.value) return

  await userConfigFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return

    try {
      saveLoading.value = true

      // 转换值为字符串
      let valueStr = String(userConfigForm.value)
      if (userConfigForm.valueType === 'boolean') {
        valueStr = userConfigForm.value ? 'true' : 'false'
      } else if (userConfigForm.valueType === 'json' || userConfigForm.valueType === 'array') {
        try {
          valueStr = typeof userConfigForm.value === 'string'
            ? userConfigForm.value
            : JSON.stringify(userConfigForm.value)
        } catch (e) {
          ElMessage.error('JSON格式错误')
          return
        }
      }

      await homeApi.setUserConfig(userConfigForm.group, userConfigForm.key, {
        value: valueStr,
        valueType: userConfigForm.valueType,
      })

      ElMessage.success('配置已保存')
      userConfigDialogVisible.value = false
      await loadUserConfigs()
    } catch (error: any) {
      console.error('保存用户配置失败:', error)
      ElMessage.error(error.response?.data?.message || '保存用户配置失败')
    } finally {
      saveLoading.value = false
    }
  })
}

// 重置用户配置表单
const resetUserConfigForm = () => {
  Object.assign(userConfigForm, {
    group: '',
    key: '',
    value: '',
    valueType: 'string',
  })
  userConfigFormRef.value?.resetFields()
}

// 配置组变化处理
const handleGroupChange = () => {
  currentPage.value = 1
  loadGlobalConfigs()
}

// 分页变化处理
const handlePageChange = (page: number) => {
  currentPage.value = page
  loadGlobalConfigs()
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadGlobalConfigs()
}

// 组件挂载时加载数据
onMounted(async () => {
  await loadConfigGroups()
  await loadGlobalConfigs()
  await loadUserConfigs()
})
</script>

<style lang="less" scoped>
.settings-container {
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

  .settings-tabs {
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

  .toolbar {
    margin-bottom: 20px;
    display: flex;
    gap: 12px;
  }

  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }

  // 用户配置卡片样式
  .user-config-list {
    min-height: 300px;
  }

  .config-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 16px;
  }

  .config-card {
    transition: all 0.3s;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    &.is-customized {
      border-color: #67c23a;
    }

    :deep(.el-card__header) {
      padding: 16px;
      background-color: #fafafa;
    }

    :deep(.el-card__body) {
      padding: 16px;
    }

    .config-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .config-title {
        display: flex;
        align-items: center;
        gap: 8px;

        .config-key {
          font-size: 16px;
          font-weight: 500;
          color: #303133;
        }
      }

      .config-actions {
        display: flex;
        gap: 8px;
      }
    }

    .config-content {
      .config-info {
        margin-bottom: 16px;

        .info-item {
          margin-bottom: 8px;
          font-size: 14px;

          .label {
            color: #909399;
            margin-right: 8px;
          }
        }
      }

      .config-value {
        margin-bottom: 12px;

        .value-label {
          font-size: 13px;
          color: #909399;
          margin-bottom: 4px;
        }

        .value-content {
          padding: 8px 12px;
          background-color: #f5f7fa;
          border-radius: 4px;
          font-size: 14px;

          &.default {
            opacity: 0.7;
          }

          code {
            display: block;
            white-space: pre-wrap;
            word-break: break-all;
          }
        }
      }
    }
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
}
</style>
