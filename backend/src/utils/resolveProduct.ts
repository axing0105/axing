import type { Prisma, PrismaClient } from '@prisma/client'

type Tx = Prisma.TransactionClient | PrismaClient

export type ResolveItemInput = {
  productId?: string
  name?: string
  sku?: string
  model?: string
  unit?: string
  quantity: number
  unitPrice?: number
}

export async function resolveProductId(
  tx: Tx,
  item: ResolveItemInput,
  tenantId: string,
): Promise<{
  productId: string
  unitPrice: number
}> {
  if (item.productId) {
    const product = await tx.product.findFirst({
      where: { id: item.productId, tenantId },
    })
    if (!product) throw new Error('INVALID_PRODUCT')
    const unitPrice =
      item.unitPrice !== undefined ? Number(item.unitPrice) : Number(product.unitPrice)
    return { productId: product.id, unitPrice }
  }

  const name = (item.name || '').trim()
  let sku = (item.sku || '').trim()
  if (!name && !sku) throw new Error('NEED_NAME_OR_SKU')

  if (sku) {
    const existing = await tx.product.findUnique({
      where: { tenantId_sku: { tenantId, sku } },
    })
    if (existing) {
      const unitPrice =
        item.unitPrice !== undefined ? Number(item.unitPrice) : Number(existing.unitPrice)
      if (name && existing.name !== name) {
        await tx.product.update({
          where: { id: existing.id },
          data: {
            name,
            model: item.model ?? existing.model,
            unit: item.unit || existing.unit,
          },
        })
      }
      return { productId: existing.id, unitPrice }
    }
  } else {
    sku = `TMP${Date.now()}${Math.floor(Math.random() * 900 + 100)}`
  }

  const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : 0
  const created = await tx.product.create({
    data: {
      tenantId,
      name: name || sku,
      sku,
      brand: '',
      model: item.model || '',
      unit: item.unit || '件',
      unitPrice,
      remark: '',
    },
  })
  return { productId: created.id, unitPrice }
}
