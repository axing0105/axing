import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10)

  let tenant = await prisma.tenant.findFirst({ where: { name: '研物通演示' } })
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: '研物通演示' },
    })
  }

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      companyName: '研物通',
      tenantId: tenant.id,
      role: 'ADMIN',
    },
    create: {
      tenantId: tenant.id,
      username: 'admin',
      passwordHash,
      name: '管理员',
      companyName: '研物通',
      role: 'ADMIN',
    },
  })
  console.log('Seed OK: admin / admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
