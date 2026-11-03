import * as XLSX from 'xlsx'

export function downloadExcel(
  filename: string,
  sheets: { name: string; headers: string[]; rows: (string | number)[][] }[]
) {
  const wb = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const data = [sheet.headers, ...sheet.rows]
    const ws = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31))
  }
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

export async function readExcelFile(file: File): Promise<string[][]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const first = wb.SheetNames[0]
  if (!first) return []
  const ws = wb.Sheets[first]
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, {
    header: 1,
    defval: '',
    raw: false,
  })
  return rows.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? '').trim()) : []))
}

export function mapHeader(header: string): string {
  const h = header.trim()
  const aliases: Record<string, string> = {
    品牌: 'brand',
    brand: 'brand',
    物品名称: 'name',
    名称: 'name',
    name: 'name',
    货号: 'sku',
    sku: 'sku',
    型号: 'model',
    model: 'model',
    单位: 'unit',
    unit: 'unit',
    单价: 'unitPrice',
    unitPrice: 'unitPrice',
    备注: 'remark',
    remark: 'remark',
  }
  return aliases[h] || aliases[h.toLowerCase()] || ''
}
