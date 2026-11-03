<template>
  <div>
    <div class="filter-card no-print">
      <el-date-picker
        v-model="dateFrom"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="开始日期"
        clearable
        style="width: 160px"
      />
      <span class="date-sep">至</span>
      <el-date-picker
        v-model="dateTo"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="结束日期"
        clearable
        style="width: 160px"
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
        :data="detailRows"
        stripe
        border
        row-key="rowKey"
        @selection-change="onDetailSelectionChange"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column label="录单日期" width="120" align="center">
          <template #default="{ row }">{{ formatDate(row.order.recordDate) }}</template>
        </el-table-column>
        <el-table-column label="下单日期" width="120" align="center">
          <template #default="{ row }">{{ formatDate(row.order.orderDate || row.order.recordDate) }}</template>
        </el-table-column>
        <el-table-column label="单位名称" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.order.unitName || '-' }}</template>
        </el-table-column>
        <el-table-column label="物品名称" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row.item.product.name }}</template>
        </el-table-column>
        <el-table-column label="货号" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.item.product.sku }}</template>
        </el-table-column>
        <el-table-column label="型号" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.item.product.model || '-' }}</template>
        </el-table-column>
        <el-table-column label="单位" width="70" align="center">
          <template #default="{ row }">{{ row.item.product.unit }}</template>
        </el-table-column>
        <el-table-column label="数量" width="80" align="right">
          <template #default="{ row }">{{ row.item.quantity }}</template>
        </el-table-column>
        <el-table-column label="单价" width="100" align="right">
          <template #default="{ row }">{{ Number(row.item.unitPrice).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="总价" width="100" align="right">
          <template #default="{ row }">{{ Number(row.item.amount).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link @click="openEdit(row.order)">编辑</el-button>
            <el-button link @click="openPrint(row.order)">打印</el-button>
            <el-button link type="danger" @click="onDelete(row.order)">删除</el-button>
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
        <el-form-item label="下单日期">
          <el-date-picker v-model="orderDate" type="date" value-format="YYYY-MM-DD" />
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
          <div>下单日期：{{ formatDate(printOrder.orderDate || printOrder.recordDate) }}</div>
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
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createInbound,
  deleteInbound,
  listInbounds,
  listProducts,
  updateInbound,
  type InboundOrder,
  type OrderItem,
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

type DetailRow = {
  rowKey: string
  order: InboundOrder
  item: OrderItem
}

const store = useUserStore()
const list = ref<InboundOrder[]>([])
const selectedIds = ref<string[]>([])
const dateFrom = ref('')
const dateTo = ref('')
const formVisible = ref(false)
const printVisible = ref(false)
const saving = ref(false)
const editingId = ref('')
const unitName = ref('')
const remark = ref('')
const recordDate = ref(today())
const orderDate = ref(today())
const lines = ref<Line[]>([])
const printOrder = ref<InboundOrder | null>(null)

const detailRows = computed<DetailRow[]>(() =>
  list.value.flatMap((order) =>
    order.items.map((item) => ({
      rowKey: `${order.id}-${item.id}`,
      order,
      item,
    })),
  ),
)

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

function resolveDateQuery() {
  const from = dateFrom.value || dateTo.value || ''
  const to = dateTo.value || dateFrom.value || ''
  return {
    from: from || undefined,
    to: to || undefined,
  }
}

async function load() {
  list.value = await listInbounds(resolveDateQuery())
  selectedIds.value = []
}

function onReset() {
  dateFrom.value = ''
  dateTo.value = ''
  load()
}

function onDetailSelectionChange(rows: DetailRow[]) {
  selectedIds.value = [...new Set(rows.map((r) => r.order.id))]
}

function openCreate() {
  editingId.value = ''
  unitName.value = store.user?.companyName || ''
  remark.value = ''
  recordDate.value = today()
  orderDate.value = today()
  lines.value = [emptyLine()]
  formVisible.value = true
}

function openEdit(row: InboundOrder) {
  editingId.value = row.id
  unitName.value = row.unitName || ''
  remark.value = row.remark || ''
  recordDate.value = row.recordDate.slice(0, 10)
  orderDate.value = (row.orderDate || row.recordDate).slice(0, 10)
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
    orderDate: orderDate.value,
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
  if (!recordDate.value || !orderDate.value) {
    ElMessage.warning('请填写录单日期和下单日期')
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
        formatDate(order.recordDate),
        formatDate(order.orderDate || order.recordDate),
        order.unitName || '',
        item.product.name,
        item.product.sku,
        item.product.model,
        item.product.unit,
        item.quantity,
        item.unitPrice,
        item.amount,
      ])
    }
  }
  downloadExcel(`入库明细_${today()}.xlsx`, [
    {
      name: '入库明细',
      headers: [
        '录单日期',
        '下单日期',
        '单位名称',
        '物品名称',
        '货号',
        '型号',
        '单位',
        '数量',
        '单价',
        '总价',
      ],
      rows: detailRows,
    },
  ])
  ElMessage.success('已导出 Excel')
}

onMounted(load)
</script>
