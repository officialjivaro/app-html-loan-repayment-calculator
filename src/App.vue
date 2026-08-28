<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppHeader from './components/AppHeader.vue'
import WorkspaceTabs from './components/WorkspaceTabs.vue'
import LoanForm from './components/LoanForm.vue'
import ResultsDashboard from './components/ResultsDashboard.vue'
import AmortizationTable from './components/AmortizationTable.vue'
import LoanComparison from './components/LoanComparison.vue'
import RefinanceWorkspace from './components/RefinanceWorkspace.vue'
import SavedScenarios from './components/SavedScenarios.vue'
import ExportActions from './components/ExportActions.vue'
import SeoContent from './components/SeoContent.vue'
import { useLoanCalculator } from './composables/useLoanCalculator.js'
import { useSavedScenarios } from './composables/useSavedScenarios.js'
import { useShareState } from './composables/useShareState.js'

const CURRENT_STATE_KEY = 'nortune-loan-repayment-current-v1'
const activeWorkspace = ref('repayment')
const {
  loan,
  report,
  errors,
  targetResult,
  status,
  calculate,
  solveTarget,
  applyTargetExtra,
  applyPreset,
  loadState,
  reset,
} = useLoanCalculator()
const {
  scenarios,
  status: savedStatus,
  saveScenario: saveNamedScenario,
  renameScenario,
  deleteScenario,
  clearScenarios,
  getScenario,
} = useSavedScenarios()
const share = useShareState()
let saveTimer = null

const workspaceMeta = computed(() => ({
  repayment: {
    eyebrow: 'Private, browser-based planning',
    title: 'Loan Repayment Calculator',
    lede: 'Model repayment schedules, extra payments, escrow, variable rates, balloon balances, and the full cost of a loan.',
  },
  compare: {
    eyebrow: 'Side-by-side decision support',
    title: 'Compare Loan Offers',
    lede: 'Compare lender offers using consistent payment, interest, fee, balloon, and total-cost calculations.',
  },
  refinance: {
    eyebrow: 'Break-even planning',
    title: 'Refinance Calculator',
    lede: 'Estimate a new payment, closing-cost break-even, holding-period savings, and lifetime cost differences.',
  },
}[activeWorkspace.value]))

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function loadCurrentState() {
  try {
    const stored = JSON.parse(localStorage.getItem(CURRENT_STATE_KEY) || 'null')
    if (stored && typeof stored === 'object') loadState(stored)
  } catch {}
}

function persistCurrentState() {
  try {
    localStorage.setItem(CURRENT_STATE_KEY, JSON.stringify(clone(loan)))
  } catch {}
}

function resetCalculator() {
  reset()
  try {
    localStorage.removeItem(CURRENT_STATE_KEY)
  } catch {}
}

function saveScenario(name) {
  saveNamedScenario(name, clone(loan))
}

function loadScenario(id) {
  const state = getScenario(id)
  if (!state) return
  loadState(state)
  activeWorkspace.value = 'repayment'
  calculate()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

watch(activeWorkspace, () => {
  document.title = `${workspaceMeta.value.title} | Nortune`
})

watch(loan, () => {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(persistCurrentState, 250)
}, { deep: true })

onMounted(() => {
  const sharedState = share.readShareState()
  if (sharedState) loadState(sharedState)
  else loadCurrentState()
  calculate()
  document.title = `${workspaceMeta.value.title} | Nortune`
})
</script>

<template>
  <div class="app-frame">
    <AppHeader />

    <main class="app-shell">
      <section class="intro-section" aria-labelledby="page-title">
        <div class="intro-section__copy">
          <p class="eyebrow">{{ workspaceMeta.eyebrow }}</p>
          <h1 id="page-title">{{ workspaceMeta.title }}</h1>
          <p class="lede">{{ workspaceMeta.lede }}</p>
        </div>
        <aside class="intro-section__note">
          <strong>Runs in your browser</strong>
          <p>Your loan inputs, saved scenarios, calculations, and exports remain on this device unless you copy a share link.</p>
        </aside>
      </section>

      <WorkspaceTabs v-model="activeWorkspace" />

      <section
        v-if="activeWorkspace === 'repayment'"
        id="workspace-repayment"
        role="tabpanel"
        aria-labelledby="tab-repayment"
      >
        <div class="workspace-grid">
          <LoanForm
            :loan="loan"
            :errors="errors"
            :target-result="targetResult"
            :status="status"
            @calculate="calculate"
            @reset="resetCalculator"
            @preset="applyPreset"
            @solve-target="solveTarget"
            @apply-target="applyTargetExtra"
          />
          <ResultsDashboard :report="report" />
        </div>

        <AmortizationTable
          v-if="report"
          :schedule="report.accelerated"
          :currency="loan.currency"
        />

        <div class="utility-grid">
          <SavedScenarios
            :scenarios="scenarios"
            :status="savedStatus"
            :default-name="loan.name"
            @save="saveScenario"
            @load="loadScenario"
            @rename="renameScenario"
            @delete="deleteScenario"
            @clear="clearScenarios"
          />
          <ExportActions
            :report="report"
            :scenario-state="loan"
            :create-share-url="share.createShareUrl"
          />
        </div>
      </section>

      <LoanComparison
        v-else-if="activeWorkspace === 'compare'"
        :base-loan="loan"
      />

      <RefinanceWorkspace v-else />

      <SeoContent />
    </main>
  </div>
</template>
