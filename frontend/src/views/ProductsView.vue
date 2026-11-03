<template>
  <div>
    <div class="filter-card">
      <el-input
        v-model="keyword"
        placeholder="搜索名称/货号/型号/品牌"
        clearable
        style="width: 260px"
        @keyup.enter="load"
      />
      <el-select v-model="brandFilter" clearable placeholder="品牌" style="width: 160px">
        <el-option v-for="b in brands" :key="b" :label="b" :value="b" />
      </el-select>
      <div class="filter-actions">
        <el-button type="primary" @click="load">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </div>
    </div>

    <div class="action-row">
      <el-button type="primary" @click="openEdit()">+ 新增商品</el-button>
      <el-button @click="downloadTemplate">下载导入模板</el-button>
      <el-button :loading="importing" @click="triggerImport">批量导入</el-button>
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        style="display: none"
        @change="onImportFile"
      />
    </div>

    <div class="page-card">
      <el-tabs v-model="activeBrand" @tab-change="onTabChange">
        <el-tab-pane label="全部" name="__all__" />
        <el-tab-pane v-for="b in brands" :key="b" :label="b" :name="b" />
        <el-tab-pane v-if="hasUnbranded" label="未分类" name="__none__" />
      </el-tabs>

      <el-table :data="displayList" stripe>
        <el-table-column type="index" width="50" />
        <el-table-column prop="brand" label="品牌" min-width="110" />
        <el-table-column prop="name" label="物品名称" min-width="140" />
        <el-table-column prop="sku" label="货号" min-width="120" />
        <el-table-column prop="model" label="型号" min-width="120" />
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column prop="unitPrice" label="单价" width="100" />
        <el-table-column prop="stock" label="库存" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.stock > 0 ? 'success' : 'info'" effect="light" round>
              {{ row.stock }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="visible" :title="form.id ? '编辑商品' : '新增商品'" width="520px">
      <el-form label-width="90px">
        <el-form-item label="品牌">
          <el-select
            v-model="form.brand"
            filterable
            allow-create
            default-first-option
            clearable
            placeholder="选择或输入品牌"
            style="width: 100%"
          >
            <el-option v-for="b in brands" :key="b" :label="b" :value="b" />
          </el-select>
        </el-form-item>
        <el-form-item label="物品名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="货号"><el-input v-model="form.sku" /></el-form-item>
        <el-form-item label="型号"><el-input v-model="form.model" /></el-form-item>
        <el-form-item label="单位"><el-input v-model="form.unit" /></el-form-item>
        <el-form-item label="单价">
          <el-input-number v-model="form.unitPrice" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
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
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  batchImportProducts,
  createProduct,
  deleteProduct,
  listProductBrands,
  listProducts,
  updateProduct,
  type Product,
} from '@/api'
import { downloadExcel, mapHeader, readExcelFile } from '@/utils/excel'

const list = ref<Product[]>([])
const brands = ref<string[]>([])
const keyword = ref('')
const brandFilter = ref('')
const activeBrand = ref('__all__')
const visible = ref(false)
const saving = ref(false)
const importing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const form = reactive({
  id: '',
  brand: '',
  name: '',
  sku: '',
  model: '',
  unit: '件',
  unitPrice: 0,
  remark: '',
})

const hasUnbranded = computed(() => list.value.some((p) => !p.brand))

const displayList = computed(() => {
  if (activeBrand.value === '__all__') return list.value
  if (activeBrand.value === '__none__') return list.value.filter((p) => !p.brand)
  return list.value.filter((p) => p.brand === activeBrand.value)
})

async function loadBrands() {
  brands.value = await listProductBrands()
}

async function load() {
  list.value = await listProducts({
    q: keyword.value || undefined,
    brand: brandFilter.value || undefined,
  })
  await loadBrands()
}

function onReset() {
  keyword.value = ''
  brandFilter.value = ''
  activeBrand.value = '__all__'
  load()
}

function onTabChange() {
  // displayList is computed from activeBrand
}

function openEdit(row?: Product) {
  form.id = row?.id || ''
  form.brand = row?.brand || ''
  form.name = row?.name || ''
  form.sku = row?.sku || ''
  form.model = row?.model || ''
  form.unit = row?.unit || '件'
  form.unitPrice = row?.unitPrice ?? 0
  form.remark = row?.remark || ''
  visible.value = true
}

async function onSave() {
  saving.value = true
  try {
    const payload = {
      brand: form.brand || '',
      name: form.name,
      sku: form.sku,
      model: form.model,
      unit: form.unit,
      unitPrice: form.unitPrice,
      remark: form.remark,
    }
    if (form.id) await updateProduct(form.id, payload)
    else await createProduct(payload)
    ElMessage.success('已保存')
    visible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function onDelete(row: Product) {
  await ElMessageBox.confirm(`确认删除「${row.name}」？`, '提示')
  await deleteProduct(row.id)
  ElMessage.success('已删除')
  await load()
}

function downloadTemplate() {
  downloadExcel('研物通-商品导入模板.xlsx', [
    {
      name: '商品导入',
      headers: ['品牌', '物品名称', '货号', '型号', '单位', '单价', '备注'],
      rows: [['实验品牌', '示例试剂', 'SKU-001', 'A1', '瓶', 12.5, '可删除此行后填写']],
    },
  ])
}

function triggerImport() {
  fileInput.value?.click()
}

async function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  importing.value = true
  try {
    const rows = await readExcelFile(file)
    if (rows.length < 2) {
      ElMessage.warning('文件为空或缺少数据行')
      return
    }
    const keys = rows[0].map(mapHeader)
    if (!keys.includes('name') || !keys.includes('sku')) {
      ElMessage.warning('模板需包含「物品名称」「货号」列')
      return
    }

    const items: Record<string, unknown>[] = []
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i]
      const obj: Record<string, unknown> = {
        brand: '',
        name: '',
        sku: '',
        model: '',
        unit: '件',
        unitPrice: 0,
        remark: '',
      }
      keys.forEach((k, idx) => {
        if (!k) return
        const val = cols[idx] ?? ''
        if (k === 'unitPrice') obj.unitPrice = Number(val) || 0
        else obj[k] = val
      })
      if (!obj.name || !obj.sku) continue
      items.push(obj)
    }

    if (!items.length) {
      ElMessage.warning('没有可导入的有效数据')
      return
    }

    // #region agent log
    fetch('http://127.0.0.1:7806/ingest/2da1c4ab-a37a-465a-861d-1570c3581ff1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '407d1e' },
      body: JSON.stringify({
        sessionId: '407d1e',
        runId: 'excel',
        hypothesisId: 'H5',
        location: 'ProductsView.vue:onImportFile',
        message: 'excel import payload ready',
        data: { itemCount: items.length, sampleSku: items[0]?.sku },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion

    const result = await batchImportProducts(items)
    ElMessage.success(`导入完成：新增 ${result.created}，更新 ${result.updated}，失败 ${result.failed}`)
    await load()
  } catch {
    ElMessage.error('导入失败，请检查 Excel 格式')
  } finally {
    importing.value = false
  }
}

onMounted(load)
</script>
