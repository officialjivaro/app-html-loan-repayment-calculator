<script setup>
import { formatDate, formatMoney } from '../utils/formatters.js'

const props = defineProps({
  loan: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) },
  targetResult: { type: Object, default: null },
})

const emit = defineEmits(['solve-target', 'apply-target'])

function addOneTimePayment() {
  props.loan.oneTimePayments.push({
    id: globalThis.crypto?.randomUUID?.() || `payment-${Date.now()}`,
    mode: 'period',
    period: 12,
    date: '',
    amount: 500,
  })
}

function removeOneTimePayment(index) {
  props.loan.oneTimePayments.splice(index, 1)
}
</script>

<template>
  <details class="advanced-disclosure">
    <summary>
      <span>
        <strong>Extra-payment planner</strong>
        <small>Recurring, annual, one-time, and target-payoff options</small>
      </span>
      <span aria-hidden="true">+</span>
    </summary>

    <div class="advanced-disclosure__content">
      <div class="form-grid">
        <label class="field">
          <span>Extra amount each month</span>
          <input v-model.number="loan.extraMonthly" type="number" min="0" step="0.01" />
          <small v-if="errors.extraMonthly" class="field-error">{{ errors.extraMonthly }}</small>
        </label>

        <label class="field">
          <span>Annual lump sum</span>
          <input v-model.number="loan.annualLumpSum" type="number" min="0" step="0.01" />
          <small v-if="errors.annualLumpSum" class="field-error">{{ errors.annualLumpSum }}</small>
        </label>
      </div>

      <section class="dynamic-list" aria-labelledby="one-time-heading">
        <div class="section-heading-row">
          <div>
            <h3 id="one-time-heading">One-time payments</h3>
            <p>Apply a lump sum on a payment number or the first payment on or after a date.</p>
          </div>
          <button class="button button--compact button--secondary" type="button" @click="addOneTimePayment">
            Add payment
          </button>
        </div>

        <div v-if="!loan.oneTimePayments.length" class="empty-inline">No one-time payments added.</div>

        <div v-for="(event, index) in loan.oneTimePayments" :key="event.id" class="dynamic-row dynamic-row--payment">
          <label class="field">
            <span>Schedule by</span>
            <select v-model="event.mode">
              <option value="period">Payment number</option>
              <option value="date">Date</option>
            </select>
          </label>

          <label v-if="event.mode === 'period'" class="field">
            <span>Payment #</span>
            <input v-model.number="event.period" type="number" min="1" step="1" />
            <small v-if="errors[`oneTimePayments.${index}.period`]" class="field-error">
              {{ errors[`oneTimePayments.${index}.period`] }}
            </small>
          </label>

          <label v-else class="field">
            <span>Payment date</span>
            <input v-model="event.date" type="date" />
            <small v-if="errors[`oneTimePayments.${index}.date`]" class="field-error">
              {{ errors[`oneTimePayments.${index}.date`] }}
            </small>
          </label>

          <label class="field">
            <span>Amount</span>
            <input v-model.number="event.amount" type="number" min="0.01" step="0.01" />
            <small v-if="errors[`oneTimePayments.${index}.amount`]" class="field-error">
              {{ errors[`oneTimePayments.${index}.amount`] }}
            </small>
          </label>

          <button class="button button--compact button--ghost dynamic-row__remove" type="button" @click="removeOneTimePayment(index)">
            Remove
          </button>
        </div>
      </section>

      <section class="target-payoff" aria-labelledby="target-payoff-heading">
        <div>
          <h3 id="target-payoff-heading">Target payoff date</h3>
          <p>Estimate the additional monthly amount needed to reach a specific date.</p>
        </div>

        <div class="target-payoff__controls">
          <label class="field">
            <span>Target date</span>
            <input v-model="loan.targetPayoffDate" type="date" />
          </label>
          <button class="button button--secondary" type="button" @click="emit('solve-target')">Solve target</button>
        </div>

        <div v-if="targetResult" class="target-result" :class="{ 'target-result--error': targetResult.error }">
          <template v-if="targetResult.error">
            {{ targetResult.error }}
          </template>
          <template v-else>
            <div>
              <span>Additional monthly amount</span>
              <strong>{{ formatMoney(targetResult.requiredAdditionalMonthly, loan.currency) }}</strong>
            </div>
            <div>
              <span>Projected payoff</span>
              <strong>{{ formatDate(targetResult.projectedPayoffDate) }}</strong>
            </div>
            <button
              v-if="targetResult.requiredAdditionalMonthly > 0"
              class="button button--compact"
              type="button"
              @click="emit('apply-target')"
            >
              Apply amount
            </button>
          </template>
        </div>
      </section>
    </div>
  </details>
</template>
