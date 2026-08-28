import { ref } from 'vue'

const STORAGE_KEY = 'nortune-loan-repayment-scenarios-v1'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function readStorage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function useSavedScenarios() {
  const scenarios = ref(readStorage())
  const status = ref('')

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios.value))
      return true
    } catch {
      status.value = 'Saved scenarios are unavailable in this browser.'
      return false
    }
  }

  function saveScenario(name, state) {
    const label = String(name || state.name || 'Saved scenario').trim().slice(0, 80)
    const item = {
      id: globalThis.crypto?.randomUUID?.() || `scenario-${Date.now()}`,
      name: label || 'Saved scenario',
      savedAt: new Date().toISOString(),
      state: clone(state),
    }
    scenarios.value.unshift(item)
    if (persist()) status.value = `Saved “${item.name}”.`
    return item
  }

  function renameScenario(id, name) {
    const item = scenarios.value.find((scenario) => scenario.id === id)
    if (!item) return
    item.name = String(name || item.name).trim().slice(0, 80) || item.name
    if (persist()) status.value = 'Scenario renamed.'
  }

  function deleteScenario(id) {
    scenarios.value = scenarios.value.filter((scenario) => scenario.id !== id)
    if (persist()) status.value = 'Scenario deleted.'
  }

  function clearScenarios() {
    scenarios.value = []
    if (persist()) status.value = 'All saved scenarios cleared.'
  }

  function getScenario(id) {
    const item = scenarios.value.find((scenario) => scenario.id === id)
    return item ? clone(item.state) : null
  }

  return {
    scenarios,
    status,
    saveScenario,
    renameScenario,
    deleteScenario,
    clearScenarios,
    getScenario,
  }
}
