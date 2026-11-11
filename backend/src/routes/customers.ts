import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { authRequired } from '../middleware/auth'
import { serialize } from '../utils/serialize'

const router = Router()
router.use(authRequired)

const customerSchema = z.object({
  name: z.string().min(1, '课题组名称必填'),
  unitName: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
  remark: z.string().optional().default(''),
})

router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim()
  const tenantId = req.user!.tenantId
  const customers = await prisma.customer.findMany({
    where: {
      tenantId,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { unitName: { contains: q } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
  })
  res.json(serialize(customers))
})

router.post('/', async (req, res) => {
  const parsed = customerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message || '参数不合法' })
  }
  const customer = await prisma.customer.create({
    data: { ...parsed.data, tenantId: req.user!.tenantId },
  })
  res.status(201).json(serialize(customer))
})

router.patch('/:id', async (req, res) => {
  const parsed = customerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message || '参数不合法' })
  }
  const existing = await prisma.customer.findFirst({
    where: { id: req.params.id, tenantId: req.user!.tenantId },
  })
  if (!existing) return res.status(404).json({ message: '课题组不存在' })

  try {
    const customer = await prisma.customer.update({
      where: { id: existing.id },
      data: parsed.data,
    })
    res.json(serialize(customer))
  } catch {
    res.status(404).json({ message: '课题组不存在' })
  }
})

router.delete('/:id', async (req, res) => {
  const existing = await prisma.customer.findFirst({
    where: { id: req.params.id, tenantId: req.user!.tenantId },
  })
  if (!existing) return res.status(404).json({ message: '课题组不存在' })

  try {
    await prisma.customer.delete({ where: { id: existing.id } })
    res.json({ message: '已删除' })
  } catch {
    res.status(400).json({ message: '删除失败，可能已有出库记录' })
  }
})

export default router
