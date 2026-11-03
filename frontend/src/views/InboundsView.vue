<template>
  <div>
    <div class="filter-card no-print">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        style="width: 280px"
      />
      <div class="filter-actions">
        <el-button type="primary" @click="load">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </div>
    </div>

    <div class="action-row no-print">
      <el-button type="primary" @click="openCreate">+ 新建入库单</el-button>
      <el-button :disabled="!selectedIds.length" @click="onBatchDelete">删除所选</el-button>
      <el-button @click="onExport">导出 Excel</el-button>
    </div>

    <div class="page-card no-print">
      <el-table
        ref="tableRef"
        :data="list"
        stripe
        row-key="id"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column type="expand">
          <template #default="{ row }">
            <el-table :data="row.items" size="small" border>
              <el-table-column label="物品名称" min-width="140">
                <template #default="{ row: item }">{{ item.product.name }}</template>
              </el-table-column>
              <el-table-column label="货号" min-width="120">
                <template #default="{ row: item }">{{ item.product.sku }}</template>
              </el-table-column>
              <el-table-column label="型号" width="110">
                <template #default="{ row: item }">{{ item.product.model }}</template>
              </el-table-column>
              <el-table-column label="单位" width="70">
                <template #default="{ row: item }">{{ item.product.unit }}</template>
              </el-table-column>
              <el-table-column prop="quantity" label="数量" width="80" />
              <el-table-column prop="unitPrice" label="单价" width="90" />
              <el-table-column prop="amount" label="总价" width="90" />
            </el-table>
          </template>
        </el-table-column>
        <el-table-column prop="orderNo" label="单号" min-width="150" />
        <el-table-column prop="unitName" label="单位名称" min-width="120">
          <template #default="{ row }">{{ row.unitName || '-' }}</template>
        </el-table-column>
        <el-table-column label="录单日期" width="120">
          <template #default="{ row }">{{ formatDate(row.recordDate) }}</template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="100" />
        <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
        <el-table-column label="明细数" width="80">
          <template #default="{ row }">{{ row.items.length }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link @click="openEdit(row)">编辑</el-button>
            <el-button link @click="openPrint(row)">打印</el-button>
            <el-button link type="danger" @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="formVisible"
      :title="editingId ? '编辑入库单' : '新建入库单'"
      width="1100px"
      top="5vh"
      class="no-print"
    >
      <el-form label-width="90px" inline>
        <el-form-item label="单位名称">
          <el-input v-model="unitName" style="width: 200px" placeholder="开单单位" />
        </el-form-item>
        <el-form-item label="录单日期">
          <el-date-picker v-model="recordDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="remark" style="width: 280px" placeholder="整单备注" />
        </el-form-item>
      </el-form>
      <div class="toolbar">
        <el-button @click="addLine">添加商品行</el-button>
      </div>
      <el-table :data="lines" border max-height="420">
        <el-table-column label="物品名称" min-width="180">
          <template #default="{ row }">
            <el-autocomplete
              v-model="row.name"
              :fetch-suggestions="queryName"
              placeholder="输入或搜索名称"
              style="width: 100%"
              value-key="name"
              @select="(item: Product) => applyProduct(row, item)"
              @change="() => onManualEdit(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="货号" min-width="160">
          <template #default="{ row }">
            <el-autocomplete
              v-model="row.sku"
              :fetch-suggestions="querySku"
              placeholder="输入或搜索货号"
              style="width: 100%"
              value-key="sku"
              @select="(item: Product) => applyProduct(row, item)"
              @change="() => onManualEdit(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="型号" width="120">
          <template #default="{ row }"><el-input v-model="row.model" /></template>
        </el-table-column>
        <el-table-column label="单位" width="90">
          <template #default="{ row }"><el-input v-model="row.unit" /></template>
        </el-table-column>
        <el-table-column label="数量" width="130">
          <template #default="{ row }">
            <el-input-number v-model="row.quantity" :min="1" @change="recalc(row)" />
          </template>
        </el-table-column>
        <el-table-column label="单价" width="140">
          <template #default="{ row }">
            <el-input-number v-model="row.unitPrice" :min="0" :precision="2" @change="recalc(row)" />
          </template>
        </el-table-column>
        <el-table-column label="总价" width="100">
          <template #default="{ row }">{{ row.amount.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ $index }">
            <el-button link type="danger" @click="lines.splice($index, 1)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="printVisible" title="入库单打印" width="760px" class="no-print">
      <div v-if="printOrder" class="print-sheet" id="inbound-print">
        <h2>入库单</h2>
        <div class="print-meta">
          <div>单号：{{ printOrder.orderNo }}</div>
          <div>单位名称：{{ printOrder.unitName || '-' }}</div>
          <div>录单日期：{{ formatDate(printOrder.recordDate) }}</div>
          <div>金额：￥{{ printOrder.amount }}</div>
          <div>操作人：{{ printOrder.operator?.name }}</div>
          <div style="grid-column: 1 / -1">备注：{{ printOrder.remark || '-' }}</div>
        </div>
        <el-table :data="printOrder.items" border size="small">
          <el-table-column label="物品名称">
            <template #default="{ row }">{{ row.product.name }}</template>
          </el-table-column>
          <el-table-column label="货号">
            <template #default="{ row }">{{ row.product.sku }}</template>
          </el-table-column>
          <el-table-column label="型号">
            <template #default="{ row }">{{ row.product.model }}</template>
          </el-table-column>
          <el-table-column label="单位" width="70">
            <template #default="{ row }">{{ row.product.unit }}</template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="unitPrice" label="单价" width="90" />
          <el-table-column prop="amount" label="总价" width="90" />
        </el-table>
      </div>
      <template #footer>
        <el-button class="no-print" @click="printVisible = false">关闭</el-button>
        <el-button class="no-print" type="primary" @click="doPrint">打印</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createInbound,
  deleteInbound,
  listInbounds,
  listProducts,
  updateInbound,
  type InboundOrder,
  type Product,
} from '@/api'
import { downloadExcel } from '@/utils/excel'
import { useUserStore } from '@/stores/user'

type Line = {
  productId: string
  name: string
  sku: string
  model: string
  unit: string
  quantity: number
  unitPrice: number
  amount: number
}

const store = useUserStore()
const list = ref<InboundOrder[]>([])
const selectedIds = ref<string[]>([])
const dateRange = ref<[string, string] | null>(null)
const formVisible = ref(false)
const printVisible = ref(false)
const saving = ref(false)
const editingId = ref('')
const unitName = ref('')
const remark = ref('')
const recordDate = ref(today())
const lines = ref<Line[]>([])
const printOrder = ref<InboundOrder | null>(null)

function today() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDate(v: string) {
  if (!v) return ''
  return new Date(v).toLocaleDateString()
}

function emptyLine(): Line {
  return {
    productId: '',
    name: '',
    sku: '',
    model: '',
    unit: '件',
    quantity: 1,
    unitPrice: 0,
    amount: 0,
  }
}

function recalc(row: Line) {
  row.amount = Number((row.quantity * row.unitPrice).toFixed(2))
}

function onManualEdit(row: Line) {
  row.productId = ''
  recalc(row)
}

function applyProduct(row: Line, p: Product) {
  row.productId = p.id
  row.name = p.name
  row.sku = p.sku
  row.model = p.model
  row.unit = p.unit
  row.unitPrice = Number(p.unitPrice)
  recalc(row)
}

async function queryName(q: string, cb: (rows: Product[]) => void) {
  cb(await listProducts({ q: q || undefined }))
}

async function querySku(q: string, cb: (rows: Product[]) => void) {
  cb(await listProducts({ q: q || undefined }))
}

async function load() {
  const [from, to] = dateRange.value || []
  list.value = await listInbounds({
    from: from || undefined,
    to: to || undefined,
  })
  selectedIds.value = []
  // #region agent log
  fetch('http://127.0.0.1:7806/ingest/2da1c4ab-a37a-465a-861d-1570c3581ff1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '407d1e' },
    body: JSON.stringify({
      sessionId: '407d1e',
      runId: 'orders-ui',
      hypothesisId: 'H4',
      location: 'InboundsView.vue:load',
      message: 'inbound orders loaded',
      data: { count: list.value.length, hasUnitName: list.value.some((o) => !!o.unitName) },
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion
}

function onReset() {
  dateRange.value = null
  load()
}

function onSelectionChange(rows: InboundOrder[]) {
  selectedIds.value = rows.map((r) => r.id)
}

function openCreate() {
  editingId.value = ''
  unitName.value = store.user?.companyName || ''
  remark.value = ''
  recordDate.value = today()
  lines.value = [emptyLine()]
  formVisible.value = true
}

function openEdit(row: InboundOrder) {
  editingId.value = row.id
  unitName.value = row.unitName || ''
  remark.value = row.remark || ''
  recordDate.value = row.recordDate.slice(0, 10)
  lines.value = row.items.map((item) => ({
    productId: item.product.id,
    name: item.product.name,
    sku: item.product.sku,
    model: item.product.model,
    unit: item.product.unit,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    amount: Number(item.amount),
  }))
  formVisible.value = true
}

function addLine() {
  lines.value.push(emptyLine())
}

function openPrint(row: InboundOrder) {
  printOrder.value = row
  printVisible.value = true
}

function doPrint() {
  window.print()
}

function payload() {
  return {
    unitName: unitName.value,
    recordDate: recordDate.value,
    remark: remark.value,
    items: lines.value.map((l) => ({
      productId: l.productId || undefined,
      name: l.name,
      sku: l.sku,
      model: l.model,
      unit: l.unit,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
    })),
  }
}

async function onSave() {
  if (!recordDate.value) {
    ElMessage.warning('请选择录单日期')
    return
  }
  if (lines.value.some((l) => (!l.name && !l.sku) || l.quantity < 1)) {
    ElMessage.warning('请完善商品行（物品名称或货号）')
    return
  }
  saving.value = true
  try {
    if (editingId.value) await updateInbound(editingId.value, payload())
    else await createInbound(payload())
    ElMessage.success('已保存')
    formVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function onDelete(row: InboundOrder) {
  await ElMessageBox.confirm(`确认删除入库单「${row.orderNo}」？将回退库存。`, '提示')
  await deleteInbound(row.id)
  ElMessage.success('已删除')
  await load()
}

async function onBatchDelete() {
  await ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 张入库单？`, '提示')
  for (const id of selectedIds.value) {
    await deleteInbound(id)
  }
  ElMessage.success('已删除所选')
  await load()
}

function onExport() {
  const rows = selectedIds.value.length
    ? list.value.filter((o) => selectedIds.value.includes(o.id))
    : list.value
  if (!rows.length) {
    ElMessage.warning('暂无数据可导出')
    return
  }
  const detailRows: (string | number)[][] = []
  for (const order of rows) {
    for (const item of order.items) {
      detailRows.push([
        order.orderNo,
        order.unitName || '',
        formatDate(order.recordDate),
        item.product.name,
        item.product.sku,
        item.product.model,
        item.product.unit,
        item.quantity,
        item.unitPrice,
        item.amount,
        order.remark || '',
      ])
    }
  }
  downloadExcel(`入库明细_${today()}.xlsx`, [
    {
      name: '入库明细',
      headers: [
        '单号',
        '单位名称',
        '录单日期',
        '物品名称',
        '货号',
        '型号',
        '单位',
        '数量',
        '单价',
        '总价',
        '备注',
      ],
      rows: detailRows,
    },
  ])
  ElMessage.success('已导出 Excel')
}

onMounted(load)
</script>
