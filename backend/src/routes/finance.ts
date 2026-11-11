import { Router, Request, Response } from 'express'
import { prisma } from '../prisma'
import { adminRequired, authRequired } from '../middleware/auth'
import { serialize } from '../utils/serialize'

const router = Router()
router.use(authRequired, adminRequired)

function yearRange(year: number) {
  const start = new Date(year, 0, 1)
  const end = new Date(year + 1, 0, 1)
  return { start, end }
}

async function buildYearSummary(year: number, tenantId: string) {
  const { start, end } = yearRange(year)

  const [inbounds, outbounds] = await Promise.all([
    prisma.inboundOrder.findMany({
      where: { tenantId, recordDate: { gte: start, lt: end } },
      select: { amount: true, recordDate: true },
    }),
    prisma.outboundOrder.findMany({
      where: { tenantId, recordDate: { gte: start, lt: end } },
      select: { amount: true, recordDate: true },
    }),
  ])

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    inbound: 0,
    outbound: 0,
    tradeCount: 0,
  }))

  for (const row of inbounds) months[row.recordDate.getMonth()].inbound += Number(row.amount)
  for (const row of outbounds) {
    const m = months[row.recordDate.getMonth()]
    m.outbound += Number(row.amount)
    m.tradeCount += 1
  }

  const mapped = months.map((m) => {
    const inbound = Number(m.inbound.toFixed(2))
    const outbound = Number(m.outbound.toFixed(2))
    return {
      month: m.month,
      inbound,
      outbound,
      tradeCount: m.tradeCount,
      grossProfit: Number((outbound - inbound).toFixed(2)),
    }
  })

  const inboundTotal = Number(mapped.reduce((s, m) => s + m.inbound, 0).toFixed(2))
  const outboundTotal = Number(mapped.reduce((s, m) => s + m.outbound, 0).toFixed(2))
  const tradeCountTotal = mapped.reduce((s, m) => s + m.tradeCount, 0)
  const grossProfit = Number((outboundTotal - inboundTotal).toFixed(2))

  return {
    year,
    inboundTotal,
    outboundTotal,
    tradeCountTotal,
    grossProfit,
    months: mapped,
  }
}

async function summaryHandler(req: Request, res: Response) {
  const year = Number(req.query.year) || new Date().getFullYear()
  res.json(await buildYearSummary(year, req.user!.tenantId))
}

router.get('/summary', summaryHandler)
router.get('/', summaryHandler)

router.get('/ledger', async (req, res) => {
  const tenantId = req.user!.tenantId
  const limit = Math.min(Number(req.query.limit) || 500, 2000)
  const fromRaw = String(req.query.from || '').trim()
  const toRaw = String(req.query.to || '').trim()
  const from = fromRaw || toRaw
    ? new Date(`${fromRaw || toRaw}T00:00:00`)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const end =
    toRaw || fromRaw
      ? new Date(`${toRaw || fromRaw}T23:59:59.999`)
      : (() => {
          const d = new Date()
          d.setHours(23, 59, 59, 999)
          return d
        })()

  const [inbounds, outbounds] = await Promise.all([
    prisma.inboundOrder.findMany({
      where: { tenantId, recordDate: { gte: from, lte: end } },
      include: {
        operator: { select: { name: true } },
      },
      orderBy: { recordDate: 'desc' },
    }),
    prisma.outboundOrder.findMany({
      where: { tenantId, recordDate: { gte: from, lte: end } },
      include: {
        customer: true,
        operator: { select: { name: true } },
      },
      orderBy: { recordDate: 'desc' },
    }),
  ])

  const inboundQty = inbounds.length
  const outboundQty = outbounds.length
  const inboundAmount = Number(
    inbounds.reduce((sum, o) => sum + Number(o.amount), 0).toFixed(2),
  )
  const outboundAmount = Number(
    outbounds.reduce((sum, o) => sum + Number(o.amount), 0).toFixed(2),
  )
  const grossProfit = Number((outboundAmount - inboundAmount).toFixed(2))

  const rows = [
    ...inbounds.map((o) => ({
      id: o.id,
      type: 'IN' as const,
      typeLabel: '入库',
      date: o.recordDate,
      orderNo: o.orderNo,
      party: '',
      amount: Number(o.amount),
      remark: o.remark,
      operator: o.operator.name,
    })),
    ...outbounds.map((o) => ({
      id: o.id,
      type: 'OUT' as const,
      typeLabel: '出库',
      date: o.recordDate,
      orderNo: o.orderNo,
      party: o.customer.name,
      amount: Number(o.amount),
      remark: o.remark,
      operator: o.operator.name,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)

  res.json(
    serialize({
      rows,
      summary: {
        inboundQty,
        outboundQty,
        inboundAmount,
        outboundAmount,
        grossProfit,
      },
    }),
  )
})

router.get('/year-end', async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear()
  const summary = await buildYearSummary(year, req.user!.tenantId)
  res.json({
    ...summary,
    balanceDiff: summary.grossProfit,
  })
})

export default router
