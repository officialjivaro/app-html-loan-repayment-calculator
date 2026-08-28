export function sanitizeCurrencySymbol(value) {
  const safe = String(value || '$').replace(/[<>&"']/g, '').trim()
  return safe ? safe.slice(0, 4) : '$'
}

export function formatMoney(value, symbol = '$') {
  return `${sanitizeCurrencySymbol(symbol)}${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatPercent(value, digits = 2) {
  return `${Number(value || 0).toFixed(digits)}%`
}

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function formatDuration(periods, frequency) {
  const count = Math.max(0, Number(periods || 0))
  if (frequency === 'monthly') {
    const years = Math.floor(count / 12)
    const months = count % 12
    if (years && months) return `${years} years ${months} months`
    if (years) return `${years} ${years === 1 ? 'year' : 'years'}`
    return `${months} ${months === 1 ? 'month' : 'months'}`
  }
  const label = frequency === 'weekly' ? 'weeks' : 'bi-weekly payments'
  return `${count} ${label}`
}

export function frequencyLabel(frequency) {
  return {
    monthly: 'Monthly',
    biweekly: 'Bi-weekly',
    weekly: 'Weekly',
  }[frequency] || 'Monthly'
}

export function csvCell(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}
