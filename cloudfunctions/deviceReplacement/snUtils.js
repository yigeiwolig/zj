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

function needsReplacementByText(text) {
  return /主板|控制器/.test(String(text || ''))
}

module.exports = {
  normalizeSn,
  snCandidates,
  needsReplacementByText
}
