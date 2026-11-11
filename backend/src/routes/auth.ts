import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../prisma'
import { authRequired, signToken, type AuthUser } from '../middleware/auth'
import { serialize } from '../utils/serialize'

const router = Router()

const userSelect = {
  id: true,
  tenantId: true,
  username: true,
  name: true,
  companyName: true,
  role: true,
  createdAt: true,
} as const

function toAuthUser(user: {
  id: string
  tenantId: string
  username: string
  name: string
  companyName: string | null
  role: AuthUser['role']
}): AuthUser {
  return {
    id: user.id,
    tenantId: user.tenantId,
    username: user.username,
    name: user.name,
    companyName: user.companyName || '',
    role: user.role,
  }
}

router.post('/register', async (req, res) => {
  const schema = z.object({
    username: z.string().min(3, '用户名至少 3 位'),
    password: z.string().min(6, '密码至少 6 位'),
    name: z.string().min(1, '姓名必填'),
    companyName: z.string().optional().default(''),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message || '参数不合法' })
  }

  const exists = await prisma.user.findUnique({ where: { username: parsed.data.username } })
  if (exists) return res.status(400).json({ message: '用户名已存在' })

  const companyName = parsed.data.companyName || ''
  const tenantName = companyName || `${parsed.data.name}的空间`

  try {
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: tenantName },
      })
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          username: parsed.data.username,
          name: parsed.data.name,
          companyName,
          role: 'ADMIN',
          passwordHash: await bcrypt.hash(parsed.data.password, 10),
        },
        select: userSelect,
      })
      return user
    })

    const authUser = toAuthUser(result)
    const token = signToken(authUser)
    res.status(201).json({ token, user: authUser })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: '注册失败' })
  }
})

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

  const authUser = toAuthUser(user)
  const token = signToken(authUser)
  res.json({ token, user: authUser })
})

router.get('/me', authRequired, async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { id: req.user!.id, tenantId: req.user!.tenantId },
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

  const user = await prisma.user.findFirst({
    where: { id: req.user!.id, tenantId: req.user!.tenantId },
  })
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
