<script setup>
import { ref } from 'vue'
import { buildSummaryText, copyText, exportScheduleCsv, openPrintReport } from '../utils/exporters.js'

const props = defineProps({
  report: { type: Object, default: null },
  createShareUrl: { type: Function, required: true },
  scenarioState: { type: Object, required: true },
})

const status = ref('')

async function copySummary() {
  if (!props.report) return
  await copyText(buildSummaryText(props.report))
  status.value = 'Summary copied.'
}

async function copyShareUrl() {
  try {
    const relativeUrl = props.createShareUrl(props.scenarioState)
    await copyText(`${window.location.origin}${relativeUrl}`)
    status.value = 'Share link copied.'
  } catch (error) {
    status.value = error.message
  }
}

function exportCsv() {
  if (!props.report) return
  status.value = exportScheduleCsv(props.report.accelerated, props.report.input.currency) || 'CSV exported.'
}

function printReport() {
  status.value = openPrintReport(props.report)
    ? 'Print report opened.'
    : 'Allow pop-ups to open the print report.'
}
</script>

<template>
  <section class="export-panel panel" aria-labelledby="export-heading">
    <header class="panel__header panel__header--split">
      <div>
        <p class="eyebrow">Keep or share</p>
        <h2 id="export-heading">Export your plan</h2>
        <p>Exports stay in your browser. The share link contains calculator settings only.</p>
      </div>
    </header>
    <div class="export-panel__body">
      <button class="button" type="button" :disabled="!report" @click="copySummary">Copy summary</button>
      <button class="button button--secondary" type="button" :disabled="!report" @click="exportCsv">Export CSV</button>
      <button class="button button--secondary" type="button" :disabled="!report" @click="printReport">Print report</button>
      <button class="button button--ghost" type="button" @click="copyShareUrl">Copy share link</button>
    </div>
    <p class="export-status" aria-live="polite">{{ status }}</p>
  </section>
</template>
