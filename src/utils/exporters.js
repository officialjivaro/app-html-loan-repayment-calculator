import { csvCell, formatDate, formatMoney, formatPercent, formatDuration } from './formatters.js'

export function buildSummaryText(report) {
  if (!report) return ''
  const schedule = report.accelerated
  const symbol = report.input.currency

  return [
    'Loan Repayment Calculator Summary',
    `Loan type: ${report.input.type}`,
    `Financed principal: ${formatMoney(schedule.input.principal, symbol)}`,
    `Regular payment: ${formatMoney(schedule.regularPayment, symbol)}`,
    `Total loan payments: ${formatMoney(schedule.totalLoanPaid, symbol)}`,
    `Total interest: ${formatMoney(schedule.totalInterest, symbol)}`,
    `Total escrow: ${formatMoney(schedule.totalEscrow, symbol)}`,
    `Upfront fees: ${formatMoney(schedule.upfrontFees, symbol)}`,
    `Total out-of-pocket: ${formatMoney(schedule.totalOutOfPocket, symbol)}`,
    `Payoff date: ${formatDate(schedule.payoffDate)}`,
    `Payoff time: ${formatDuration(schedule.periodCount, report.input.frequency)}`,
    `Interest saved: ${formatMoney(report.interestSaved, symbol)}`,
    `Time saved: ${formatDuration(report.periodsSaved, report.input.frequency)}`,
  ].join('\n')
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  document.execCommand('copy')
  area.remove()
}

export function exportScheduleCsv(schedule, symbol = '$') {
  if (!schedule?.rows?.length) return
  const headings = [
    'Payment',
    'Date',
    'Annual Rate',
    'Scheduled Payment',
    'Extra Payment',
    'Balloon Payment',
    'Principal',
    'Interest',
    'Loan Payment',
    'Escrow',
    'Total Payment',
    'Balance',
  ]
  const lines = [headings.map(csvCell).join(',')]

  for (const row of schedule.rows) {
    lines.push([
      row.period,
      row.date,
      formatPercent(row.annualRate, 4),
      row.scheduledPayment.toFixed(2),
      row.extraPayment.toFixed(2),
      row.balloonPayment.toFixed(2),
      row.principalPaid.toFixed(2),
      row.interest.toFixed(2),
      row.loanPayment.toFixed(2),
      row.escrow.toFixed(2),
      row.totalPayment.toFixed(2),
      row.balance.toFixed(2),
    ].map(csvCell).join(','))
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'loan-repayment-amortization-schedule.csv'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)

  return `Exported ${schedule.rows.length} payments in ${symbol}.`
}

function printRows(schedule, symbol) {
  return schedule.rows.map((row) => `
    <tr>
      <td>${row.period}</td>
      <td>${row.date}</td>
      <td>${formatMoney(row.loanPayment, symbol)}</td>
      <td>${formatMoney(row.principalPaid, symbol)}</td>
      <td>${formatMoney(row.interest, symbol)}</td>
      <td>${formatMoney(row.extraPayment, symbol)}</td>
      <td>${formatMoney(row.escrow, symbol)}</td>
      <td>${formatMoney(row.balance, symbol)}</td>
    </tr>
  `).join('')
}

export function openPrintReport(report) {
  if (!report) return false
  const popup = window.open('', '_blank')
  if (!popup) return false
  popup.opener = null
  const schedule = report.accelerated
  const symbol = report.input.currency

  popup.document.write(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Loan Repayment Calculator Report</title>
        <style>
          body { color: #202b36; font: 14px/1.5 Arial, sans-serif; margin: 24px; }
          h1, h2 { color: #111820; font-family: Georgia, serif; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0; }
          .summary div { border: 1px solid #cfd6dc; border-radius: 10px; padding: 10px; }
          .summary span { color: #7b8490; display: block; font-size: 12px; text-transform: uppercase; }
          .summary strong { display: block; font-size: 17px; margin-top: 4px; }
          table { border-collapse: collapse; font-size: 11px; width: 100%; }
          th, td { border: 1px solid #cfd6dc; padding: 6px; text-align: right; }
          th:first-child, td:first-child, th:nth-child(2), td:nth-child(2) { text-align: left; }
          th { background: #ebe8e1; }
          @media print { body { margin: 12mm; } .summary div, tr { break-inside: avoid; } }
        </style>
      </head>
      <body>
        <h1>Loan Repayment Calculator Report</h1>
        <p>${report.input.name || 'Repayment plan'} · ${report.input.type} loan · ${formatDate(schedule.payoffDate)} payoff</p>
        <div class="summary">
          <div><span>Financed principal</span><strong>${formatMoney(schedule.input.principal, symbol)}</strong></div>
          <div><span>Regular payment</span><strong>${formatMoney(schedule.regularPayment, symbol)}</strong></div>
          <div><span>Total interest</span><strong>${formatMoney(schedule.totalInterest, symbol)}</strong></div>
          <div><span>Total escrow</span><strong>${formatMoney(schedule.totalEscrow, symbol)}</strong></div>
          <div><span>Total out-of-pocket</span><strong>${formatMoney(schedule.totalOutOfPocket, symbol)}</strong></div>
          <div><span>Interest saved</span><strong>${formatMoney(report.interestSaved, symbol)}</strong></div>
        </div>
        <h2>Amortization schedule</h2>
        <table>
          <thead><tr><th>#</th><th>Date</th><th>Loan payment</th><th>Principal</th><th>Interest</th><th>Extra</th><th>Escrow</th><th>Balance</th></tr></thead>
          <tbody>${printRows(schedule, symbol)}</tbody>
        </table>
      </body>
    </html>
  `)
  popup.document.close()
  popup.focus()
  setTimeout(() => popup.print(), 250)
  return true
}
