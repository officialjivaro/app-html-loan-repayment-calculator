import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildLoanReport,
  calculateLoanSchedule,
  calculateRefinance,
  solveExtraMonthlyForTarget,
} from '../src/utils/loanMath.js'

function baseLoan(overrides = {}) {
  return {
    name: 'Test loan',
    type: 'fixed',
    amount: 10500,
    termValue: 60,
    termUnit: 'months',
    firstPaymentDate: '2026-09-01',
    rate: 4,
    rateType: 'apr',
    frequency: 'monthly',
    compounding: 12,
    currency: '$',
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
    interestOnlyMonths: 24,
    balloonAmortizationValue: 30,
    balloonAmortizationUnit: 'years',
    ...overrides,
  }
}

function close(actual, expected, tolerance = 0.02) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} was not within ${tolerance} of ${expected}`)
}

test('fixed-rate reference case reconciles payment and interest', () => {
  const schedule = calculateLoanSchedule(baseLoan())
  close(schedule.regularPayment, 193.37348)
  close(schedule.totalInterest, 1102.40889)
  close(schedule.totalPrincipal, 10500)
  close(schedule.totalLoanPaid, 11602.40889)
  assert.ok(schedule.finalBalance <= 0.005)
  assert.equal(schedule.periodCount, 60)
})

test('zero-interest loan produces level principal payments', () => {
  const schedule = calculateLoanSchedule(baseLoan({ amount: 1200, termValue: 12, rate: 0 }))
  close(schedule.regularPayment, 100)
  close(schedule.totalInterest, 0)
  close(schedule.totalLoanPaid, 1200)
})

test('escrow changes out-of-pocket totals without changing interest', () => {
  const withoutEscrow = calculateLoanSchedule(baseLoan())
  const withEscrow = calculateLoanSchedule(baseLoan({ tax: 220 }))
  close(withEscrow.totalInterest, withoutEscrow.totalInterest)
  close(withEscrow.rows[0].totalPayment - withEscrow.rows[0].loanPayment, 220)
  close(withEscrow.totalEscrow, 13200)
})

test('rolled fees increase principal while upfront fees do not', () => {
  const rolled = calculateLoanSchedule(baseLoan({ amount: 10000, fees: 500, feeMode: 'roll' }))
  const upfront = calculateLoanSchedule(baseLoan({ amount: 10000, fees: 500, feeMode: 'upfront' }))
  close(rolled.input.principal, 10500)
  close(upfront.input.principal, 10000)
  close(upfront.upfrontFees, 500)
})

test('recurring and one-time extras shorten payoff and save interest', () => {
  const report = buildLoanReport(baseLoan({
    extraMonthly: 50,
    oneTimePayments: [{ id: 'event-1', mode: 'period', period: 12, amount: 500 }],
  }))
  assert.ok(report.accelerated.periodCount < report.baseline.periodCount)
  assert.ok(report.interestSaved > 0)
  assert.ok(report.accelerated.finalBalance <= 0.005)
})

test('variable-rate loan re-amortizes at the change period', () => {
  const schedule = calculateLoanSchedule(baseLoan({
    type: 'variable',
    variableRateChanges: [{ id: 'rate-1', startMonth: 13, rate: 8 }],
  }))
  assert.ok(schedule.paymentChanges.some((change) => change.period === 13))
  assert.ok(schedule.rows[12].scheduledPayment > schedule.rows[11].scheduledPayment)
  assert.ok(schedule.finalBalance <= 0.005)
})

test('interest-only loan transitions to amortizing payments', () => {
  const schedule = calculateLoanSchedule(baseLoan({ type: 'interest-only', interestOnlyMonths: 12 }))
  close(schedule.rows[0].principalPaid, 0)
  assert.ok(schedule.rows[12].principalPaid > 0)
  assert.ok(schedule.finalBalance <= 0.005)
})

test('balloon loan reports the remaining maturity balance', () => {
  const schedule = calculateLoanSchedule(baseLoan({
    type: 'balloon',
    termValue: 60,
    balloonAmortizationValue: 30,
    balloonAmortizationUnit: 'years',
  }))
  assert.ok(schedule.balloonAmount > 0)
  assert.ok(schedule.rows.at(-1).balloonPayment > 0)
  assert.ok(schedule.finalBalance <= 0.005)
})

test('target payoff solver finds additional monthly payment', () => {
  const result = solveExtraMonthlyForTarget(baseLoan(), '2029-09-01')
  assert.equal(result.error, undefined)
  assert.ok(result.requiredAdditionalMonthly > 0)
  assert.ok(result.projectedPeriodCount <= result.targetPeriod)
})



test('biweekly frequency uses 26 payments per year and preserves principal', () => {
  const schedule = calculateLoanSchedule(baseLoan({
    amount: 26000,
    termValue: 12,
    frequency: 'biweekly',
    rate: 0,
  }))
  assert.equal(schedule.periodCount, 26)
  close(schedule.regularPayment, 1000)
  close(schedule.totalPrincipal, 26000)
})

test('annual and dated lump sums are applied to principal', () => {
  const baseline = calculateLoanSchedule(baseLoan())
  const accelerated = calculateLoanSchedule(baseLoan({
    annualLumpSum: 500,
    oneTimePayments: [{ id: 'date-event', mode: 'date', date: '2027-03-01', amount: 750 }],
  }))
  assert.ok(accelerated.periodCount < baseline.periodCount)
  assert.ok(accelerated.totalInterest < baseline.totalInterest)
  assert.ok(accelerated.rows.some((row) => row.extraPayment >= 750))
})

test('full-term interest-only loan reports maturity principal', () => {
  const schedule = calculateLoanSchedule(baseLoan({
    type: 'interest-only',
    interestOnlyMonths: 60,
  }))
  assert.ok(schedule.balloonAmount > 10000)
  assert.ok(schedule.warnings.some((warning) => warning.includes('full principal')))
  assert.ok(schedule.finalBalance <= 0.005)
})

test('all tested structures reconcile principal without negative balances', () => {
  const structures = [
    baseLoan(),
    baseLoan({ type: 'variable', variableRateChanges: [{ id: 'r', startMonth: 25, rate: 7 }] }),
    baseLoan({ type: 'interest-only', interestOnlyMonths: 18 }),
    baseLoan({ type: 'balloon', balloonAmortizationValue: 30, balloonAmortizationUnit: 'years' }),
  ]
  for (const input of structures) {
    const schedule = calculateLoanSchedule(input)
    close(schedule.totalPrincipal, schedule.input.principal)
    assert.ok(schedule.rows.every((row) => row.balance >= 0 && row.principalPaid >= 0))
  }
})

test('refinance analysis returns payment and break-even information', () => {
  const result = calculateRefinance({
    currentBalance: 200000,
    currentRate: 7,
    currentPayment: 1796.18,
    currentRemainingMonths: 180,
    newRate: 5,
    newTermYears: 15,
    closingCosts: 3000,
    cashOut: 0,
    expectedHoldYears: 10,
    firstPaymentDate: '2026-09-01',
    currency: '$',
  })
  assert.ok(result.newPayment < 1796.18)
  assert.ok(result.breakEvenMonth !== null)
  assert.ok(Number.isFinite(result.holdingSavings))
})
