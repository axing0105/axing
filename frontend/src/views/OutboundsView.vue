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
      <el-button type="primary" @click="openCreate">+ 新建出库单</el-button>
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
        <el-table-column label="出库日期" width="120" align="center">
          <template #default="{ row }">{{ formatDate(row.order.orderDate) }}</template>
        </el-table-column>
        <el-table-column label="录单日期" width="120" align="center">
          <template #default="{ row }">{{ formatDate(row.order.recordDate) }}</template>
        </el-table-column>
        <el-table-column label="客户单位" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.order.customer?.unitName || row.order.unitName || '-' }}</template>
        </el-table-column>
        <el-table-column label="课题组" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ row.order.customer?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="经手人" width="90" align="center">
          <template #default="{ row }">{{ row.order.operator?.name || '-' }}</template>
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
      :title="editingId ? '编辑出库单' : '新建出库单'"
      width="1120px"
      top="5vh"
      class="no-print"
    >
      <el-form label-width="90px" inline>
        <el-form-item label="客户单位">
          <el-input v-model="unitName" style="width: 180px" placeholder="客户单位" />
        </el-form-item>
        <el-form-item label="课题组">
          <el-select
            v-model="customerId"
            filterable
            placeholder="选择课题组"
            style="width: 220px"
            @change="onCustomerChange"
          >
            <el-option
              v-for="c in customers"
              :key="c.id"
              :label="c.unitName ? `${c.name}（${c.unitName}）` : c.name"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="出库日期">
          <el-date-picker v-model="orderDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="录单日期">
          <el-date-picker v-model="recordDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="remark" style="width: 220px" />
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

    <el-dialog v-model="printVisible" title="出库单打印" width="960px" top="3vh" class="print-dialog no-print-chrome">
      <!-- 严格按纸质样张：标题、四行抬头、十列明细、联系方式、重要提示、签字 -->
      <div v-if="printOrder" class="print-sheet voucher-sheet" id="outbound-print">
        <div class="voucher-title-row">
          <div class="voucher-company">{{ printCompanyName }}</div>
          <div class="voucher-doctype">出库单</div>
        </div>

        <table class="voucher-meta">
          <colgroup>
            <col style="width: 17%" />
            <col style="width: 33%" />
            <col style="width: 17%" />
            <col style="width: 33%" />
          </colgroup>
          <tbody>
            <tr>
              <td class="lab">出库日期:</td>
              <td class="val">{{ formatPrintDate(printOrder.orderDate || printOrder.recordDate) }}</td>
              <td class="lab">单据编号:</td>
              <td class="val">{{ printOrder.orderNo }}</td>
            </tr>
            <tr>
              <td class="lab">客户单位:</td>
              <td class="val">{{ printCustomerUnit }}</td>
              <td class="lab">客户姓名:</td>
              <td class="val">{{ printContactName }}</td>
            </tr>
            <tr>
              <td class="lab">客户地址:</td>
              <td class="val">{{ printOrder.customer?.address || '' }}</td>
              <td class="lab">客户电话:</td>
              <td class="val">{{ printOrder.customer?.phone || '' }}</td>
            </tr>
            <tr>
              <td class="lab">课题组:</td>
              <td class="val">{{ printResearchGroup }}</td>
              <td class="lab">经手人:</td>
              <td class="val">{{ printHandler }}</td>
            </tr>
          </tbody>
        </table>

        <table class="voucher-items">
          <colgroup>
            <col style="width: 5%" />
            <col style="width: 10%" />
            <col style="width: 36%" />
            <col style="width: 7%" />
            <col style="width: 7%" />
            <col style="width: 7%" />
            <col style="width: 7%" />
            <col style="width: 7%" />
            <col style="width: 7%" />
            <col style="width: 7%" />
          </colgroup>
          <thead>
            <tr>
              <th>行号</th>
              <th>商品编号</th>
              <th>商品名称</th>
              <th>规格</th>
              <th>单位</th>
              <th>数量</th>
              <th>单价</th>
              <th>金额</th>
              <th>仓库</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in printItemRows" :key="row.key">
              <td class="c">{{ row.empty ? '' : idx + 1 }}</td>
              <td class="c">{{ row.empty ? '' : row.sku }}</td>
              <td class="name">{{ row.empty ? '' : row.name }}</td>
              <td class="c">{{ row.empty ? '' : row.model }}</td>
              <td class="c">{{ row.empty ? '' : row.unit }}</td>
              <td class="c">{{ row.empty ? '' : row.quantity }}</td>
              <td class="c">{{ row.empty ? '' : row.unitPrice }}</td>
              <td class="c">{{ row.empty ? '' : row.amount }}</td>
              <td class="c">{{ row.empty ? '' : row.warehouse }}</td>
              <td class="c"></td>
            </tr>
            <tr class="voucher-subtotal">
              <td colspan="5">本页小计: (小写) {{ formatMoney(printOrder.amount) }}</td>
              <td colspan="5">本页小计: (大写) {{ amountToChinese(printOrder.amount) }}</td>
            </tr>
          </tbody>
        </table>

        <table class="voucher-contact-table">
          <tbody>
            <tr>
              <td class="contact">
                公司联系方式: {{ printPhone }}
                <span class="qq">QQ: {{ printQq }}</span>
              </td>
            </tr>
            <tr>
              <td class="tips">
                重要提示: 如发现包装/发票/说明书/出库单等有问题，请于24小时内与我们联系；产品质量问题请在30天内与我们联系，逾期不提出，视为产品合格
              </td>
            </tr>
          </tbody>
        </table>

        <div class="voucher-sign-row">
          <span>客户签字:</span>
          <span>签收日期:</span>
        </div>
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
  createOutbound,
  deleteOutbound,
  listCustomers,
  listOutbounds,
  listProducts,
  updateOutbound,
  type Customer,
  type OrderItem,
  type OutboundOrder,
  type Product,
} from '@/api'
import { amountToChinese } from '@/utils/amountChinese'
import { downloadExcel } from '@/utils/excel'
import { useUserStore } from '@/stores/user'

type PrintSettings = {
  companyName?: string
  contact?: string
  phone?: string
  qq?: string
  defaultWarehouse?: string
  handler?: string
}

function readPrintSettings(): PrintSettings {
  try {
    const raw = localStorage.getItem('jxc_system_settings')
    if (!raw) return {}
    return JSON.parse(raw) as PrintSettings
  } catch {
    return {}
  }
}

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
  order: OutboundOrder
  item: OrderItem
}

const store = useUserStore()
const list = ref<OutboundOrder[]>([])
const selectedIds = ref<string[]>([])
const dateFrom = ref('')
const dateTo = ref('')
const customers = ref<Customer[]>([])
const formVisible = ref(false)
const printVisible = ref(false)
const saving = ref(false)
const editingId = ref('')
const unitName = ref('')
const customerId = ref('')
const remark = ref('')
const recordDate = ref(today())
const orderDate = ref(today())
const lines = ref<Line[]>([])
const printOrder = ref<OutboundOrder | null>(null)
const printSettings = ref<PrintSettings>({})

const printCompanyName = computed(
  () =>
    printSettings.value.companyName?.trim() ||
    store.user?.companyName?.trim() ||
    printOrder.value?.unitName?.trim() ||
    '四川信标生物科技有限公司',
)
const printCustomerUnit = computed(
  () =>
    printOrder.value?.customer?.unitName?.trim() ||
    printOrder.value?.unitName?.trim() ||
    '',
)
/** 模板「客户姓名」 */
const printContactName = computed(() => printOrder.value?.customer?.contactName?.trim() || '')
/** 模板「课题组」 */
const printResearchGroup = computed(() => printOrder.value?.customer?.name?.trim() || '')
/** 模板「经手人」：设置优先，否则开单人 */
const printHandler = computed(
  () =>
    printSettings.value.handler?.trim() ||
    printSettings.value.contact?.trim() ||
    printOrder.value?.operator?.name?.trim() ||
    store.user?.name?.trim() ||
    '',
)
const printPhone = computed(
  () => printSettings.value.phone?.trim() || '028-63916527',
)
const printQq = computed(() => printSettings.value.qq?.trim() || '1641192432')
const printWarehouse = computed(
  () => printSettings.value.defaultWarehouse?.trim() || '-',
)

/** 明细至少 5 行，对齐样张留白 */
const printItemRows = computed(() => {
  const warehouse = printWarehouse.value
  const items = printOrder.value?.items || []
  const rows = items.map((item, idx) => ({
    key: item.id || `i-${idx}`,
    empty: false,
    sku: item.product.sku || '-',
    name: item.product.name,
    model: item.product.model || '-',
    unit: item.product.unit,
    quantity: item.quantity,
    unitPrice: formatMoney(item.unitPrice),
    amount: formatMoney(item.amount),
    warehouse,
  }))
  while (rows.length < 5) {
    rows.push({
      key: `empty-${rows.length}`,
      empty: true,
      sku: '',
      name: '',
      model: '',
      unit: '',
      quantity: '' as unknown as number,
      unitPrice: '',
      amount: '',
      warehouse: '',
    })
  }
  return rows
})

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

/** 打印用日期：与 Word 模板一致 YYYY-MM-DD */
function formatPrintDate(v: string) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
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
  // 出库仅回填基础信息，数量/单价由人工填写
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
  list.value = await listOutbounds(resolveDateQuery())
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

function onCustomerChange(id: string) {
  const c = customers.value.find((item) => item.id === id)
  if (c?.unitName) unitName.value = c.unitName
  else if (!unitName.value) unitName.value = store.user?.companyName || ''
}

async function openCreate() {
  customers.value = await listCustomers()
  editingId.value = ''
  unitName.value = store.user?.companyName || ''
  customerId.value = ''
  remark.value = ''
  recordDate.value = today()
  orderDate.value = today()
  lines.value = [emptyLine()]
  formVisible.value = true
}

async function openEdit(row: OutboundOrder) {
  customers.value = await listCustomers()
  editingId.value = row.id
  unitName.value = row.unitName || ''
  customerId.value = row.customer?.id || ''
  remark.value = row.remark || ''
  recordDate.value = row.recordDate.slice(0, 10)
  orderDate.value = row.orderDate.slice(0, 10)
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

function formatMoney(v: number | string) {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function openPrint(row: OutboundOrder) {
  printSettings.value = readPrintSettings()
  printOrder.value = row
  printVisible.value = true
}

function doPrint() {
  const sheet = document.getElementById('outbound-print')
  if (!sheet) {
    ElMessage.warning('没有可打印内容')
    return
  }
  const win = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720')
  if (!win) {
    window.print()
    return
  }
  const css = `
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { padding: 10mm 8mm; color: #000;
      font-family: "宋体", SimSun, "Songti SC", "Noto Serif SC", serif; }
    .voucher-sheet { width: 100%; }
    .voucher-title-row { display: grid; grid-template-columns: 1fr auto; align-items: end;
      margin: 0 0 12px; padding: 0 2% 0 8%; }
    .voucher-company { text-align: center; font-size: 18pt; font-weight: 700; letter-spacing: 1px; }
    .voucher-doctype { font-size: 18pt; font-weight: 700; padding-left: 18px; white-space: nowrap; }
    .voucher-meta, .voucher-items, .voucher-contact-table { width: 100%; border-collapse: collapse;
      table-layout: fixed; border: 1px solid #000; }
    .voucher-meta td, .voucher-items th, .voucher-items td, .voucher-contact-table td {
      border: 1px solid #000; padding: 4px 6px; font-size: 10.5pt; line-height: 1.35;
      vertical-align: middle; white-space: normal; word-break: break-word; overflow-wrap: anywhere; }
    .voucher-meta tr { height: 32px; }
    .voucher-meta td.lab { text-align: left; font-weight: 700; }
    .voucher-meta td.val { text-align: left; font-weight: 400; }
    .voucher-items { margin-top: 32px; }
    .voucher-items th { text-align: center; font-weight: 700; height: 30px; }
    .voucher-items tbody tr:not(.voucher-subtotal) { height: 38px; }
    .voucher-items td.c { text-align: center; }
    .voucher-items td.name { text-align: left; }
    .voucher-subtotal td { text-align: left; height: 34px; }
    .voucher-contact-table { margin-top: 32px; }
    .voucher-contact-table td.contact { height: 30px; }
    .voucher-contact-table td.contact .qq { margin-left: 2em; }
    .voucher-contact-table td.tips { line-height: 1.55; padding: 8px 8px; }
    .voucher-sign-row { display: flex; justify-content: space-between; width: 72%;
      margin: 52px 0 12px 4%; font-size: 11pt; }
    @page { margin: 8mm; }
  `
  win.document.open()
  win.document.write(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>出库单</title>
<style>${css}</style>
</head>
<body>${sheet.outerHTML}</body>
</html>`)
  win.document.close()
  const trigger = () => {
    win.focus()
    win.print()
    win.close()
  }
  if (win.document.readyState === 'complete') setTimeout(trigger, 200)
  else win.onload = () => setTimeout(trigger, 200)
}

function payload() {
  return {
    unitName: unitName.value,
    customerId: customerId.value,
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
  if (!customerId.value) {
    ElMessage.warning('请选择课题组')
    return
  }
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
    if (editingId.value) await updateOutbound(editingId.value, payload())
    else await createOutbound(payload())
    ElMessage.success('已保存')
    formVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function onDelete(row: OutboundOrder) {
  await ElMessageBox.confirm(`确认删除出库单「${row.orderNo}」？将回退库存。`, '提示')
  await deleteOutbound(row.id)
  ElMessage.success('已删除')
  await load()
}

async function onBatchDelete() {
  await ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 张出库单？`, '提示')
  for (const id of selectedIds.value) {
    await deleteOutbound(id)
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
        formatDate(order.orderDate),
        formatDate(order.recordDate),
        order.customer?.unitName || order.unitName || '',
        order.customer?.name || '',
        order.operator?.name || '',
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
  downloadExcel(`出库明细_${today()}.xlsx`, [
    {
      name: '出库明细',
      headers: [
        '出库日期',
        '录单日期',
        '客户单位',
        '课题组',
        '经手人',
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
