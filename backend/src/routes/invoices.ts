import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { authRequired } from '../middleware/auth'
import { serialize } from '../utils/serialize'

const router = Router()
router.use(authRequired)

const invoiceSchema = z.object({
  invoiceTime: z.coerce.date(),
  invoiceUnit: z.string().min(1, '开票单位必填'),
  amount: z.coerce.number().nonnegative('开票金额不能为负'),
  invoiceNo: z.string().min(1, '发票号必填'),
  researchGroup: z.string().optional().default(''),
  paid: z.boolean().optional().default(false),
  contact: z.string().optional().default(''),
  remark: z.string().optional().default(''),
})

router.get('/', async (req, res) => {
  const invoiceNo = String(req.query.invoiceNo || '').trim()
  const researchGroup = String(req.query.researchGroup || '').trim()
  const paidRaw = req.query.paid

  const where: {
    invoiceNo?: { contains: string }
    researchGroup?: { contains: string }
    paid?: boolean
  } = {}
  if (invoiceNo) where.invoiceNo = { contains: invoiceNo }
  if (researchGroup) where.researchGroup = { contains: researchGroup }
  if (paidRaw === 'true' || paidRaw === 'false') where.paid = paidRaw === 'true'

  const list = await prisma.invoice.findMany({
    where,
    orderBy: { invoiceTime: 'desc' },
  })
  res.json(serialize(list))
})

router.post('/', async (req, res) => {
  const parsed = invoiceSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message || '参数不合法' })
  }
  try {
    const invoice = await prisma.invoice.create({ data: parsed.data })
    res.status(201).json(serialize(invoice))
  } catch {
    res.status(400).json({ message: '发票号已存在' })
  }
})

router.patch('/:id', async (req, res) => {
  const parsed = invoiceSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message || '参数不合法' })
  }
  try {
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: parsed.data,
    })
    res.json(serialize(invoice))
  } catch (e: unknown) {
    const msg = String(e)
    if (msg.includes('Unique constraint')) {
      return res.status(400).json({ message: '发票号已存在' })
    }
    res.status(404).json({ message: '发票不存在' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.invoice.delete({ where: { id: req.params.id } })
    res.json({ message: '已删除' })
  } catch {
    res.status(404).json({ message: '发票不存在' })
  }
})

export default router
