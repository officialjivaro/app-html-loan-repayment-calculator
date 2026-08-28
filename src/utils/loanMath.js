const BALANCE_TOLERANCE = 0.005

export const paymentFrequencies = {
  monthly: { paymentsPerYear: 12, intervalDays: null },
  biweekly: { paymentsPerYear: 26, intervalDays: 14 },
  weekly: { paymentsPerYear: 52, intervalDays: 7 },
}

export function termToMonths(value, unit = 'months') {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return Number.NaN
  return unit === 'years' ? amount * 12 : amount
}

export function periodsForMonths(months, frequency = 'monthly') {
  const meta = paymentFrequencies[frequency] || paymentFrequencies.monthly
  return Math.max(1, Math.round((Number(months) / 12) * meta.paymentsPerYear))
}

export function periodicRateFromAnnual({ rate, rateType = 'apr', compounding = 12, paymentsPerYear = 12 }) {
  const annualRate = Number(rate) / 100
  if (!Number.isFinite(annualRate) || annualRate <= 0) return 0
  if (rateType === 'apy') return Math.pow(1 + annualRate, 1 / paymentsPerYear) - 1
  return Math.pow(1 + annualRate / Number(compounding || 12), Number(compounding || 12) / paymentsPerYear) - 1
}

export function amortizingPayment(principal, periodicRate, periods) {
  const balance = Number(principal)
  const count = Math.max(1, Number(periods))
  if (periodicRate <= 0) return balance / count
  return balance * (periodicRate / (1 - Math.pow(1 + periodicRate, -count)))
}

function parseIsoDate(value) {
  const [year, month, day] = String(value || '').split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  return Number.isNaN(date.getTime()) ? null : date
}

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

function addMonthsClamped(date, months) {
  const source = new Date(date.getTime())
  const day = source.getUTCDate()
  source.setUTCDate(1)
  source.setUTCMonth(source.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + 1, 0)).getUTCDate()
  source.setUTCDate(Math.min(day, lastDay))
  return source
}

export function paymentDateForPeriod(firstPaymentDate, period, frequency = 'monthly') {
  const first = parseIsoDate(firstPaymentDate)
  if (!first) return ''
  const index = Math.max(0, Number(period) - 1)
  if (frequency === 'monthly') return isoDate(addMonthsClamped(first, index))
  const days = (paymentFrequencies[frequency]?.intervalDays || 30) * index
  return isoDate(new Date(first.getTime() + days * 86400000))
}

export function paymentPeriodForDate(firstPaymentDate, targetDate, frequency = 'monthly', maxPeriods = 2400) {
  const target = parseIsoDate(targetDate)
  const first = parseIsoDate(firstPaymentDate)
  if (!target || !first) return Number.NaN
  if (target <= first) return 1

  if (frequency !== 'monthly') {
    const interval = paymentFrequencies[frequency]?.intervalDays || 7
    const diffDays = (target.getTime() - first.getTime()) / 86400000
    return Math.max(1, Math.ceil(diffDays / interval) + 1)
  }

  for (let period = 1; period <= maxPeriods; period += 1) {
    const date = parseIsoDate(paymentDateForPeriod(firstPaymentDate, period, frequency))
    if (date && date >= target) return period
  }
  return maxPeriods
}

function monthlyEquivalentPerPeriod(monthlyAmount, paymentsPerYear) {
  return (Number(monthlyAmount || 0) * 12) / paymentsPerYear
}

function rateChangePeriod(startMonth, paymentsPerYear) {
  return Math.max(2, Math.round(((Number(startMonth) - 1) * paymentsPerYear) / 12) + 1)
}

function normalizeOneTimePayments(input, totalPeriods) {
  const paymentMap = new Map()
  for (const event of input.oneTimePayments || []) {
    const amount = Number(event.amount || 0)
    if (amount <= 0) continue
    const period = event.mode === 'date'
      ? paymentPeriodForDate(input.firstPaymentDate, event.date, input.frequency, totalPeriods)
      : Number(event.period)
    if (!Number.isInteger(period) || period < 1 || period > totalPeriods) continue
    paymentMap.set(period, (paymentMap.get(period) || 0) + amount)
  }
  return paymentMap
}

function normalizeLoanInput(input) {
  const termMonths = termToMonths(input.termValue, input.termUnit)
  const paymentsPerYear = paymentFrequencies[input.frequency]?.paymentsPerYear || 12
  const totalPeriods = periodsForMonths(termMonths, input.frequency)
  const financedFees = input.feeMode === 'roll' ? Number(input.fees || 0) : 0
  const upfrontFees = input.feeMode === 'upfront' ? Number(input.fees || 0) : 0
  const principal = Number(input.amount || 0) + financedFees
  const monthlyEscrow = ['tax', 'insurance', 'hoa', 'pmi', 'otherEscrow']
    .reduce((sum, key) => sum + Number(input[key] || 0), 0)

  return {
    ...input,
    termMonths,
    paymentsPerYear,
    totalPeriods,
    financedFees,
    upfrontFees,
    principal,
    monthlyEscrow,
    escrowPerPeriod: monthlyEquivalentPerPeriod(monthlyEscrow, paymentsPerYear),
    recurringExtraPerPeriod: monthlyEquivalentPerPeriod(input.extraMonthly, paymentsPerYear),
    basePeriodicRate: periodicRateFromAnnual({
      rate: input.rate,
      rateType: input.rateType,
      compounding: input.compounding,
      paymentsPerYear,
    }),
  }
}

function annualRateForPeriod(normalized, period, variableChanges) {
  if (normalized.type !== 'variable') return Number(normalized.rate || 0)
  let rate = Number(normalized.rate || 0)
  for (const change of variableChanges) {
    if (period >= change.period) rate = change.rate
    else break
  }
  return rate
}

function finaliseTotals(normalized, rows, warnings, paymentChanges) {
  const totalPrincipal = rows.reduce((sum, row) => sum + row.principalPaid, 0)
  const totalInterest = rows.reduce((sum, row) => sum + row.interest, 0)
  const totalLoanPaid = rows.reduce((sum, row) => sum + row.loanPayment, 0)
  const totalEscrow = rows.reduce((sum, row) => sum + row.escrow, 0)
  const balloonAmount = rows.reduce((sum, row) => sum + row.balloonPayment, 0)
  const finalBalance = rows.at(-1)?.balance ?? normalized.principal

  return {
    input: normalized,
    rows,
    paymentChanges,
    warnings,
    regularPayment: rows[0]?.scheduledPayment || 0,
    maxLoanPayment: Math.max(0, ...rows.map((row) => row.loanPayment)),
    totalPrincipal,
    totalInterest,
    totalLoanPaid,
    totalEscrow,
    upfrontFees: normalized.upfrontFees,
    totalOutOfPocket: totalLoanPaid + totalEscrow + normalized.upfrontFees,
    balloonAmount,
    finalBalance,
    periodCount: rows.length,
    payoffDate: rows.at(-1)?.date || '',
    paidOffEarly: finalBalance <= BALANCE_TOLERANCE && rows.length < normalized.totalPeriods,
  }
}

export function calculateLoanSchedule(input, options = {}) {
  const normalized = normalizeLoanInput(input)
  const includeExtras = options.includeExtras !== false
  const additionalMonthly = Number(options.additionalMonthly || 0)
  const recurringExtra = includeExtras
    ? normalized.recurringExtraPerPeriod + monthlyEquivalentPerPeriod(additionalMonthly, normalized.paymentsPerYear)
    : 0
  const annualLumpSum = includeExtras ? Number(normalized.annualLumpSum || 0) : 0
  const oneTimePayments = includeExtras ? normalizeOneTimePayments(normalized, normalized.totalPeriods) : new Map()
  const rows = []
  const warnings = []
  const paymentChanges = []
  let balance = normalized.principal
  let currentScheduledPayment = 0
  let previousScheduledPayment = null
  let currentAnnualRate = Number(normalized.rate || 0)
  let currentPeriodicRate = normalized.basePeriodicRate

  const variableChanges = (normalized.variableRateChanges || [])
    .map((change) => ({
      period: rateChangePeriod(change.startMonth, normalized.paymentsPerYear),
      rate: Number(change.rate || 0),
    }))
    .sort((a, b) => a.period - b.period)

  const variableChangeMap = new Map(variableChanges.map((change) => [change.period, change.rate]))
  const interestOnlyPeriods = normalized.type === 'interest-only'
    ? Math.min(normalized.totalPeriods, periodsForMonths(normalized.interestOnlyMonths, normalized.frequency))
    : 0
  const balloonAmortizationMonths = normalized.type === 'balloon'
    ? termToMonths(normalized.balloonAmortizationValue, normalized.balloonAmortizationUnit)
    : normalized.termMonths
  const balloonAmortizationPeriods = periodsForMonths(balloonAmortizationMonths, normalized.frequency)

  if (normalized.type === 'fixed') {
    currentScheduledPayment = amortizingPayment(balance, currentPeriodicRate, normalized.totalPeriods)
  } else if (normalized.type === 'variable') {
    currentScheduledPayment = amortizingPayment(balance, currentPeriodicRate, normalized.totalPeriods)
  } else if (normalized.type === 'balloon') {
    currentScheduledPayment = amortizingPayment(balance, currentPeriodicRate, balloonAmortizationPeriods)
  }

  for (let period = 1; period <= normalized.totalPeriods && balance > BALANCE_TOLERANCE; period += 1) {
    const periodsRemaining = normalized.totalPeriods - period + 1

    if (normalized.type === 'variable' && variableChangeMap.has(period)) {
      currentAnnualRate = variableChangeMap.get(period)
      currentPeriodicRate = periodicRateFromAnnual({
        rate: currentAnnualRate,
        rateType: normalized.rateType,
        compounding: normalized.compounding,
        paymentsPerYear: normalized.paymentsPerYear,
      })
      currentScheduledPayment = amortizingPayment(balance, currentPeriodicRate, periodsRemaining)
    }

    if (normalized.type === 'interest-only' && period === interestOnlyPeriods + 1) {
      currentScheduledPayment = amortizingPayment(balance, currentPeriodicRate, periodsRemaining)
    }

    const interest = balance * currentPeriodicRate
    let scheduledPayment

    if (normalized.type === 'interest-only' && period <= interestOnlyPeriods) {
      scheduledPayment = interest
    } else {
      scheduledPayment = currentScheduledPayment
    }

    if (previousScheduledPayment !== null && Math.abs(scheduledPayment - previousScheduledPayment) > 0.005) {
      const changePercent = previousScheduledPayment > 0
        ? ((scheduledPayment - previousScheduledPayment) / previousScheduledPayment) * 100
        : 0
      paymentChanges.push({
        period,
        date: paymentDateForPeriod(normalized.firstPaymentDate, period, normalized.frequency),
        previousPayment: previousScheduledPayment,
        newPayment: scheduledPayment,
        changePercent,
        annualRate: currentAnnualRate,
      })
      if (Math.abs(changePercent) >= 10) {
        warnings.push(`Payment changes by ${Math.abs(changePercent).toFixed(1)}% at payment ${period}.`)
      }
    }
    previousScheduledPayment = scheduledPayment

    const amountDueWithoutExtras = balance + interest
    scheduledPayment = Math.min(scheduledPayment, amountDueWithoutExtras)
    const scheduledPrincipal = Math.max(0, scheduledPayment - interest)
    let remainingAfterScheduled = Math.max(0, balance - scheduledPrincipal)

    let extraPayment = recurringExtra
    if (annualLumpSum > 0 && period % normalized.paymentsPerYear === 0) extraPayment += annualLumpSum
    extraPayment += oneTimePayments.get(period) || 0
    extraPayment = Math.min(extraPayment, remainingAfterScheduled)
    remainingAfterScheduled -= extraPayment

    let balloonPayment = 0
    const fullTermInterestOnly = normalized.type === 'interest-only' && interestOnlyPeriods >= normalized.totalPeriods
    const maturityPrincipalDue = period === normalized.totalPeriods && (normalized.type === 'balloon' || fullTermInterestOnly)

    if (maturityPrincipalDue && remainingAfterScheduled > BALANCE_TOLERANCE) {
      balloonPayment = remainingAfterScheduled
      remainingAfterScheduled = 0
    }

    const principalPaid = scheduledPrincipal + extraPayment + balloonPayment
    balance = Math.max(0, remainingAfterScheduled)
    const date = paymentDateForPeriod(normalized.firstPaymentDate, period, normalized.frequency)
    const loanPayment = interest + principalPaid

    rows.push({
      period,
      date,
      annualRate: annualRateForPeriod(normalized, period, variableChanges),
      scheduledPayment,
      scheduledPrincipal,
      extraPayment,
      balloonPayment,
      principalPaid,
      interest,
      loanPayment,
      escrow: normalized.escrowPerPeriod,
      totalPayment: loanPayment + normalized.escrowPerPeriod,
      balance,
    })
  }

  const balloonAmount = rows.reduce((sum, row) => sum + row.balloonPayment, 0)
  if (normalized.type === 'balloon' && balloonAmount > currentScheduledPayment * 2) {
    warnings.push(`A final balloon payment of ${balloonAmount.toFixed(2)} is due at maturity.`)
  }
  if (normalized.type === 'interest-only' && interestOnlyPeriods >= normalized.totalPeriods && balloonAmount > 0) {
    warnings.push('The full principal remains due at the end of the interest-only term.')
  }

  return finaliseTotals(normalized, rows, [...new Set(warnings)], paymentChanges)
}

export function buildLoanReport(input) {
  const baseline = calculateLoanSchedule(input, { includeExtras: false })
  const accelerated = calculateLoanSchedule(input, { includeExtras: true })

  return {
    input,
    baseline,
    accelerated,
    interestSaved: Math.max(0, baseline.totalInterest - accelerated.totalInterest),
    periodsSaved: Math.max(0, baseline.periodCount - accelerated.periodCount),
    totalCostSaved: Math.max(0, baseline.totalOutOfPocket - accelerated.totalOutOfPocket),
    warnings: [...new Set([...baseline.warnings, ...accelerated.warnings])],
  }
}

export function solveExtraMonthlyForTarget(input, targetDate) {
  const baseline = calculateLoanSchedule(input, { includeExtras: true })
  const targetPeriod = paymentPeriodForDate(input.firstPaymentDate, targetDate, input.frequency, baseline.input.totalPeriods)

  if (!Number.isFinite(targetPeriod) || targetPeriod < 1) {
    return { error: 'Choose a valid target payoff date.' }
  }
  if (targetPeriod >= baseline.periodCount) {
    return {
      targetPeriod,
      requiredAdditionalMonthly: 0,
      projectedPeriodCount: baseline.periodCount,
      projectedPayoffDate: baseline.payoffDate,
    }
  }

  let low = 0
  let high = Math.max(Number(input.amount || 0) / Math.max(1, targetPeriod), 100)
  let highSchedule = calculateLoanSchedule(input, { includeExtras: true, additionalMonthly: high })

  while (highSchedule.periodCount > targetPeriod && high < Number(input.amount || 0) * 24 + 1000000) {
    high *= 2
    highSchedule = calculateLoanSchedule(input, { includeExtras: true, additionalMonthly: high })
  }

  if (highSchedule.periodCount > targetPeriod) {
    return { error: 'A target payment could not be solved for this scenario.' }
  }

  for (let iteration = 0; iteration < 70; iteration += 1) {
    const midpoint = (low + high) / 2
    const schedule = calculateLoanSchedule(input, { includeExtras: true, additionalMonthly: midpoint })
    if (schedule.periodCount <= targetPeriod) high = midpoint
    else low = midpoint
  }

  const requiredAdditionalMonthly = high
  const schedule = calculateLoanSchedule(input, { includeExtras: true, additionalMonthly: requiredAdditionalMonthly })

  return {
    targetPeriod,
    requiredAdditionalMonthly,
    projectedPeriodCount: schedule.periodCount,
    projectedPayoffDate: schedule.payoffDate,
    schedule,
  }
}

export function annualSummary(schedule) {
  const years = new Map()
  for (const row of schedule.rows || []) {
    const year = row.date ? row.date.slice(0, 4) : String(Math.ceil(row.period / schedule.input.paymentsPerYear))
    const summary = years.get(year) || {
      year,
      payments: 0,
      principal: 0,
      interest: 0,
      extra: 0,
      escrow: 0,
      endingBalance: row.balance,
    }
    summary.payments += row.loanPayment
    summary.principal += row.principalPaid
    summary.interest += row.interest
    summary.extra += row.extraPayment
    summary.escrow += row.escrow
    summary.endingBalance = row.balance
    years.set(year, summary)
  }
  return [...years.values()]
}

export function compareLoanOffers(offers) {
  const results = offers.map((offer) => ({
    offer,
    report: buildLoanReport(offer),
  }))

  const minimum = (selector) => Math.min(...results.map(selector))
  const lowestPayment = minimum((item) => item.report.accelerated.regularPayment)
  const lowestInterest = minimum((item) => item.report.accelerated.totalInterest)
  const lowestCost = minimum((item) => item.report.accelerated.totalOutOfPocket)

  return results.map((item) => ({
    ...item,
    winners: {
      payment: Math.abs(item.report.accelerated.regularPayment - lowestPayment) < 0.01,
      interest: Math.abs(item.report.accelerated.totalInterest - lowestInterest) < 0.01,
      cost: Math.abs(item.report.accelerated.totalOutOfPocket - lowestCost) < 0.01,
    },
  }))
}

function customMonthlySchedule({ balance, annualRate, payment, months, firstPaymentDate }) {
  const rows = []
  const periodicRate = periodicRateFromAnnual({ rate: annualRate, rateType: 'apr', compounding: 12, paymentsPerYear: 12 })
  let currentBalance = Number(balance || 0)
  let totalInterest = 0
  let totalPaid = 0
  let negativeAmortization = false

  for (let period = 1; period <= Number(months || 0) && currentBalance > BALANCE_TOLERANCE; period += 1) {
    const interest = currentBalance * periodicRate
    const actualPayment = Math.min(Number(payment || 0), currentBalance + interest)
    const principal = actualPayment - interest
    if (principal <= 0) negativeAmortization = true
    currentBalance = Math.max(0, currentBalance - principal)
    totalInterest += interest
    totalPaid += actualPayment
    rows.push({
      period,
      date: paymentDateForPeriod(firstPaymentDate, period, 'monthly'),
      payment: actualPayment,
      principal,
      interest,
      balance: currentBalance,
    })
  }

  return { rows, totalInterest, totalPaid, finalBalance: currentBalance, negativeAmortization }
}

export function calculateRefinance(input) {
  const firstPaymentDate = input.firstPaymentDate
  const current = customMonthlySchedule({
    balance: input.currentBalance,
    annualRate: input.currentRate,
    payment: input.currentPayment,
    months: input.currentRemainingMonths,
    firstPaymentDate,
  })

  const proposedInput = {
    name: 'Proposed refinance',
    type: 'fixed',
    amount: Number(input.currentBalance || 0) + Number(input.cashOut || 0),
    termValue: Number(input.newTermYears || 0),
    termUnit: 'years',
    firstPaymentDate,
    rate: Number(input.newRate || 0),
    rateType: 'apr',
    frequency: 'monthly',
    compounding: 12,
    currency: input.currency || '$',
    fees: 0,
    feeMode: 'upfront',
    tax: 0,
    insurance: 0,
    hoa: 0,
    pmi: 0,
    otherEscrow: 0,
    extraMonthly: 0,
    annualLumpSum: 0,
    oneTimePayments: [],
    targetPayoffDate: '',
    variableRateChanges: [],
    interestOnlyMonths: 0,
    balloonAmortizationValue: 30,
    balloonAmortizationUnit: 'years',
  }
  const proposed = calculateLoanSchedule(proposedInput, { includeExtras: false })
  const closingCosts = Number(input.closingCosts || 0)
  const maxMonths = Math.max(current.rows.length, proposed.rows.length)
  let cumulativeSavings = -closingCosts
  let breakEvenMonth = null

  for (let month = 1; month <= maxMonths; month += 1) {
    cumulativeSavings += (current.rows[month - 1]?.payment || 0) - (proposed.rows[month - 1]?.loanPayment || 0)
    if (breakEvenMonth === null && cumulativeSavings >= 0) breakEvenMonth = month
  }

  const holdingMonths = Math.max(0, Math.round(Number(input.expectedHoldYears || 0) * 12))
  const paidThrough = (rows, months, key) => rows.slice(0, months).reduce((sum, row) => sum + Number(row[key] || 0), 0)
  const holdingSavings = paidThrough(current.rows, holdingMonths, 'payment')
    - paidThrough(proposed.rows, holdingMonths, 'loanPayment')
    - closingCosts

  const warnings = []
  if (current.negativeAmortization) warnings.push('The current payment does not consistently cover accrued interest.')
  if (current.finalBalance > BALANCE_TOLERANCE) warnings.push('The entered current payment does not repay the current balance within the remaining term.')
  if (breakEvenMonth === null) warnings.push('The proposed refinance does not recover closing costs from payment savings within the compared schedules.')
  if (Number(input.cashOut || 0) > 0) warnings.push('Cash-out proceeds increase the new balance and are not treated as savings.')

  return {
    input,
    current,
    proposed,
    newPayment: proposed.regularPayment,
    monthlySavings: Number(input.currentPayment || 0) - proposed.regularPayment,
    lifetimeInterestChange: current.totalInterest - proposed.totalInterest,
    lifetimeNetSavings: current.totalPaid - proposed.totalLoanPaid - closingCosts,
    holdingSavings,
    breakEvenMonth,
    breakEvenDate: breakEvenMonth ? paymentDateForPeriod(firstPaymentDate, breakEvenMonth, 'monthly') : '',
    warnings,
  }
}
