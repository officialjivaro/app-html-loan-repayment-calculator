<script setup>
import { ref } from 'vue'
import { formatDate } from '../utils/formatters.js'

const props = defineProps({
  scenarios: { type: Array, required: true },
  status: { type: String, default: '' },
  defaultName: { type: String, default: 'Saved scenario' },
})

const emit = defineEmits(['save', 'load', 'rename', 'delete', 'clear'])
const name = ref(props.defaultName)

function save() {
  emit('save', name.value)
}

function rename(item) {
  const nextName = window.prompt('Rename scenario', item.name)
  if (nextName) emit('rename', item.id, nextName)
}

function clearAll() {
  if (props.scenarios.length && window.confirm('Delete every saved scenario?')) emit('clear')
}
</script>

<template>
  <section class="saved-scenarios panel" aria-labelledby="saved-heading">
    <header class="panel__header panel__header--split">
      <div>
        <p class="eyebrow">Browser storage</p>
        <h2 id="saved-heading">Saved scenarios</h2>
        <p>Store named loan settings locally on this device.</p>
      </div>
      <button class="button button--compact button--ghost" type="button" :disabled="!scenarios.length" @click="clearAll">
        Clear all
      </button>
    </header>

    <div class="saved-scenarios__body">
      <div class="saved-scenarios__create">
        <label class="field">
          <span>Scenario name</span>
          <input v-model.trim="name" type="text" maxlength="80" />
        </label>
        <button class="button button--secondary" type="button" @click="save">Save current plan</button>
      </div>

      <div v-if="!scenarios.length" class="empty-inline">No scenarios saved yet.</div>

      <article v-for="item in scenarios" :key="item.id" class="saved-card">
        <div>
          <strong>{{ item.name }}</strong>
          <span>Saved {{ formatDate(item.savedAt.slice(0, 10)) }}</span>
        </div>
        <div class="saved-card__actions">
          <button class="button button--compact button--secondary" type="button" @click="emit('load', item.id)">Load</button>
          <button class="button button--compact button--ghost" type="button" @click="rename(item)">Rename</button>
          <button class="button button--compact button--ghost" type="button" @click="emit('delete', item.id)">Delete</button>
        </div>
      </article>
    </div>

    <p class="saved-status" aria-live="polite">{{ status }}</p>
  </section>
</template>
