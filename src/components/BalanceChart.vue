<script setup>
import { computed } from 'vue'
import { formatMoney } from '../utils/formatters.js'

const props = defineProps({
  baseline: { type: Object, required: true },
  accelerated: { type: Object, required: true },
  currency: { type: String, default: '$' },
})

const width = 1000
const height = 320
const pad = { left: 70, right: 24, top: 24, bottom: 42 }

function sampleRows(rows, limit = 140) {
  if (rows.length <= limit) return rows
  const step = (rows.length - 1) / (limit - 1)
  return Array.from({ length: limit }, (_, index) => rows[Math.round(index * step)])
}

const maxPeriods = computed(() => Math.max(props.baseline.rows.length, props.accelerated.rows.length, 1))
const maxBalance = computed(() => Math.max(
  props.baseline.input.principal,
  props.accelerated.input.principal,
  ...props.baseline.rows.map((row) => row.balance),
  ...props.accelerated.rows.map((row) => row.balance),
  1,
))

function points(schedule) {
  const rows = [{ period: 0, balance: schedule.input.principal }, ...sampleRows(schedule.rows)]
  const chartWidth = width - pad.left - pad.right
  const chartHeight = height - pad.top - pad.bottom
  return rows.map((row) => {
    const x = pad.left + (row.period / maxPeriods.value) * chartWidth
    const y = pad.top + (1 - row.balance / maxBalance.value) * chartHeight
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

const baselinePoints = computed(() => points(props.baseline))
const acceleratedPoints = computed(() => points(props.accelerated))
const ticks = computed(() => [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
  ratio,
  y: pad.top + ratio * (height - pad.top - pad.bottom),
  value: maxBalance.value * (1 - ratio),
})))
</script>

<template>
  <figure class="balance-chart">
    <svg
      :viewBox="`0 0 ${width} ${height}`"
      role="img"
      :aria-label="`Remaining balance chart. Standard payoff takes ${baseline.periodCount} payments and accelerated payoff takes ${accelerated.periodCount} payments.`"
    >
      <g class="balance-chart__grid">
        <template v-for="tick in ticks" :key="tick.ratio">
          <line :x1="pad.left" :x2="width - pad.right" :y1="tick.y" :y2="tick.y" />
          <text :x="pad.left - 12" :y="tick.y + 4" text-anchor="end">{{ formatMoney(tick.value, currency) }}</text>
        </template>
      </g>

      <polyline class="balance-chart__line balance-chart__line--baseline" :points="baselinePoints" />
      <polyline class="balance-chart__line balance-chart__line--accelerated" :points="acceleratedPoints" />

      <text :x="pad.left" :y="height - 12">Payment 0</text>
      <text :x="width - pad.right" :y="height - 12" text-anchor="end">Payment {{ maxPeriods }}</text>
    </svg>

    <figcaption class="chart-legend">
      <span><i class="chart-key chart-key--baseline"></i> Standard plan</span>
      <span><i class="chart-key chart-key--accelerated"></i> Accelerated plan</span>
    </figcaption>
  </figure>
</template>
