<template>
  <div class="page-card">
    <el-tabs v-model="tab" class="no-print">
      <el-tab-pane label="近期流水" name="ledger">
        <div class="filter-card" style="margin-bottom: 14px">
          <el-date-picker
            v-model="ledgerRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          />
          <div class="filter-actions">
            <el-button type="primary" @click="loadLedger">查询</el-button>
            <el-button @click="onResetLedger">重置</el-button>
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
      </el-tab-pane>

      <el-tab-pane label="毛利计算" name="profit">
        <div class="toolbar">
          <el-input-number v-model="year" :min="2000" :max="2100" />
          <el-button type="primary" @click="loadSummary">查询</el-button>
          <el-button @click="exportProfit">导出 Excel</el-button>
          <div class="spacer" />
          <el-tag type="info">入库：￥{{ summary?.inboundTotal ?? 0 }}</el-tag>
          <el-tag type="success">出库：￥{{ summary?.outboundTotal ?? 0 }}</el-tag>
          <el-tag type="warning">毛利：￥{{ summary?.grossProfit ?? 0 }}</el-tag>
        </div>
        <div ref="chartRef" class="chart" />
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
            <div>毛利/差额：￥{{ yearEnd?.balanceDiff ?? 0 }}</div>
          </div>
          <el-table :data="yearEnd?.months || []" border stripe>
            <el-table-column prop="month" label="月份" width="90">
              <template #default="{ row }">{{ row.month }} 月</template>
            </el-table-column>
            <el-table-column prop="inbound" label="入库金额" />
            <el-table-column prop="outbound" label="出库金额" />
            <el-table-column prop="grossProfit" label="毛利" />
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import {
  getFinanceLedger,
  getFinanceSummary,
  getFinanceYearEnd,
  type FinanceSummary,
  type LedgerRow,
  type YearEndReport,
} from '@/api'
import { downloadExcel } from '@/utils/excel'

const tab = ref('ledger')
const year = ref(new Date().getFullYear())
const yearEndYear = ref(new Date().getFullYear())
const summary = ref<FinanceSummary | null>(null)
const yearEnd = ref<YearEndReport | null>(null)
const ledger = ref<LedgerRow[]>([])
const ledgerRange = ref<[string, string] | null>(defaultRange())
const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

function defaultRange(): [string, string] {
  const to = new Date()
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  return [fmt(from), fmt(to)]
}

function formatDate(v: string) {
  return v ? new Date(v).toLocaleDateString() : ''
}

async function loadLedger() {
  const [from, to] = ledgerRange.value || defaultRange()
  ledger.value = await getFinanceLedger({ from, to, limit: 200 })
}

function onResetLedger() {
  ledgerRange.value = defaultRange()
  loadLedger()
}

function exportLedger() {
  if (!ledger.value.length) {
    ElMessage.warning('暂无流水可导出')
    return
  }
  const [from, to] = ledgerRange.value || defaultRange()
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
  ])
  ElMessage.success('已导出 Excel')
}

function exportProfit() {
  if (!summary.value?.months?.length) {
    ElMessage.warning('暂无毛利数据可导出')
    return
  }
  downloadExcel(`毛利计算_${summary.value.year}.xlsx`, [
    {
      name: '年度汇总',
      headers: ['年份', '入库合计', '出库合计', '毛利'],
      rows: [
        [
          summary.value.year,
          summary.value.inboundTotal,
          summary.value.outboundTotal,
          summary.value.grossProfit,
        ],
      ],
    },
    {
      name: '月度明细',
      headers: ['月份', '入库金额', '出库金额', '毛利'],
      rows: summary.value.months.map((m) => [m.month, m.inbound, m.outbound, m.grossProfit]),
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
      headers: ['年份', '入库合计', '出库合计', '毛利/差额'],
      rows: [
        [
          yearEnd.value.year,
          yearEnd.value.inboundTotal,
          yearEnd.value.outboundTotal,
          yearEnd.value.balanceDiff,
        ],
      ],
    },
    {
      name: '月度明细',
      headers: ['月份', '入库金额', '出库金额', '毛利'],
      rows: yearEnd.value.months.map((m) => [m.month, m.inbound, m.outbound, m.grossProfit]),
    },
  ])
  ElMessage.success('已导出 Excel')
}

async function loadSummary() {
  summary.value = await getFinanceSummary(year.value)
  await nextTick()
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['入库', '出库', '毛利'] },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: (summary.value?.months || []).map((m) => `${m.month}月`),
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '入库',
        type: 'bar',
        data: (summary.value?.months || []).map((m) => m.inbound),
      },
      {
        name: '出库',
        type: 'bar',
        data: (summary.value?.months || []).map((m) => m.outbound),
      },
      {
        name: '毛利',
        type: 'line',
        data: (summary.value?.months || []).map((m) => m.grossProfit),
      },
    ],
  })
}

async function loadYearEnd() {
  yearEnd.value = await getFinanceYearEnd(yearEndYear.value)
}

function printYearEnd() {
  window.print()
}

function onResize() {
  chart?.resize()
}

onMounted(async () => {
  await Promise.all([loadLedger(), loadSummary(), loadYearEnd()])
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  chart?.dispose()
})
</script>

<style scoped>
.chart {
  height: 420px;
  width: 100%;
}
</style>
