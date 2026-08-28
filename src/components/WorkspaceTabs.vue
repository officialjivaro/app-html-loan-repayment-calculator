<script setup>
const active = defineModel({ type: String, required: true })

const workspaces = [
  { id: 'repayment', label: 'Repayment plan', description: 'Build one detailed repayment scenario.' },
  { id: 'compare', label: 'Compare loans', description: 'Compare up to three offers side by side.' },
  { id: 'refinance', label: 'Refinance', description: 'Estimate payment change and break-even.' },
]

function selectWorkspace(id) {
  active.value = id
}
</script>

<template>
  <section class="mode-selector" aria-labelledby="workspace-heading">
    <div>
      <p class="eyebrow">Workspace</p>
      <h2 id="workspace-heading">Choose what to model</h2>
    </div>

    <div class="mode-selector__options" role="tablist" aria-label="Calculator workspaces">
      <button
        v-for="workspace in workspaces"
        :id="`tab-${workspace.id}`"
        :key="workspace.id"
        class="mode-selector__button"
        :class="{ 'mode-selector__button--active': active === workspace.id }"
        type="button"
        role="tab"
        :aria-selected="active === workspace.id"
        :aria-controls="`workspace-${workspace.id}`"
        @click="selectWorkspace(workspace.id)"
      >
        <strong>{{ workspace.label }}</strong>
        <small>{{ workspace.description }}</small>
      </button>
    </div>
  </section>
</template>
