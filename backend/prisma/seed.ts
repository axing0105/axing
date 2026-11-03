import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      companyName: '研物通',
    },
    create: {
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
