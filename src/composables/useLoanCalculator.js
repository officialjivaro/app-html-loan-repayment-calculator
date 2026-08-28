import { computed, reactive, ref } from 'vue'
import { createDefaultLoan, loanPresets } from '../data/presets.js'
import { buildLoanReport, solveExtraMonthlyForTarget } from '../utils/loanMath.js'
import { hasErrors, validateLoanInput } from '../utils/validation.js'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function useLoanCalculator(initialState = null) {
  const loan = reactive({ ...createDefaultLoan(), ...(initialState ? clone(initialState) : {}) })
  const report = ref(null)
  const errors = ref({})
  const targetResult = ref(null)
  const status = ref('')

  const hasExtraPayments = computed(() => (
    Number(loan.extraMonthly || 0) > 0
    || Number(loan.annualLumpSum || 0) > 0
    || loan.oneTimePayments.some((event) => Number(event.amount || 0) > 0)
  ))

  function calculate() {
    errors.value = validateLoanInput(loan)
    if (hasErrors(errors.value)) {
      report.value = null
      status.value = 'Correct the highlighted fields before calculating.'
      return null
    }
    report.value = buildLoanReport(clone(loan))
    status.value = 'Repayment plan calculated.'
    return report.value
  }

  function solveTarget() {
    errors.value = validateLoanInput(loan)
    if (hasErrors(errors.value)) {
      targetResult.value = { error: 'Correct the highlighted fields first.' }
      return targetResult.value
    }
    if (!loan.targetPayoffDate) {
      targetResult.value = { error: 'Choose a target payoff date.' }
      return targetResult.value
    }
    targetResult.value = solveExtraMonthlyForTarget(clone(loan), loan.targetPayoffDate)
    return targetResult.value
  }

  function applyTargetExtra() {
    if (!targetResult.value || targetResult.value.error) return
    loan.extraMonthly = Number(loan.extraMonthly || 0) + Number(targetResult.value.requiredAdditionalMonthly || 0)
    targetResult.value = null
    calculate()
  }

  function applyPreset(name) {
    const preset = loanPresets[name]
    if (!preset) return
    const firstPaymentDate = loan.firstPaymentDate
    Object.assign(loan, createDefaultLoan(), clone(preset), { firstPaymentDate })
    report.value = null
    targetResult.value = null
    errors.value = {}
    status.value = `${preset.name} preset loaded.`
  }

  function loadState(state) {
    Object.assign(loan, createDefaultLoan(), clone(state || {}))
    report.value = null
    targetResult.value = null
    errors.value = {}
    status.value = 'Scenario loaded.'
  }

  function reset() {
    Object.assign(loan, createDefaultLoan())
    report.value = null
    targetResult.value = null
    errors.value = {}
    status.value = 'Calculator reset.'
  }

  return {
    loan,
    report,
    errors,
    targetResult,
    status,
    hasExtraPayments,
    calculate,
    solveTarget,
    applyTargetExtra,
    applyPreset,
    loadState,
    reset,
  }
}
