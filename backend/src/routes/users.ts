import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../prisma'
import { adminRequired, authRequired } from '../middleware/auth'
import { serialize } from '../utils/serialize'

const router = Router()

const userSelect = {
  id: true,
  username: true,
  name: true,
  companyName: true,
  role: true,
  createdAt: true,
} as const

router.use(authRequired, adminRequired)

router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: userSelect,
  })
  res.json(serialize(users))
})

router.post('/', async (req, res) => {
  const schema = z.object({
    username: z.string().min(3),
    password: z.string().min(6),
    name: z.string().min(1),
    companyName: z.string().optional().default(''),
    role: z.enum(['ADMIN', 'STAFF']).default('STAFF'),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: '参数不合法' })

  const exists = await prisma.user.findUnique({ where: { username: parsed.data.username } })
  if (exists) return res.status(400).json({ message: '用户名已存在' })

  const user = await prisma.user.create({
    data: {
      username: parsed.data.username,
      name: parsed.data.name,
      companyName: parsed.data.companyName || '',
      role: parsed.data.role,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
    },
    select: userSelect,
  })
  res.status(201).json(serialize(user))
})

router.patch('/:id', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    companyName: z.string().optional(),
    role: z.enum(['ADMIN', 'STAFF']).optional(),
    password: z.string().min(6).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: '参数不合法' })

  const data: {
    name?: string
    companyName?: string
    role?: 'ADMIN' | 'STAFF'
    passwordHash?: string
  } = {}
  if (parsed.data.name) data.name = parsed.data.name
  if (parsed.data.companyName !== undefined) data.companyName = parsed.data.companyName
  if (parsed.data.role) data.role = parsed.data.role
  if (parsed.data.password) data.passwordHash = await bcrypt.hash(parsed.data.password, 10)

  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: userSelect,
    })
    res.json(serialize(user))
  } catch {
    res.status(404).json({ message: '用户不存在' })
  }
})

router.delete('/:id', async (req, res) => {
  if (req.params.id === req.user!.id) {
    return res.status(400).json({ message: '不能删除当前登录账号' })
  }
  try {
    await prisma.user.delete({ where: { id: req.params.id } })
    res.json({ message: '已删除' })
  } catch {
    res.status(404).json({ message: '用户不存在' })
  }
})

export default router
