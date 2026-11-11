import { Router } from 'express'
import { prisma } from '../prisma'
import { adminRequired, authRequired } from '../middleware/auth'
import { serialize } from '../utils/serialize'

const router = Router()
router.use(authRequired, adminRequired)

router.get('/status', async (req, res) => {
  const tenantId = req.user!.tenantId

  const [tenant, users, products, customers, inbounds, outbounds, invoices] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.user.count({ where: { tenantId } }),
    prisma.product.count({ where: { tenantId } }),
    prisma.customer.count({ where: { tenantId } }),
    prisma.inboundOrder.count({ where: { tenantId } }),
    prisma.outboundOrder.count({ where: { tenantId } }),
    prisma.invoice.count({ where: { tenantId } }),
  ])

  if (!tenant) return res.status(404).json({ message: '租户不存在' })

  res.json(
    serialize({
      connected: true,
      storage: '阿里云 MySQL（Docker 持久化卷）',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        createdAt: tenant.createdAt,
      },
      account: {
        id: req.user!.id,
        username: req.user!.username,
        name: req.user!.name,
        role: req.user!.role,
      },
      counts: {
        users,
        products,
        customers,
        inbounds,
        outbounds,
        invoices,
      },
      checkedAt: new Date(),
    }),
  )
})

router.get('/export', async (req, res) => {
  const tenantId = req.user!.tenantId
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) return res.status(404).json({ message: '租户不存在' })

  const [users, products, customers, inbounds, outbounds, invoices] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        username: true,
        name: true,
        companyName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.product.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
    prisma.customer.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
    prisma.inboundOrder.findMany({
      where: { tenantId },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.outboundOrder.findMany({
      where: { tenantId },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.invoice.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
  ])

  res.json(
    serialize({
      exportedAt: new Date(),
      tenant: {
        id: tenant.id,
        name: tenant.name,
        createdAt: tenant.createdAt,
      },
      users,
      products,
      customers,
      inbounds,
      outbounds,
      invoices,
    }),
  )
})

export default router
