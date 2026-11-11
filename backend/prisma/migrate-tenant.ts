/**
 * One-time migration: shared DB -> multi-tenant.
 * Safe to re-run: skips when Tenant table already exists.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function tableExists(name: string) {
  const rows = await prisma.$queryRawUnsafe<{ c: bigint }[]>(
    `SELECT COUNT(*) AS c FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    name,
  )
  return Number(rows[0]?.c || 0) > 0
}

async function columnExists(table: string, column: string) {
  const rows = await prisma.$queryRawUnsafe<{ c: bigint }[]>(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    table,
    column,
  )
  return Number(rows[0]?.c || 0) > 0
}

async function main() {
  if (await tableExists('Tenant')) {
    console.log('migrate-tenant: Tenant already exists, skip')
    return
  }

  console.log('migrate-tenant: creating Tenant and backfilling tenantId...')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE \`Tenant\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`name\` VARCHAR(191) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)

  const tenantId = `tenant_legacy_${Date.now()}`
  await prisma.$executeRawUnsafe(
    `INSERT INTO \`Tenant\` (\`id\`, \`name\`) VALUES (?, ?)`,
    tenantId,
    '研物通演示',
  )

  const tables = ['User', 'Product', 'Customer', 'InboundOrder', 'OutboundOrder', 'Invoice'] as const
  for (const table of tables) {
    if (!(await tableExists(table))) continue
    if (await columnExists(table, 'tenantId')) continue
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`${table}\` ADD COLUMN \`tenantId\` VARCHAR(191) NULL`,
    )
    await prisma.$executeRawUnsafe(
      `UPDATE \`${table}\` SET \`tenantId\` = ? WHERE \`tenantId\` IS NULL`,
      tenantId,
    )
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`${table}\` MODIFY \`tenantId\` VARCHAR(191) NOT NULL`,
    )
    await prisma.$executeRawUnsafe(
      `CREATE INDEX \`${table}_tenantId_idx\` ON \`${table}\`(\`tenantId\`)`,
    )
  }

  // Drop global uniques that will become composite under Prisma
  const dropUniqueIfExists = async (table: string, indexName: string) => {
    const rows = await prisma.$queryRawUnsafe<{ c: bigint }[]>(
      `SELECT COUNT(*) AS c FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
      table,
      indexName,
    )
    if (Number(rows[0]?.c || 0) > 0) {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` DROP INDEX \`${indexName}\``)
    }
  }

  await dropUniqueIfExists('Product', 'Product_sku_key')
  await dropUniqueIfExists('InboundOrder', 'InboundOrder_orderNo_key')
  await dropUniqueIfExists('OutboundOrder', 'OutboundOrder_orderNo_key')
  await dropUniqueIfExists('Invoice', 'Invoice_invoiceNo_key')

  console.log(`migrate-tenant: done, legacy tenantId=${tenantId}`)
}

main()
  .catch((e) => {
    console.error('migrate-tenant failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
