import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../prisma'
import { authRequired, signToken } from '../middleware/auth'
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

router.post('/login', async (req, res) => {
  const schema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: '用户名或密码不能为空' })

  const user = await prisma.user.findUnique({ where: { username: parsed.data.username } })
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ message: '用户名或密码错误' })
  }

  const authUser = {
    id: user.id,
    username: user.username,
    name: user.name,
    companyName: user.companyName || '',
    role: user.role,
  }
  const token = signToken(authUser)
  res.json({ token, user: authUser })
})

router.get('/me', authRequired, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: userSelect,
  })
  if (!user) return res.status(404).json({ message: '用户不存在' })
  res.json(serialize(user))
})

router.patch('/password', authRequired, async (req, res) => {
  const schema = z.object({
    oldPassword: z.string().min(1),
    newPassword: z.string().min(6),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: '新密码至少 6 位' })

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user || !(await bcrypt.compare(parsed.data.oldPassword, user.passwordHash))) {
    return res.status(400).json({ message: '原密码不正确' })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  })
  res.json({ message: '密码已修改' })
})

export default router
