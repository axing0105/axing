import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { authRequired } from '../middleware/auth'
import { genOrderNo } from '../utils/orderNo'
import { resolveProductId } from '../utils/resolveProduct'
import { serialize } from '../utils/serialize'

const router = Router()
router.use(authRequired)

const itemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().optional(),
  sku: z.string().optional(),
  model: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative().optional(),
})

const orderSchema = z.object({
  unitName: z.string().optional().default(''),
  recordDate: z.coerce.date(),
  orderDate: z.coerce.date(),
  remark: z.string().optional().default(''),
  items: z.array(itemSchema).min(1, '至少选择一件商品'),
})

const includeOrder = {
  operator: { select: { id: true, name: true, username: true } },
  items: { include: { product: true } },
} as const

async function buildItemRows(tx: any, items: z.infer<typeof itemSchema>[], tenantId: string) {
  let total = 0
  const itemRows: { productId: string; quantity: number; unitPrice: number; amount: number }[] = []
  for (const item of items) {
    const resolved = await resolveProductId(tx, item, tenantId)
    const amount = Number((resolved.unitPrice * item.quantity).toFixed(2))
    total += amount
    itemRows.push({
      productId: resolved.productId,
      quantity: item.quantity,
      unitPrice: resolved.unitPrice,
      amount,
    })
  }
  return { total: Number(total.toFixed(2)), itemRows }
}

router.get('/', async (req, res) => {
  const from = String(req.query.from || '').trim()
  const to = String(req.query.to || '').trim()
  const tenantId = req.user!.tenantId
  const dateFilter =
    from || to
      ? {
          recordDate: {
            ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
          },
        }
      : {}

  const list = await prisma.inboundOrder.findMany({
    where: { tenantId, ...dateFilter },
    orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
    include: includeOrder,
  })
  res.json(serialize(list))
})

router.get('/:id', async (req, res) => {
  const order = await prisma.inboundOrder.findFirst({
    where: { id: req.params.id, tenantId: req.user!.tenantId },
    include: includeOrder,
  })
  if (!order) return res.status(404).json({ message: '入库单不存在' })
  res.json(serialize(order))
})

router.post('/', async (req, res) => {
  const parsed = orderSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message || '参数不合法' })
  }

  const tenantId = req.user!.tenantId
  try {
    const order = await prisma.$transaction(async (tx) => {
      const { total, itemRows } = await buildItemRows(tx, parsed.data.items, tenantId)
      const created = await tx.inboundOrder.create({
        data: {
          tenantId,
          orderNo: genOrderNo('IN'),
          unitName: parsed.data.unitName || '',
          recordDate: parsed.data.recordDate,
          orderDate: parsed.data.orderDate,
          amount: total,
          remark: parsed.data.remark,
          operatorId: req.user!.id,
          items: { create: itemRows },
        },
        include: includeOrder,
      })
      for (const item of itemRows) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
      return created
    })
    res.status(201).json(serialize(order))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'INVALID_PRODUCT') return res.status(400).json({ message: '存在无效商品' })
    if (msg === 'NEED_NAME_OR_SKU') {
      return res.status(400).json({ message: '请填写物品名称或货号' })
    }
    console.error(e)
    res.status(500).json({ message: '入库失败' })
  }
})

router.patch('/:id', async (req, res) => {
  const parsed = orderSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message || '参数不合法' })
  }

  const tenantId = req.user!.tenantId
  try {
    const order = await prisma.$transaction(async (tx) => {
      const existing = await tx.inboundOrder.findFirst({
        where: { id: req.params.id, tenantId },
        include: { items: true },
      })
      if (!existing) throw new Error('NOT_FOUND')

      for (const item of existing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }
      await tx.inboundItem.deleteMany({ where: { orderId: existing.id } })

      const { total, itemRows } = await buildItemRows(tx, parsed.data.items, tenantId)
      for (const item of itemRows) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }

      return tx.inboundOrder.update({
        where: { id: existing.id },
        data: {
          unitName: parsed.data.unitName || '',
          recordDate: parsed.data.recordDate,
          orderDate: parsed.data.orderDate,
          amount: total,
          remark: parsed.data.remark,
          items: { create: itemRows },
        },
        include: includeOrder,
      })
    })
    res.json(serialize(order))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'NOT_FOUND') return res.status(404).json({ message: '入库单不存在' })
    if (msg === 'INVALID_PRODUCT') return res.status(400).json({ message: '存在无效商品' })
    if (msg === 'NEED_NAME_OR_SKU') {
      return res.status(400).json({ message: '请填写物品名称或货号' })
    }
    console.error(e)
    res.status(500).json({ message: '更新失败' })
  }
})

router.delete('/:id', async (req, res) => {
  const tenantId = req.user!.tenantId
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.inboundOrder.findFirst({
        where: { id: req.params.id, tenantId },
        include: { items: true },
      })
      if (!existing) throw new Error('NOT_FOUND')
      for (const item of existing.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId },
        })
        if (product && product.stock < item.quantity) {
          throw new Error(`STOCK:${product.name}:${product.stock}`)
        }
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }
      await tx.inboundOrder.delete({ where: { id: existing.id } })
    })
    res.json({ message: '已删除' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'NOT_FOUND') return res.status(404).json({ message: '入库单不存在' })
    if (msg.startsWith('STOCK:')) {
      const [, name, stock] = msg.split(':')
      return res.status(400).json({ message: `无法删除：回退库存后「${name}」库存不足（当前 ${stock}）` })
    }
    console.error(e)
    res.status(500).json({ message: '删除失败' })
  }
})

export default router
