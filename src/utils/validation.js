import { termToMonths } from './loanMath.js'

function isNonNegative(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0
}

export function validateLoanInput(input) {
  const errors = {}
  const termMonths = termToMonths(input.termValue, input.termUnit)

  if (!Number.isFinite(Number(input.amount)) || Number(input.amount) <= 0) {
    errors.amount = 'Loan amount must be greater than zero.'
  }

  if (!Number.isFinite(termMonths) || termMonths <= 0) {
    errors.termValue = 'Loan term must be greater than zero.'
  }

  if (!isNonNegative(input.rate) || Number(input.rate) > 100) {
    errors.rate = 'Enter an annual rate from 0% to 100%.'
  }

  for (const key of ['fees', 'tax', 'insurance', 'hoa', 'pmi', 'otherEscrow', 'extraMonthly', 'annualLumpSum']) {
    if (!isNonNegative(input[key])) errors[key] = 'Enter zero or a positive amount.'
  }

  if (!input.firstPaymentDate || Number.isNaN(new Date(`${input.firstPaymentDate}T00:00:00`).getTime())) {
    errors.firstPaymentDate = 'Choose a valid first payment date.'
  }

  if (input.type === 'variable') {
    const seen = new Set()
    let previousMonth = 1
    input.variableRateChanges.forEach((change, index) => {
      const month = Number(change.startMonth)
      const rate = Number(change.rate)
      if (!Number.isInteger(month) || month < 2 || month > termMonths) {
        errors[`variableRateChanges.${index}.startMonth`] = `Use a month from 2 to ${termMonths}.`
      }
      if (!isNonNegative(rate) || rate > 100) {
        errors[`variableRateChanges.${index}.rate`] = 'Enter a rate from 0% to 100%.'
      }
      if (seen.has(month)) errors[`variableRateChanges.${index}.startMonth`] = 'Rate-change months must be unique.'
      if (month < previousMonth) errors[`variableRateChanges.${index}.startMonth`] = 'Rate changes must be in chronological order.'
      seen.add(month)
      previousMonth = month
    })
  }

  if (input.type === 'interest-only') {
    const ioMonths = Number(input.interestOnlyMonths)
    if (!Number.isFinite(ioMonths) || ioMonths < 1 || ioMonths > termMonths) {
      errors.interestOnlyMonths = `Use an interest-only period from 1 to ${termMonths} months.`
    }
  }

  if (input.type === 'balloon') {
    const amortizationMonths = termToMonths(input.balloonAmortizationValue, input.balloonAmortizationUnit)
    if (!Number.isFinite(amortizationMonths) || amortizationMonths <= termMonths) {
      errors.balloonAmortizationValue = 'The amortization term must be longer than the balloon term.'
    }
  }

  input.oneTimePayments.forEach((event, index) => {
    if (!isNonNegative(event.amount) || Number(event.amount) <= 0) {
      errors[`oneTimePayments.${index}.amount`] = 'Enter an amount greater than zero.'
    }
    if (event.mode === 'period' && (!Number.isInteger(Number(event.period)) || Number(event.period) < 1)) {
      errors[`oneTimePayments.${index}.period`] = 'Enter a valid payment number.'
    }
    if (event.mode === 'date' && (!event.date || Number.isNaN(new Date(`${event.date}T00:00:00`).getTime()))) {
      errors[`oneTimePayments.${index}.date`] = 'Choose a valid payment date.'
    }
  })

  return errors
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0
}
