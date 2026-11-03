<template>
  <div class="page-card">
    <el-tabs v-model="tab" class="no-print">
      <el-tab-pane label="近期流水" name="ledger">
        <div class="filter-card" style="margin-bottom: 14px">
          <el-date-picker
            v-model="ledgerFrom"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="开始日期"
            clearable
            style="width: 160px"
          />
          <span class="date-sep">至</span>
          <el-date-picker
            v-model="ledgerTo"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="结束日期"
            clearable
            style="width: 160px"
          />
          <div class="filter-actions">
            <el-button type="primary" @click="loadLedger">查询</el-button>
            <el-button @click="onResetLedger">重置（近一个月）</el-button>
            <el-button @click="exportLedger">导出 Excel</el-button>
          </div>
        </div>
        <el-table :data="ledger" stripe>
          <el-table-column label="日期" width="120">
            <template #default="{ row }">{{ formatDate(row.date) }}</template>
          </el-table-column>
          <el-table-column prop="typeLabel" label="类型" width="90" />
          <el-table-column prop="orderNo" label="单号" min-width="160" />
          <el-table-column prop="party" label="课题组" min-width="120" />
          <el-table-column prop="amount" label="金额" width="120" />
          <el-table-column prop="operator" label="操作人" width="110" />
          <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
        </el-table>

        <div class="ledger-summary">
          <div class="summary-title">本区间汇总</div>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="label">入库数量</span>
              <span class="value">{{ summary.inboundQty }}</span>
            </div>
            <div class="summary-item">
              <span class="label">入库金额</span>
              <span class="value">￥{{ summary.inboundAmount.toFixed(2) }}</span>
            </div>
            <div class="summary-item">
              <span class="label">出库数量</span>
              <span class="value">{{ summary.outboundQty }}</span>
            </div>
            <div class="summary-item">
              <span class="label">出库金额</span>
              <span class="value">￥{{ summary.outboundAmount.toFixed(2) }}</span>
            </div>
            <div class="summary-item accent">
              <span class="label">毛利利润</span>
              <span class="value">￥{{ summary.grossProfit.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="年底对账" name="yearend">
        <div class="toolbar no-print">
          <el-input-number v-model="yearEndYear" :min="2000" :max="2100" />
          <el-button type="primary" @click="loadYearEnd">查询</el-button>
          <el-button @click="exportYearEnd">导出 Excel</el-button>
          <el-button @click="printYearEnd">打印对账</el-button>
        </div>
        <div class="print-sheet" id="yearend-print">
          <h2>{{ yearEnd?.year }} 年度对账</h2>
          <div class="print-meta">
            <div>入库合计：￥{{ yearEnd?.inboundTotal ?? 0 }}</div>
            <div>出库合计：￥{{ yearEnd?.outboundTotal ?? 0 }}</div>
            <div>交易笔数：{{ yearEnd?.tradeCountTotal ?? 0 }}</div>
            <div>毛利/差额：￥{{ yearEnd?.balanceDiff ?? 0 }}</div>
          </div>
          <el-table :data="yearEnd?.months || []" border stripe>
            <el-table-column prop="month" label="月份" width="90">
              <template #default="{ row }">{{ row.month }} 月</template>
            </el-table-column>
            <el-table-column prop="inbound" label="入库金额" />
            <el-table-column prop="outbound" label="出库金额" />
            <el-table-column prop="tradeCount" label="交易笔数" />
            <el-table-column prop="grossProfit" label="毛利" />
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getFinanceLedger,
  getFinanceYearEnd,
  type LedgerRow,
  type LedgerSummary,
  type YearEndReport,
} from '@/api'
import { downloadExcel } from '@/utils/excel'

const tab = ref('ledger')
const yearEndYear = ref(new Date().getFullYear())
const yearEnd = ref<YearEndReport | null>(null)
const ledger = ref<LedgerRow[]>([])
const summary = ref<LedgerSummary>({
  inboundQty: 0,
  outboundQty: 0,
  inboundAmount: 0,
  outboundAmount: 0,
  grossProfit: 0,
})
const ledgerFrom = ref(daysAgoStr(30))
const ledgerTo = ref(todayStr())

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function todayStr() {
  return fmt(new Date())
}

function daysAgoStr(days: number) {
  return fmt(new Date(Date.now() - days * 24 * 60 * 60 * 1000))
}

function resolveLedgerRange() {
  const from = ledgerFrom.value || ledgerTo.value || daysAgoStr(30)
  const to = ledgerTo.value || ledgerFrom.value || todayStr()
  return { from, to }
}

function formatDate(v: string) {
  return v ? new Date(v).toLocaleDateString() : ''
}

async function loadLedger() {
  const { from, to } = resolveLedgerRange()
  const res = await getFinanceLedger({ from, to, limit: 2000 })
  ledger.value = res.rows || []
  summary.value = res.summary || {
    inboundQty: 0,
    outboundQty: 0,
    inboundAmount: 0,
    outboundAmount: 0,
    grossProfit: 0,
  }
}

function onResetLedger() {
  ledgerFrom.value = daysAgoStr(30)
  ledgerTo.value = todayStr()
  loadLedger()
}

function exportLedger() {
  if (!ledger.value.length) {
    ElMessage.warning('暂无流水可导出')
    return
  }
  const { from, to } = resolveLedgerRange()
  downloadExcel(`财务流水_${from}_${to}.xlsx`, [
    {
      name: '近期流水',
      headers: ['日期', '类型', '单号', '课题组', '金额', '操作人', '备注'],
      rows: ledger.value.map((row) => [
        formatDate(row.date),
        row.typeLabel,
        row.orderNo,
        row.party || '',
        row.amount,
        row.operator || '',
        row.remark || '',
      ]),
    },
    {
      name: '区间汇总',
      headers: ['入库数量', '入库金额', '出库数量', '出库金额', '毛利利润'],
      rows: [
        [
          summary.value.inboundQty,
          summary.value.inboundAmount,
          summary.value.outboundQty,
          summary.value.outboundAmount,
          summary.value.grossProfit,
        ],
      ],
    },
  ])
  ElMessage.success('已导出 Excel')
}

function exportYearEnd() {
  if (!yearEnd.value?.months?.length) {
    ElMessage.warning('暂无对账数据可导出')
    return
  }
  downloadExcel(`年底对账_${yearEnd.value.year}.xlsx`, [
    {
      name: '年度汇总',
      headers: ['年份', '入库合计', '出库合计', '交易笔数', '毛利/差额'],
      rows: [
        [
          yearEnd.value.year,
          yearEnd.value.inboundTotal,
          yearEnd.value.outboundTotal,
          yearEnd.value.tradeCountTotal ?? 0,
          yearEnd.value.balanceDiff,
        ],
      ],
    },
    {
      name: '月度明细',
      headers: ['月份', '入库金额', '出库金额', '交易笔数', '毛利'],
      rows: yearEnd.value.months.map((m) => [
        m.month,
        m.inbound,
        m.outbound,
        m.tradeCount,
        m.grossProfit,
      ]),
    },
  ])
  ElMessage.success('已导出 Excel')
}

async function loadYearEnd() {
  yearEnd.value = await getFinanceYearEnd(yearEndYear.value)
}

function printYearEnd() {
  window.print()
}

onMounted(async () => {
  await Promise.all([loadLedger(), loadYearEnd()])
})
</script>

<style scoped>
.ledger-summary {
  margin-top: 16px;
  padding: 16px 18px;
  border: 1px solid var(--jxc-border, #e5e7eb);
  border-radius: 8px;
  background: #f8fafc;
}

.summary-title {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 12px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(120px, 1fr));
  gap: 12px;
}

.summary-item {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-item .label {
  font-size: 12px;
  color: #64748b;
}

.summary-item .value {
  font-size: 18px;
  font-weight: 650;
  color: #0f172a;
}

.summary-item.accent {
  border-color: #fbbf24;
  background: #fffbeb;
}

.summary-item.accent .value {
  color: #b45309;
}

@media (max-width: 900px) {
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
