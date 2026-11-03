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

async function buildYearSummary(year: number) {
  const { start, end } = yearRange(year)

  const [inbounds, outbounds] = await Promise.all([
    prisma.inboundOrder.findMany({
      where: { recordDate: { gte: start, lt: end } },
      select: { amount: true, recordDate: true },
    }),
    prisma.outboundOrder.findMany({
      where: { recordDate: { gte: start, lt: end } },
      select: { amount: true, recordDate: true },
    }),
  ])

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    inbound: 0,
    outbound: 0,
  }))

  for (const row of inbounds) months[row.recordDate.getMonth()].inbound += Number(row.amount)
  for (const row of outbounds) months[row.recordDate.getMonth()].outbound += Number(row.amount)

  const mapped = months.map((m) => {
    const inbound = Number(m.inbound.toFixed(2))
    const outbound = Number(m.outbound.toFixed(2))
    return {
      month: m.month,
      inbound,
      outbound,
      grossProfit: Number((outbound - inbound).toFixed(2)),
    }
  })

  const inboundTotal = Number(mapped.reduce((s, m) => s + m.inbound, 0).toFixed(2))
  const outboundTotal = Number(mapped.reduce((s, m) => s + m.outbound, 0).toFixed(2))
  const grossProfit = Number((outboundTotal - inboundTotal).toFixed(2))

  return {
    year,
    inboundTotal,
    outboundTotal,
    grossProfit,
    months: mapped,
  }
}

async function summaryHandler(req: Request, res: Response) {
  const year = Number(req.query.year) || new Date().getFullYear()
  res.json(await buildYearSummary(year))
}

router.get('/summary', summaryHandler)
router.get('/', summaryHandler)

router.get('/ledger', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500)
  const to = req.query.to ? new Date(String(req.query.to)) : new Date()
  const from = req.query.from
    ? new Date(String(req.query.from))
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)

  const end = new Date(to)
  end.setHours(23, 59, 59, 999)

  const [inbounds, outbounds] = await Promise.all([
    prisma.inboundOrder.findMany({
      where: { recordDate: { gte: from, lte: end } },
      include: { operator: { select: { name: true } } },
      orderBy: { recordDate: 'desc' },
    }),
    prisma.outboundOrder.findMany({
      where: { recordDate: { gte: from, lte: end } },
      include: {
        customer: true,
        operator: { select: { name: true } },
      },
      orderBy: { recordDate: 'desc' },
    }),
  ])

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

  res.json(serialize(rows))
})

router.get('/year-end', async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear()
  const summary = await buildYearSummary(year)
  res.json({
    ...summary,
    balanceDiff: summary.grossProfit,
  })
})

export default router
