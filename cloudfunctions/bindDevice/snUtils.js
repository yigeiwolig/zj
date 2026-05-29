// 与 bindDevice / adminRegisterSn 共用的 SN 与质保工具

function normalizeSn(input) {
  const raw = String(input || '').trim().toUpperCase()
  if (!raw) return ''
  if (raw.startsWith('MT-')) return raw
  if (raw.startsWith('MT')) return `MT-${raw.slice(2).replace(/^-/, '')}`
  if (raw.startsWith('NB')) return `MT-${raw.replace(/^NB-?/, '')}`
  return `MT-${raw.replace(/^-/, '')}`
}

function snCandidates(normalizedSn) {
  const suffix = String(normalizedSn || '').replace(/^MT-?/, '')
  const set = new Set()
  if (normalizedSn) set.add(normalizedSn)
  if (suffix) {
    set.add(suffix)
    set.add(`MT${suffix}`)
    set.add(`NB${suffix}`)
    set.add(`NB-${suffix}`)
  }
  return Array.from(set)
}

const WARRANTY_DAYS_BY_MODEL = {
  'F1 PRO': 180,
  'F1 MAX': 365,
  'F2 PRO': 180,
  'F2 MAX': 365,
  'F2 MAX Long': 365
}

function warrantyDaysForModel(productModel) {
  const key = String(productModel || '').trim()
  return WARRANTY_DAYS_BY_MODEL[key] || 365
}

function buildActivationFields(productModel, baseDate = new Date()) {
  const days = warrantyDaysForModel(productModel)
  const yearShort = baseDate.getFullYear() % 10
  const month = baseDate.getMonth() + 1
  const firmwareVer = `V${yearShort}.${month}.3`
  const expiryDateObj = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000)
  const expiryDateStr = expiryDateObj.toISOString().split('T')[0]
  const diffTime = expiryDateObj - new Date()
  const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return {
    productModel,
    firmware: firmwareVer,
    expiryDate: expiryDateStr,
    totalDays: days,
    remainingDays: remainingDays > 0 ? remainingDays : 0,
    isActive: true,
    activations: 1
  }
}

module.exports = {
  normalizeSn,
  snCandidates,
  warrantyDaysForModel,
  buildActivationFields,
  WARRANTY_DAYS_BY_MODEL
}
