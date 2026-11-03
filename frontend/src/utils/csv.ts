/** Excel-friendly CSV helpers (UTF-8 BOM). */

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? '')
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function parseCsv(text: string): string[][] {
  const raw = text.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    const next = raw[i + 1]
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(cell.trim())
      cell = ''
    } else if (ch === '\n') {
      row.push(cell.trim())
      if (row.some((c) => c !== '')) rows.push(row)
      row = []
      cell = ''
    } else if (ch !== '\r') {
      cell += ch
    }
  }
  row.push(cell.trim())
  if (row.some((c) => c !== '')) rows.push(row)
  return rows
}

export function mapCsvHeader(header: string): string {
  const h = header.trim().toLowerCase()
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
    unitprice: 'unitPrice',
    备注: 'remark',
    remark: 'remark',
  }
  return aliases[h] || aliases[header.trim()] || ''
}
