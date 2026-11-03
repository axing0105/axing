<template>
  <div>
    <div class="action-row">
      <el-button type="primary" @click="openEdit()">+ 新增账号</el-button>
      <div class="spacer" />
      <el-button @click="router.push('/password')">修改密码</el-button>
      <el-button type="danger" plain @click="onLogout">退出登录</el-button>
    </div>
    <div class="page-card">
      <el-table :data="list" stripe>
        <el-table-column type="index" width="50" />
        <el-table-column prop="companyName" label="公司名称" min-width="140">
          <template #default="{ row }">{{ row.companyName || '-' }}</template>
        </el-table-column>
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="name" label="管理员" min-width="120" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="row.role === 'ADMIN' ? 'danger' : 'info'" effect="light" round>
              {{ row.role === 'ADMIN' ? '管理员' : '员工' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="160">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140">
          <template #default="{ row }">
            <el-button link @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="visible" :title="form.id ? '编辑账号' : '新增账号'" width="520px">
      <el-form label-width="90px">
        <el-form-item label="公司名称">
          <el-input v-model="form.companyName" placeholder="显示在顶部导航" />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="form.username" :disabled="Boolean(form.id)" />
        </el-form-item>
        <el-form-item label="管理员"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="管理员" value="ADMIN" />
            <el-option label="员工" value="STAFF" />
          </el-select>
        </el-form-item>
        <el-form-item :label="form.id ? '重置密码' : '密码'">
          <el-input v-model="form.password" type="password" show-password :placeholder="form.id ? '不填则不改' : ''" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createUser, deleteUser, listUsers, updateUser, type UserInfo } from '@/api'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const store = useUserStore()
const list = ref<UserInfo[]>([])
const visible = ref(false)
const saving = ref(false)
const form = reactive({
  id: '',
  username: '',
  name: '',
  companyName: '',
  role: 'STAFF',
  password: '',
})

function formatTime(v?: string) {
  return v ? new Date(v).toLocaleString() : ''
}

async function load() {
  list.value = await listUsers()
}

function openEdit(row?: UserInfo) {
  form.id = row?.id || ''
  form.username = row?.username || ''
  form.name = row?.name || ''
  form.companyName = row?.companyName || ''
  form.role = row?.role || 'STAFF'
  form.password = ''
  visible.value = true
}

async function onSave() {
  saving.value = true
  try {
    if (form.id) {
      const payload: Record<string, unknown> = {
        name: form.name,
        companyName: form.companyName,
        role: form.role,
      }
      if (form.password) payload.password = form.password
      await updateUser(form.id, payload)
      if (form.id === store.user?.id) await store.fetchMe()
    } else {
      await createUser({
        username: form.username,
        name: form.name,
        companyName: form.companyName,
        role: form.role,
        password: form.password,
      })
    }
    ElMessage.success('已保存')
    visible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function onDelete(row: UserInfo) {
  await ElMessageBox.confirm(`确认删除账号「${row.username}」？`, '提示')
  await deleteUser(row.id)
  ElMessage.success('已删除')
  await load()
}

async function onLogout() {
  await ElMessageBox.confirm('确认退出当前账号？', '退出登录')
  store.logout()
  router.push('/login')
}

onMounted(load)
</script>
