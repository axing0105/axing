<template>
  <div>
    <div class="filter-card">
      <el-input
        v-model="keyword"
        placeholder="搜索课题组/客户姓名/单位/电话"
        clearable
        style="width: 280px"
        @keyup.enter="load"
      />
      <div class="filter-actions">
        <el-button type="primary" @click="load">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </div>
    </div>

    <div class="action-row">
      <el-button type="primary" @click="openEdit()">+ 新增课题组</el-button>
    </div>

    <div class="page-card">
      <el-table :data="list" stripe>
        <el-table-column type="index" width="50" />
        <el-table-column prop="name" label="课题组" min-width="120" />
        <el-table-column prop="contactName" label="客户姓名" min-width="110">
          <template #default="{ row }">{{ row.contactName || '-' }}</template>
        </el-table-column>
        <el-table-column prop="unitName" label="客户单位" min-width="140">
          <template #default="{ row }">{{ row.unitName || '-' }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="客户电话" min-width="120" />
        <el-table-column prop="address" label="客户地址" min-width="160" show-overflow-tooltip />
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="visible" :title="form.id ? '编辑课题组' : '新增课题组'" width="520px">
      <el-form label-width="90px">
        <el-form-item label="课题组"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="客户姓名"><el-input v-model="form.contactName" placeholder="收货/联系人姓名" /></el-form-item>
        <el-form-item label="客户单位"><el-input v-model="form.unitName" placeholder="所属单位/开票单位" /></el-form-item>
        <el-form-item label="客户电话"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="客户地址"><el-input v-model="form.address" /></el-form-item>
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
import { createCustomer, deleteCustomer, listCustomers, updateCustomer, type Customer } from '@/api'

const list = ref<Customer[]>([])
const keyword = ref('')
const visible = ref(false)
const saving = ref(false)
const form = reactive({
  id: '',
  name: '',
  contactName: '',
  unitName: '',
  phone: '',
  address: '',
  remark: '',
})

async function load() {
  list.value = await listCustomers(keyword.value)
}

function onReset() {
  keyword.value = ''
  load()
}

function openEdit(row?: Customer) {
  form.id = row?.id || ''
  form.name = row?.name || ''
  form.contactName = row?.contactName || ''
  form.unitName = row?.unitName || ''
  form.phone = row?.phone || ''
  form.address = row?.address || ''
  form.remark = row?.remark || ''
  visible.value = true
}

async function onSave() {
  if (!form.name.trim()) {
    ElMessage.warning('请填写课题组名称')
    return
  }
  saving.value = true
  try {
    const payload = {
      name: form.name,
      contactName: form.contactName,
      unitName: form.unitName,
      phone: form.phone,
      address: form.address,
      remark: form.remark,
    }
    if (form.id) await updateCustomer(form.id, payload)
    else await createCustomer(payload)
    ElMessage.success('已保存')
    visible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function onDelete(row: Customer) {
  await ElMessageBox.confirm(`确认删除「${row.name}」？`, '提示')
  await deleteCustomer(row.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(load)
</script>
