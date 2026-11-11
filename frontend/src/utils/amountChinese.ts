const DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']

function fourDigits(n: number): string {
  const qian = Math.floor(n / 1000)
  const bai = Math.floor((n % 1000) / 100)
  const shi = Math.floor((n % 100) / 10)
  const ge = n % 10
  let s = ''

  if (qian) s += DIGITS[qian] + '仟'
  else if (n >= 1000) s += '零'

  if (bai) s += DIGITS[bai] + '佰'
  else if (s && (shi || ge)) s += '零'

  if (shi) {
    s += DIGITS[shi] + '拾'
  } else if (s && ge) {
    if (!s.endsWith('零')) s += '零'
  }

  if (ge) s += DIGITS[ge]
  return s.replace(/零+/g, '零').replace(/零$/g, '')
}

/** 将金额转为人民币大写，如 6665 -> 陆仟陆佰陆拾伍圆整 */
export function amountToChinese(amount: number | string): string {
  const num = Number(amount)
  if (!Number.isFinite(num) || num < 0) return ''
  if (Math.abs(num) < 0.005) return '零圆整'

  const cents = Math.round(num * 100)
  const yuan = Math.floor(cents / 100)
  const jiao = Math.floor((cents % 100) / 10)
  const fen = cents % 10

  let result = ''
  if (yuan === 0) {
    result = ''
  } else {
    const yi = Math.floor(yuan / 100000000)
    const wan = Math.floor((yuan % 100000000) / 10000)
    const ge = yuan % 10000

    if (yi) {
      result += fourDigits(yi) + '亿'
      if (wan === 0 && ge > 0) result += '零'
    }
    if (wan) {
      result += fourDigits(wan) + '万'
      if (ge > 0 && ge < 1000) result += '零'
    } else if (yi && ge > 0) {
      result += '零'
    }
    if (ge) result += fourDigits(ge)
    result += '圆'
  }

  if (jiao === 0 && fen === 0) {
    result = (result || '零圆') + '整'
  } else {
    if (!result) result = ''
    if (jiao > 0) result += DIGITS[jiao] + '角'
    else if (yuan > 0) result += '零'
    if (fen > 0) result += DIGITS[fen] + '分'
  }

  return result
}
