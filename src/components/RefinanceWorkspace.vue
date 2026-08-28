<script setup>
import { reactive, ref } from 'vue'
import { calculateRefinance } from '../utils/loanMath.js'
import { formatDate, formatMoney } from '../utils/formatters.js'

const firstPaymentDate = new Date()
firstPaymentDate.setMonth(firstPaymentDate.getMonth() + 1)

const model = reactive({
  currentBalance: 200000,
  currentRate: 7,
  currentPayment: 1796.18,
  currentRemainingMonths: 180,
  newRate: 5.5,
  newTermYears: 15,
  closingCosts: 3500,
  cashOut: 0,
  expectedHoldYears: 10,
  firstPaymentDate: firstPaymentDate.toISOString().slice(0, 10),
  currency: '$',
})
const result = ref(null)
const error = ref('')

function calculate() {
  if (Number(model.currentBalance) <= 0 || Number(model.currentPayment) <= 0 || Number(model.currentRemainingMonths) <= 0 || Number(model.newTermYears) <= 0) {
    error.value = 'Enter positive balances, payments, and terms.'
    result.value = null
    return
  }
  if ([model.currentRate, model.newRate, model.closingCosts, model.cashOut, model.expectedHoldYears].some((value) => Number(value) < 0)) {
    error.value = 'Rates, costs, cash-out, and holding period cannot be negative.'
    result.value = null
    return
  }
  error.value = ''
  result.value = calculateRefinance({ ...model })
}
</script>

<template>
  <section id="workspace-refinance" class="refinance-workspace" role="tabpanel" aria-labelledby="tab-refinance">
    <header class="section-header">
      <p class="eyebrow">Break-even analysis</p>
      <h2>Refinance Calculator</h2>
      <p>Compare your remaining loan with a proposed replacement and estimate when payment savings recover closing costs.</p>
    </header>

    <div class="workspace-grid workspace-grid--balanced">
      <form class="panel" @submit.prevent="calculate">
        <header class="panel__header">
          <h2>Current and proposed loan</h2>
          <p>Use your actual current payment when available.</p>
        </header>
        <div class="refinance-form">
          <fieldset class="form-section">
            <legend>Current loan</legend>
            <div class="form-grid">
              <label class="field"><span>Remaining balance</span><input v-model.number="model.currentBalance" type="number" min="0" step="0.01" /></label>
              <label class="field"><span>Current APR</span><span class="input-with-unit"><input v-model.number="model.currentRate" type="number" min="0" step="0.01" /><span>%</span></span></label>
              <label class="field"><span>Current monthly payment</span><input v-model.number="model.currentPayment" type="number" min="0" step="0.01" /></label>
              <label class="field"><span>Remaining months</span><input v-model.number="model.currentRemainingMonths" type="number" min="1" step="1" /></label>
            </div>
          </fieldset>

          <fieldset class="form-section">
            <legend>Proposed refinance</legend>
            <div class="form-grid">
              <label class="field"><span>New APR</span><span class="input-with-unit"><input v-model.number="model.newRate" type="number" min="0" step="0.01" /><span>%</span></span></label>
              <label class="field"><span>New term</span><span class="input-with-unit"><input v-model.number="model.newTermYears" type="number" min="1" step="1" /><span>years</span></span></label>
              <label class="field"><span>Closing costs</span><input v-model.number="model.closingCosts" type="number" min="0" step="0.01" /></label>
              <label class="field"><span>Cash-out amount</span><input v-model.number="model.cashOut" type="number" min="0" step="0.01" /></label>
              <label class="field"><span>Expected holding period</span><span class="input-with-unit"><input v-model.number="model.expectedHoldYears" type="number" min="0" step="0.5" /><span>years</span></span></label>
              <label class="field"><span>First new payment date</span><input v-model="model.firstPaymentDate" type="date" /></label>
              <label class="field field--full"><span>Currency symbol</span><input v-model.trim="model.currency" type="text" maxlength="4" /></label>
            </div>
          </fieldset>

          <p v-if="error" class="validation-summary" role="alert">{{ error }}</p>
          <div class="form-actions"><button class="button" type="submit">Calculate refinance</button></div>
        </div>
      </form>

      <section class="panel" aria-labelledby="refinance-results-heading">
        <header class="panel__header">
          <p class="eyebrow">Results</p>
          <h2 id="refinance-results-heading">Refinance outlook</h2>
          <p>Payment savings alone determine the displayed break-even point.</p>
        </header>
        <div v-if="!result" class="results-empty">
          <strong>No refinance comparison yet</strong>
          <p>Complete the fields and calculate.</p>
        </div>
        <div v-else class="results-summary__body">
          <div class="kpi-grid">
            <article class="kpi-card kpi-card--primary"><span>New payment</span><strong>{{ formatMoney(result.newPayment, model.currency) }}</strong><small>Proposed monthly principal and interest</small></article>
            <article class="kpi-card"><span>Monthly savings</span><strong>{{ formatMoney(result.monthlySavings, model.currency) }}</strong><small>Current payment minus proposed payment</small></article>
            <article class="kpi-card"><span>Break-even</span><strong>{{ result.breakEvenMonth ? `${result.breakEvenMonth} months` : 'No break-even' }}</strong><small>{{ result.breakEvenDate ? formatDate(result.breakEvenDate) : 'Closing costs are not recovered' }}</small></article>
            <article class="kpi-card"><span>Holding-period savings</span><strong>{{ formatMoney(result.holdingSavings, model.currency) }}</strong><small>Payment savings minus closing costs</small></article>
            <article class="kpi-card"><span>Lifetime net savings</span><strong>{{ formatMoney(result.lifetimeNetSavings, model.currency) }}</strong><small>Total payment difference after closing costs</small></article>
            <article class="kpi-card"><span>Interest difference</span><strong>{{ formatMoney(result.lifetimeInterestChange, model.currency) }}</strong><small>Current interest minus proposed interest</small></article>
          </div>
          <div v-if="result.warnings.length" class="warning-list">
            <strong>Review these assumptions</strong>
            <ul><li v-for="warning in result.warnings" :key="warning">{{ warning }}</li></ul>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
