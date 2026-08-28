<script setup>
import { computed, ref, watch } from 'vue'
import { annualSummary } from '../utils/loanMath.js'
import { formatDate, formatMoney, formatPercent } from '../utils/formatters.js'

const props = defineProps({
  schedule: { type: Object, default: null },
  currency: { type: String, default: '$' },
})

const showAll = ref(false)
const view = ref('payments')
const rowLimit = 24

watch(() => props.schedule, () => {
  showAll.value = false
  view.value = 'payments'
})

const rows = computed(() => {
  if (!props.schedule) return []
  return showAll.value ? props.schedule.rows : props.schedule.rows.slice(0, rowLimit)
})

const yearly = computed(() => props.schedule ? annualSummary(props.schedule) : [])
</script>

<template>
  <section v-if="schedule" class="annual-breakdown panel" aria-labelledby="amortization-heading">
    <header class="panel__header panel__header--split">
      <div>
        <p class="eyebrow">Detailed schedule</p>
        <h2 id="amortization-heading">Amortization breakdown</h2>
        <p>Inspect every payment or switch to a compact annual summary.</p>
      </div>
      <div class="view-switch" role="group" aria-label="Amortization view">
        <button
          class="view-switch__button"
          :class="{ 'view-switch__button--active': view === 'payments' }"
          type="button"
          @click="view = 'payments'"
        >
          Payments
        </button>
        <button
          class="view-switch__button"
          :class="{ 'view-switch__button--active': view === 'years' }"
          type="button"
          @click="view = 'years'"
        >
          Annual
        </button>
      </div>
    </header>

    <div v-if="view === 'payments'" class="table-section">
      <div class="table-scroll">
        <table>
          <caption>Payment-by-payment amortization schedule</caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Date</th>
              <th scope="col">Rate</th>
              <th scope="col">Loan payment</th>
              <th scope="col">Principal</th>
              <th scope="col">Interest</th>
              <th scope="col">Extra</th>
              <th scope="col">Balloon</th>
              <th scope="col">Escrow</th>
              <th scope="col">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.period">
              <td>{{ row.period }}</td>
              <td>{{ formatDate(row.date) }}</td>
              <td>{{ formatPercent(row.annualRate) }}</td>
              <td>{{ formatMoney(row.loanPayment, currency) }}</td>
              <td>{{ formatMoney(row.principalPaid, currency) }}</td>
              <td>{{ formatMoney(row.interest, currency) }}</td>
              <td>{{ formatMoney(row.extraPayment, currency) }}</td>
              <td>{{ formatMoney(row.balloonPayment, currency) }}</td>
              <td>{{ formatMoney(row.escrow, currency) }}</td>
              <td>{{ formatMoney(row.balance, currency) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="schedule.rows.length > rowLimit" class="table-actions">
        <span>Showing {{ rows.length }} of {{ schedule.rows.length }} payments.</span>
        <button class="button button--compact button--secondary" type="button" @click="showAll = !showAll">
          {{ showAll ? 'Show fewer' : 'Show all payments' }}
        </button>
      </div>
    </div>

    <div v-else class="table-section">
      <div class="table-scroll">
        <table>
          <caption>Annual loan summary</caption>
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col">Loan payments</th>
              <th scope="col">Principal</th>
              <th scope="col">Interest</th>
              <th scope="col">Extra</th>
              <th scope="col">Escrow</th>
              <th scope="col">Ending balance</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="year in yearly" :key="year.year">
              <td>{{ year.year }}</td>
              <td>{{ formatMoney(year.payments, currency) }}</td>
              <td>{{ formatMoney(year.principal, currency) }}</td>
              <td>{{ formatMoney(year.interest, currency) }}</td>
              <td>{{ formatMoney(year.extra, currency) }}</td>
              <td>{{ formatMoney(year.escrow, currency) }}</td>
              <td>{{ formatMoney(year.endingBalance, currency) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
