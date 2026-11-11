<template>
  <div class="page-card cloud-page">
    <div class="head-row">
      <div>
        <h3>云数据</h3>
        <p class="sub">业务数据保存在云端数据库；本页可查看状态并导出本租户备份。</p>
      </div>
      <div class="actions">
        <el-button :loading="loading" @click="refresh">刷新状态</el-button>
        <el-button type="primary" :loading="exporting" @click="onExport">导出云端备份</el-button>
      </div>
    </div>

    <el-alert
      v-if="status?.connected"
      type="success"
      :closable="false"
      show-icon
      title="云端已连接"
      :description="`存储：${status.storage}`"
      class="status-alert"
    />
    <el-alert
      v-else-if="!loading"
      type="warning"
      :closable="false"
      show-icon
      title="暂未获取到云端状态"
      description="请点击「刷新状态」重试"
      class="status-alert"
    />

    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="8" :md="4" v-for="item in countCards" :key="item.label">
        <div class="stat-card">
          <div class="stat-num">{{ item.value }}</div>
          <div class="stat-label">{{ item.label }}</div>
        </div>
      </el-col>
    </el-row>

    <el-descriptions v-if="status" title="租户与账号" :column="1" border class="desc">
      <el-descriptions-item label="租户名称">{{ status.tenant.name }}</el-descriptions-item>
      <el-descriptions-item label="租户 ID">
        <code>{{ status.tenant.id }}</code>
      </el-descriptions-item>
      <el-descriptions-item label="创建时间">{{ formatTime(status.tenant.createdAt) }}</el-descriptions-item>
      <el-descriptions-item label="当前账号">
        {{ status.account.name }}（{{ status.account.username }} / {{ status.account.role }}）
      </el-descriptions-item>
      <el-descriptions-item label="最近检查">{{ formatTime(status.checkedAt) }}</el-descriptions-item>
    </el-descriptions>

    <div class="tips">
      <h4>说明</h4>
      <ul>
        <li>商品、课题组、出入库、发票等业务数据写入云端 MySQL，重启或重新部署（不删数据卷）不会丢失。</li>
        <li>每个注册账号对应独立租户，数据互相隔离。</li>
        <li>「导出云端备份」下载本租户 JSON 文件，便于本地存档；不含密码哈希。</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { exportCloudData, getCloudStatus, type CloudStatus } from '@/api'

const loading = ref(false)
const exporting = ref(false)
const status = ref<CloudStatus | null>(null)

const countCards = computed(() => {
  const c = status.value?.counts
  return [
    { label: '账号', value: c?.users ?? '-' },
    { label: '商品', value: c?.products ?? '-' },
    { label: '课题组', value: c?.customers ?? '-' },
    { label: '入库单', value: c?.inbounds ?? '-' },
    { label: '出库单', value: c?.outbounds ?? '-' },
    { label: '发票', value: c?.invoices ?? '-' },
  ]
})

function formatTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

async function refresh() {
  loading.value = true
  try {
    status.value = await getCloudStatus()
  } finally {
    loading.value = false
  }
}

async function onExport() {
  exporting.value = true
  try {
    const data = await exportCloudData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    a.href = url
    a.download = `jxc-cloud-backup-${stamp}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('云端备份已下载')
  } finally {
    exporting.value = false
  }
}

onMounted(refresh)
</script>

<style scoped>
.cloud-page h3 {
  margin: 0 0 6px;
  font-size: 18px;
}

.head-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.sub {
  margin: 0;
  color: #8c8c8c;
  font-size: 13px;
  line-height: 1.6;
}

.actions {
  display: flex;
  gap: 8px;
}

.status-alert {
  margin-bottom: 16px;
}

.stat-row {
  margin-bottom: 8px;
}

.stat-card {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 14px 12px;
  text-align: center;
  margin-bottom: 12px;
}

.stat-num {
  font-size: 22px;
  font-weight: 700;
  color: #1f1f1f;
  line-height: 1.2;
}

.stat-label {
  margin-top: 4px;
  font-size: 12px;
  color: #8c8c8c;
}

.desc {
  margin-top: 8px;
  max-width: 860px;
}

.desc code {
  font-size: 12px;
  word-break: break-all;
}

.tips {
  margin-top: 22px;
  max-width: 860px;
  padding: 14px 16px;
  border-radius: 8px;
  background: #f7f8fa;
  border: 1px solid #eef0f3;
}

.tips h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.tips ul {
  margin: 0;
  padding-left: 18px;
  color: #595959;
  font-size: 13px;
  line-height: 1.8;
}
</style>
