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
  customerId: z.string().min(1, '请选择课题组'),
  recordDate: z.coerce.date(),
  orderDate: z.coerce.date(),
  remark: z.string().optional().default(''),
  items: z.array(itemSchema).min(1, '至少选择一件商品'),
})

const includeOrder = {
  customer: true,
  operator: { select: { id: true, name: true, username: true } },
  items: { include: { product: true } },
} as const

async function buildItemRows(tx: any, items: z.infer<typeof itemSchema>[], checkStock: boolean) {
  const itemRows: { productId: string; quantity: number; unitPrice: number; amount: number }[] = []
  let total = 0
  for (const item of items) {
    const resolved = await resolveProductId(tx, item)
    const product = await tx.product.findUnique({ where: { id: resolved.productId } })
    if (!product) throw new Error('INVALID_PRODUCT')
    if (checkStock && product.stock < item.quantity) {
      throw new Error(`STOCK:${product.name}:${product.stock}`)
    }
    const amount = Number((resolved.unitPrice * item.quantity).toFixed(2))
    total += amount
    itemRows.push({
      productId: resolved.productId,
      quantity: item.quantity,
      unitPrice: resolved.unitPrice,
      amount,
    })
  }
  const productIds = itemRows.map((i) => i.productId)
  if (new Set(productIds).size !== productIds.length) throw new Error('DUP_PRODUCT')
  return { total: Number(total.toFixed(2)), itemRows }
}

router.get('/', async (req, res) => {
  const from = String(req.query.from || '').trim()
  const to = String(req.query.to || '').trim()
  const dateFilter =
    from || to
      ? {
          recordDate: {
            ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
          },
        }
      : {}

  const list = await prisma.outboundOrder.findMany({
    where: dateFilter,
    orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
    include: includeOrder,
  })
  res.json(serialize(list))
})

router.get('/:id', async (req, res) => {
  const order = await prisma.outboundOrder.findUnique({
    where: { id: req.params.id },
    include: includeOrder,
  })
  if (!order) return res.status(404).json({ message: '出库单不存在' })
  res.json(serialize(order))
})

router.post('/', async (req, res) => {
  const parsed = orderSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message || '参数不合法' })
  }

  const customer = await prisma.customer.findUnique({ where: { id: parsed.data.customerId } })
  if (!customer) return res.status(400).json({ message: '课题组不存在' })

  try {
    const order = await prisma.$transaction(async (tx) => {
      const { total, itemRows } = await buildItemRows(tx, parsed.data.items, true)
      const created = await tx.outboundOrder.create({
        data: {
          orderNo: genOrderNo('OUT'),
          unitName: parsed.data.unitName || '',
          recordDate: parsed.data.recordDate,
          orderDate: parsed.data.orderDate,
          customerId: parsed.data.customerId,
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
          data: { stock: { decrement: item.quantity } },
        })
      }
      return created
    })
    res.status(201).json(serialize(order))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.startsWith('STOCK:')) {
      const [, name, stock] = msg.split(':')
      return res.status(400).json({ message: `「${name}」库存不足，当前库存 ${stock}` })
    }
    if (msg === 'INVALID_PRODUCT') return res.status(400).json({ message: '存在无效商品' })
    if (msg === 'NEED_NAME_OR_SKU') {
      return res.status(400).json({ message: '请填写物品名称或货号' })
    }
    if (msg === 'DUP_PRODUCT') {
      return res.status(400).json({ message: '同一单据中商品不能重复，请合并数量' })
    }
    console.error(e)
    res.status(500).json({ message: '出库失败' })
  }
})

router.patch('/:id', async (req, res) => {
  const parsed = orderSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message || '参数不合法' })
  }

  const customer = await prisma.customer.findUnique({ where: { id: parsed.data.customerId } })
  if (!customer) return res.status(400).json({ message: '课题组不存在' })

  try {
    const order = await prisma.$transaction(async (tx) => {
      const existing = await tx.outboundOrder.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      })
      if (!existing) throw new Error('NOT_FOUND')

      // restore stock from old items
      for (const item of existing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
      await tx.outboundItem.deleteMany({ where: { orderId: existing.id } })

      const { total, itemRows } = await buildItemRows(tx, parsed.data.items, true)
      for (const item of itemRows) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      return tx.outboundOrder.update({
        where: { id: existing.id },
        data: {
          unitName: parsed.data.unitName || '',
          recordDate: parsed.data.recordDate,
          orderDate: parsed.data.orderDate,
          customerId: parsed.data.customerId,
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
    if (msg === 'NOT_FOUND') return res.status(404).json({ message: '出库单不存在' })
    if (msg.startsWith('STOCK:')) {
      const [, name, stock] = msg.split(':')
      return res.status(400).json({ message: `「${name}」库存不足，当前库存 ${stock}` })
    }
    if (msg === 'INVALID_PRODUCT') return res.status(400).json({ message: '存在无效商品' })
    if (msg === 'NEED_NAME_OR_SKU') {
      return res.status(400).json({ message: '请填写物品名称或货号' })
    }
    if (msg === 'DUP_PRODUCT') {
      return res.status(400).json({ message: '同一单据中商品不能重复，请合并数量' })
    }
    console.error(e)
    res.status(500).json({ message: '更新失败' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.outboundOrder.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      })
      if (!existing) throw new Error('NOT_FOUND')
      for (const item of existing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
      await tx.outboundOrder.delete({ where: { id: existing.id } })
    })
    res.json({ message: '已删除' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'NOT_FOUND') return res.status(404).json({ message: '出库单不存在' })
    console.error(e)
    res.status(500).json({ message: '删除失败' })
  }
})

export default router
