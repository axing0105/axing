import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { authRequired } from '../middleware/auth'
import { serialize } from '../utils/serialize'

const router = Router()
router.use(authRequired)

const productSchema = z.object({
  name: z.string().min(1, '物品名称必填'),
  sku: z.string().min(1, '货号必填'),
  brand: z.string().optional().default(''),
  model: z.string().optional().default(''),
  unit: z.string().optional().default('件'),
  unitPrice: z.coerce.number().nonnegative('单价不能为负'),
  remark: z.string().optional().default(''),
})

router.get('/brands', async (req, res) => {
  const rows = await prisma.product.findMany({
    where: { tenantId: req.user!.tenantId, brand: { not: '' } },
    select: { brand: true },
    distinct: ['brand'],
    orderBy: { brand: 'asc' },
  })
  res.json(rows.map((r) => r.brand))
})

router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim()
  const brand = String(req.query.brand || '').trim()
  const tenantId = req.user!.tenantId
  const products = await prisma.product.findMany({
    where: {
      tenantId,
      AND: [
        brand ? { brand } : {},
        q
          ? {
              OR: [
                { name: { contains: q } },
                { sku: { contains: q } },
                { model: { contains: q } },
                { brand: { contains: q } },
              ],
            }
          : {},
      ],
    },
    orderBy: [{ brand: 'asc' }, { updatedAt: 'desc' }],
  })
  res.json(serialize(products))
})

router.post('/batch', async (req, res) => {
  const schema = z.object({
    items: z.array(productSchema).min(1, '至少导入一条商品'),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message || '参数不合法' })
  }

  const tenantId = req.user!.tenantId
  let created = 0
  let updated = 0
  const errors: { row: number; sku: string; message: string }[] = []

  for (let i = 0; i < parsed.data.items.length; i++) {
    const item = parsed.data.items[i]
    try {
      const existing = await prisma.product.findUnique({
        where: { tenantId_sku: { tenantId, sku: item.sku } },
      })
      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            name: item.name,
            brand: item.brand,
            model: item.model,
            unit: item.unit,
            unitPrice: item.unitPrice,
            remark: item.remark,
          },
        })
        updated += 1
      } else {
        await prisma.product.create({ data: { ...item, tenantId } })
        created += 1
      }
    } catch {
      errors.push({ row: i + 1, sku: item.sku, message: '保存失败' })
    }
  }

  res.json({ created, updated, failed: errors.length, errors })
})

router.get('/:id', async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { id: req.params.id, tenantId: req.user!.tenantId },
  })
  if (!product) return res.status(404).json({ message: '商品不存在' })
  res.json(serialize(product))
})

router.post('/', async (req, res) => {
  const parsed = productSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message || '参数不合法' })
  }
  try {
    const product = await prisma.product.create({
      data: { ...parsed.data, tenantId: req.user!.tenantId },
    })
    res.status(201).json(serialize(product))
  } catch {
    res.status(400).json({ message: '货号已存在' })
  }
})

router.patch('/:id', async (req, res) => {
  const parsed = productSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message || '参数不合法' })
  }
  const existing = await prisma.product.findFirst({
    where: { id: req.params.id, tenantId: req.user!.tenantId },
  })
  if (!existing) return res.status(404).json({ message: '商品不存在' })

  try {
    const product = await prisma.product.update({
      where: { id: existing.id },
      data: parsed.data,
    })
    res.json(serialize(product))
  } catch (e: unknown) {
    const msg = String(e)
    if (msg.includes('Unique constraint')) {
      return res.status(400).json({ message: '货号已存在' })
    }
    res.status(404).json({ message: '商品不存在' })
  }
})

router.delete('/:id', async (req, res) => {
  const existing = await prisma.product.findFirst({
    where: { id: req.params.id, tenantId: req.user!.tenantId },
  })
  if (!existing) return res.status(404).json({ message: '商品不存在' })

  try {
    await prisma.product.delete({ where: { id: existing.id } })
    res.json({ message: '已删除' })
  } catch {
    res.status(400).json({ message: '删除失败，可能已被出入库引用' })
  }
})

export default router
