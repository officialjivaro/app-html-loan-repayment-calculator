<script setup>
import LoanTypeFields from './LoanTypeFields.vue'
import ExtraPaymentPlanner from './ExtraPaymentPlanner.vue'

const props = defineProps({
  loan: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) },
  targetResult: { type: Object, default: null },
  status: { type: String, default: '' },
})

const emit = defineEmits(['calculate', 'reset', 'preset', 'solve-target', 'apply-target'])

const presets = [
  ['mortgage', 'Mortgage'],
  ['auto', 'Auto loan'],
  ['personal', 'Personal loan'],
  ['student', 'Student loan'],
  ['refinance', 'Refinance'],
]

function submit() {
  emit('calculate')
}
</script>

<template>
  <form class="calculator-form panel" novalidate @submit.prevent="submit">
    <header class="panel__header">
      <p class="eyebrow">Inputs</p>
      <h2>Build your repayment plan</h2>
      <p>Start with a preset or enter the terms from a lender disclosure.</p>
    </header>

    <section class="preset-section">
      <div class="section-heading-row">
        <div>
          <h3>Quick presets</h3>
          <p>Presets provide editable starting values only.</p>
        </div>
        <div class="preset-buttons" aria-label="Loan presets">
          <button
            v-for="([key, label]) in presets"
            :key="key"
            class="button button--compact button--ghost"
            type="button"
            @click="emit('preset', key)"
          >
            {{ label }}
          </button>
        </div>
      </div>
    </section>

    <fieldset class="form-section">
      <legend>Core loan details</legend>
      <div class="form-grid">
        <label class="field field--full">
          <span>Scenario name</span>
          <input v-model.trim="loan.name" type="text" maxlength="80" />
        </label>

        <label class="field">
          <span>Loan amount</span>
          <input v-model.number="loan.amount" type="number" min="0" step="0.01" inputmode="decimal" />
          <small v-if="errors.amount" class="field-error">{{ errors.amount }}</small>
        </label>

        <label class="field">
          <span>Currency symbol</span>
          <input v-model.trim="loan.currency" type="text" maxlength="4" />
        </label>

        <label class="field">
          <span>Loan term</span>
          <span class="input-pair">
            <input v-model.number="loan.termValue" type="number" min="1" step="1" />
            <select v-model="loan.termUnit">
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </span>
          <small v-if="errors.termValue" class="field-error">{{ errors.termValue }}</small>
        </label>

        <label class="field">
          <span>First payment date</span>
          <input v-model="loan.firstPaymentDate" type="date" />
          <small v-if="errors.firstPaymentDate" class="field-error">{{ errors.firstPaymentDate }}</small>
        </label>

        <label class="field">
          <span>Annual rate</span>
          <span class="input-pair">
            <span class="input-with-unit">
              <input v-model.number="loan.rate" type="number" min="0" max="100" step="0.01" inputmode="decimal" />
              <span>%</span>
            </span>
            <select v-model="loan.rateType">
              <option value="apr">APR</option>
              <option value="apy">APY</option>
            </select>
          </span>
          <small v-if="errors.rate" class="field-error">{{ errors.rate }}</small>
        </label>

        <label class="field">
          <span>Payment frequency</span>
          <select v-model="loan.frequency">
            <option value="monthly">Monthly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>

        <label class="field">
          <span>Compounding</span>
          <select v-model.number="loan.compounding">
            <option :value="12">Monthly</option>
            <option :value="52">Weekly</option>
            <option :value="365">Daily</option>
            <option :value="1">Yearly</option>
          </select>
          <small class="field-help">APR uses this frequency. APY already includes compounding.</small>
        </label>
      </div>
    </fieldset>

    <LoanTypeFields :loan="loan" :errors="errors" />

    <details class="advanced-disclosure">
      <summary>
        <span>
          <strong>Fees and escrow</strong>
          <small>Origination fees, property costs, insurance, HOA, and PMI</small>
        </span>
        <span aria-hidden="true">+</span>
      </summary>

      <div class="advanced-disclosure__content">
        <div class="form-grid">
          <label class="field">
            <span>Origination fees</span>
            <input v-model.number="loan.fees" type="number" min="0" step="0.01" />
            <small v-if="errors.fees" class="field-error">{{ errors.fees }}</small>
          </label>

          <label class="field">
            <span>Fee handling</span>
            <select v-model="loan.feeMode">
              <option value="roll">Roll into the loan</option>
              <option value="upfront">Pay upfront</option>
            </select>
          </label>

          <label class="field">
            <span>Monthly property taxes</span>
            <input v-model.number="loan.tax" type="number" min="0" step="0.01" />
            <small v-if="errors.tax" class="field-error">{{ errors.tax }}</small>
          </label>

          <label class="field">
            <span>Monthly insurance</span>
            <input v-model.number="loan.insurance" type="number" min="0" step="0.01" />
            <small v-if="errors.insurance" class="field-error">{{ errors.insurance }}</small>
          </label>

          <label class="field">
            <span>Monthly HOA</span>
            <input v-model.number="loan.hoa" type="number" min="0" step="0.01" />
            <small v-if="errors.hoa" class="field-error">{{ errors.hoa }}</small>
          </label>

          <label class="field">
            <span>Monthly PMI</span>
            <input v-model.number="loan.pmi" type="number" min="0" step="0.01" />
            <small v-if="errors.pmi" class="field-error">{{ errors.pmi }}</small>
          </label>

          <label class="field field--full">
            <span>Other monthly escrow</span>
            <input v-model.number="loan.otherEscrow" type="number" min="0" step="0.01" />
            <small v-if="errors.otherEscrow" class="field-error">{{ errors.otherEscrow }}</small>
          </label>
        </div>
      </div>
    </details>

    <ExtraPaymentPlanner
      :loan="loan"
      :errors="errors"
      :target-result="targetResult"
      @solve-target="emit('solve-target')"
      @apply-target="emit('apply-target')"
    />

    <div v-if="Object.keys(errors).length" class="validation-summary" role="alert">
      Correct the highlighted fields before calculating.
    </div>

    <div class="form-actions">
      <button class="button" type="submit">Calculate</button>
      <button class="button button--ghost" type="button" @click="emit('reset')">Reset</button>
    </div>

    <p v-if="status" class="form-status" aria-live="polite">{{ status }}</p>
  </form>
</template>
