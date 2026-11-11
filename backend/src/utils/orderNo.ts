export function genOrderNo(prefix: string) {
  const now = new Date()
  const pad = (n: number, len = 2) => String(n).padStart(len, '0')
  // 出库单对齐信标样式：2026-11-11000001
  if (prefix === 'OUT') {
    const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const seq = String(Math.floor(Math.random() * 900000) + 100000)
    return `${day}${seq}`
  }
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const rand = Math.floor(Math.random() * 900 + 100)
  return `${prefix}${stamp}${rand}`
}
