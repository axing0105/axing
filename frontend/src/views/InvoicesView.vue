<template>
  <div>
    <div class="filter-card">
      <el-input v-model="filters.invoiceNo" placeholder="发票号" clearable style="width: 160px" />
      <el-input v-model="filters.researchGroup" placeholder="课题组" clearable style="width: 160px" />
      <el-select v-model="filters.paid" clearable placeholder="是否到账" style="width: 140px">
        <el-option label="已到账" value="true" />
        <el-option label="未到账" value="false" />
      </el-select>
      <div class="filter-actions">
        <el-button type="primary" @click="load">查询</el-button>
        <el-button @click="onReset">重置</el-button>
        <el-button @click="onExport">导出 Excel</el-button>
      </div>
    </div>

    <div class="action-row">
      <el-button type="primary" @click="openEdit()">+ 新增发票</el-button>
    </div>

    <div class="page-card">
      <el-table :data="list" stripe>
        <el-table-column type="index" width="50" />
        <el-table-column label="开票时间" min-width="170">
          <template #default="{ row }">{{ formatTime(row.invoiceTime) }}</template>
        </el-table-column>
        <el-table-column prop="invoiceUnit" label="开票单位" min-width="140" />
        <el-table-column prop="amount" label="开票金额" width="110" />
        <el-table-column prop="invoiceNo" label="发票号" min-width="140" />
        <el-table-column prop="researchGroup" label="课题组" min-width="120" />
        <el-table-column label="是否到账" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="row.paid ? 'success' : 'info'" effect="light" round>
              {{ row.paid ? '已到账' : '未到账' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="contact" label="联系人" width="110" />
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="visible" :title="form.id ? '编辑发票' : '新增发票'" width="560px">
      <el-form label-width="100px">
        <el-form-item label="开票时间">
          <el-date-picker v-model="form.invoiceTime" type="datetime" style="width: 100%" />
        </el-form-item>
        <el-form-item label="开票单位"><el-input v-model="form.invoiceUnit" /></el-form-item>
        <el-form-item label="开票金额">
          <el-input-number v-model="form.amount" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="发票号"><el-input v-model="form.invoiceNo" /></el-form-item>
        <el-form-item label="课题组"><el-input v-model="form.researchGroup" /></el-form-item>
        <el-form-item label="是否到账">
          <el-switch v-model="form.paid" active-text="是" inactive-text="否" />
        </el-form-item>
        <el-form-item label="联系人"><el-input v-model="form.contact" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { createInvoice, deleteInvoice, listInvoices, updateInvoice, type Invoice } from '@/api'
import { downloadExcel } from '@/utils/excel'

const list = ref<Invoice[]>([])
const visible = ref(false)
const saving = ref(false)
const filters = reactive({ invoiceNo: '', researchGroup: '', paid: '' as '' | 'true' | 'false' })
const form = reactive({
  id: '',
  invoiceTime: new Date() as Date | string,
  invoiceUnit: '',
  amount: 0,
  invoiceNo: '',
  researchGroup: '',
  paid: false,
  contact: '',
  remark: '',
})

function formatTime(v: string) {
  return new Date(v).toLocaleString()
}

async function load() {
  const params: Record<string, unknown> = {}
  if (filters.invoiceNo) params.invoiceNo = filters.invoiceNo
  if (filters.researchGroup) params.researchGroup = filters.researchGroup
  if (filters.paid) params.paid = filters.paid
  list.value = await listInvoices(params)
}

function onReset() {
  filters.invoiceNo = ''
  filters.researchGroup = ''
  filters.paid = ''
  load()
}

function openEdit(row?: Invoice) {
  form.id = row?.id || ''
  form.invoiceTime = row?.invoiceTime ? new Date(row.invoiceTime) : new Date()
  form.invoiceUnit = row?.invoiceUnit || ''
  form.amount = row?.amount ?? 0
  form.invoiceNo = row?.invoiceNo || ''
  form.researchGroup = row?.researchGroup || ''
  form.paid = row?.paid ?? false
  form.contact = row?.contact || ''
  form.remark = row?.remark || ''
  visible.value = true
}

async function onSave() {
  saving.value = true
  try {
    const payload = {
      invoiceTime: form.invoiceTime,
      invoiceUnit: form.invoiceUnit,
      amount: form.amount,
      invoiceNo: form.invoiceNo,
      researchGroup: form.researchGroup,
      paid: form.paid,
      contact: form.contact,
      remark: form.remark,
    }
    if (form.id) await updateInvoice(form.id, payload)
    else await createInvoice(payload)
    ElMessage.success('已保存')
    visible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function onDelete(row: Invoice) {
  await ElMessageBox.confirm(`确认删除发票「${row.invoiceNo}」？`, '提示')
  await deleteInvoice(row.id)
  ElMessage.success('已删除')
  await load()
}

function onExport() {
  if (!list.value.length) {
    ElMessage.warning('暂无发票可导出')
    return
  }
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  downloadExcel(`发票对账_${stamp}.xlsx`, [
    {
      name: '发票对账',
      headers: ['开票时间', '开票单位', '开票金额', '发票号', '课题组', '是否到账', '联系人', '备注'],
      rows: list.value.map((row) => [
        formatTime(row.invoiceTime),
        row.invoiceUnit || '',
        row.amount,
        row.invoiceNo || '',
        row.researchGroup || '',
        row.paid ? '已到账' : '未到账',
        row.contact || '',
        row.remark || '',
      ]),
    },
  ])
  ElMessage.success('已导出 Excel')
}

onMounted(load)
</script>
