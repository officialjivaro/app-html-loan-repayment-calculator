<script setup>
import { reactive, ref } from 'vue'
import { compareLoanOffers } from '../utils/loanMath.js'
import { createDefaultLoan } from '../data/presets.js'
import { formatDate, formatMoney } from '../utils/formatters.js'

const props = defineProps({
  baseLoan: { type: Object, required: true },
})

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function comparisonOffer(name, source = null) {
  const base = { ...createDefaultLoan(), ...(source ? clone(source) : {}) }
  return {
    ...base,
    id: globalThis.crypto?.randomUUID?.() || `offer-${Date.now()}-${Math.random()}`,
    name,
    type: base.type === 'balloon' ? 'balloon' : 'fixed',
    extraMonthly: 0,
    annualLumpSum: 0,
    oneTimePayments: [],
    variableRateChanges: [],
  }
}

const offers = reactive([
  comparisonOffer('Offer A', props.baseLoan),
  comparisonOffer('Offer B', { ...props.baseLoan, rate: Number(props.baseLoan.rate || 0) + 0.75, fees: Number(props.baseLoan.fees || 0) + 500 }),
])
const results = ref([])
const error = ref('')

function addOffer() {
  if (offers.length >= 3) return
  offers.push(comparisonOffer(`Offer ${String.fromCharCode(65 + offers.length)}`, props.baseLoan))
}

function removeOffer(index) {
  if (offers.length <= 2) return
  offers.splice(index, 1)
}

function duplicateCurrent() {
  offers.splice(0, offers.length, comparisonOffer('Offer A', props.baseLoan), comparisonOffer('Offer B', props.baseLoan))
  results.value = []
  error.value = ''
}

function calculate() {
  const invalid = offers.some((offer) => Number(offer.amount) <= 0 || Number(offer.termValue) <= 0 || Number(offer.rate) < 0)
  if (invalid) {
    error.value = 'Every offer needs a positive amount and term, plus a non-negative rate.'
    results.value = []
    return
  }
  error.value = ''
  results.value = compareLoanOffers(offers.map((offer) => clone(offer)))
}
</script>

<template>
  <section id="workspace-compare" class="comparison-workspace" role="tabpanel" aria-labelledby="tab-compare">
    <header class="section-header">
      <p class="eyebrow">Offer comparison</p>
      <h2>Compare Loan Offers</h2>
      <p>Review up to three lender offers using the same cost definitions and repayment engine.</p>
    </header>

    <div class="comparison-toolbar">
      <button class="button button--secondary" type="button" @click="duplicateCurrent">Use current plan</button>
      <button class="button button--ghost" type="button" :disabled="offers.length >= 3" @click="addOffer">Add third offer</button>
      <button class="button" type="button" @click="calculate">Compare offers</button>
    </div>

    <div class="offer-grid" :class="{ 'offer-grid--three': offers.length === 3 }">
      <article v-for="(offer, index) in offers" :key="offer.id" class="offer-card panel">
        <header class="offer-card__header">
          <label class="field">
            <span>Offer name</span>
            <input v-model.trim="offer.name" type="text" maxlength="40" />
          </label>
          <button v-if="offers.length > 2" class="button button--compact button--ghost" type="button" @click="removeOffer(index)">
            Remove
          </button>
        </header>

        <div class="offer-card__body form-grid">
          <label class="field">
            <span>Loan amount</span>
            <input v-model.number="offer.amount" type="number" min="0" step="0.01" />
          </label>
          <label class="field">
            <span>Loan type</span>
            <select v-model="offer.type">
              <option value="fixed">Fixed-rate</option>
              <option value="balloon">Balloon</option>
            </select>
          </label>
          <label class="field">
            <span>Annual rate</span>
            <span class="input-with-unit">
              <input v-model.number="offer.rate" type="number" min="0" step="0.01" />
              <span>%</span>
            </span>
          </label>
          <label class="field">
            <span>Term</span>
            <span class="input-pair">
              <input v-model.number="offer.termValue" type="number" min="1" step="1" />
              <select v-model="offer.termUnit">
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </span>
          </label>
          <label class="field">
            <span>Origination fees</span>
            <input v-model.number="offer.fees" type="number" min="0" step="0.01" />
          </label>
          <label class="field">
            <span>Fee handling</span>
            <select v-model="offer.feeMode">
              <option value="roll">Roll into loan</option>
              <option value="upfront">Pay upfront</option>
            </select>
          </label>
          <label class="field field--full">
            <span>Payment frequency</span>
            <select v-model="offer.frequency">
              <option value="monthly">Monthly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
          <template v-if="offer.type === 'balloon'">
            <label class="field field--full">
              <span>Payment amortization term</span>
              <span class="input-pair">
                <input v-model.number="offer.balloonAmortizationValue" type="number" min="1" step="1" />
                <select v-model="offer.balloonAmortizationUnit">
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </span>
            </label>
          </template>
        </div>
      </article>
    </div>

    <p v-if="error" class="validation-summary" role="alert">{{ error }}</p>

    <section v-if="results.length" class="comparison-results panel" aria-labelledby="comparison-results-heading">
      <header class="panel__header">
        <p class="eyebrow">Results</p>
        <h2 id="comparison-results-heading">Offer scorecard</h2>
        <p>Lowest payment, interest, and total cost are highlighted independently.</p>
      </header>
      <div class="comparison-results__grid">
        <article v-for="item in results" :key="item.offer.id" class="comparison-result-card">
          <div class="comparison-result-card__heading">
            <div>
              <span>{{ item.offer.name }}</span>
              <strong>{{ item.offer.rate.toFixed(2) }}%</strong>
            </div>
            <div class="winner-tags">
              <span v-if="item.winners.payment">Lowest payment</span>
              <span v-if="item.winners.interest">Lowest interest</span>
              <span v-if="item.winners.cost">Lowest total cost</span>
            </div>
          </div>
          <dl>
            <div><dt>Regular payment</dt><dd>{{ formatMoney(item.report.accelerated.regularPayment, item.offer.currency) }}</dd></div>
            <div><dt>Total interest</dt><dd>{{ formatMoney(item.report.accelerated.totalInterest, item.offer.currency) }}</dd></div>
            <div><dt>Total out-of-pocket</dt><dd>{{ formatMoney(item.report.accelerated.totalOutOfPocket, item.offer.currency) }}</dd></div>
            <div><dt>Payoff date</dt><dd>{{ formatDate(item.report.accelerated.payoffDate) }}</dd></div>
            <div v-if="item.report.accelerated.balloonAmount > 0"><dt>Balloon amount</dt><dd>{{ formatMoney(item.report.accelerated.balloonAmount, item.offer.currency) }}</dd></div>
          </dl>
        </article>
      </div>
    </section>
  </section>
</template>
