<script setup>
const props = defineProps({
  loan: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) },
})

function addRateChange() {
  props.loan.variableRateChanges.push({
    id: globalThis.crypto?.randomUUID?.() || `rate-${Date.now()}`,
    startMonth: Math.min(13 + props.loan.variableRateChanges.length * 12, 359),
    rate: Number(props.loan.rate || 0) + 1,
  })
}

function removeRateChange(index) {
  props.loan.variableRateChanges.splice(index, 1)
}
</script>

<template>
  <fieldset class="form-section">
    <legend>Loan structure</legend>

    <div class="form-grid">
      <label class="field">
        <span>Loan type</span>
        <select v-model="loan.type">
          <option value="fixed">Fixed-rate</option>
          <option value="variable">Variable-rate</option>
          <option value="interest-only">Interest-only</option>
          <option value="balloon">Balloon</option>
        </select>
      </label>

      <label v-if="loan.type === 'interest-only'" class="field">
        <span>Interest-only months</span>
        <input v-model.number="loan.interestOnlyMonths" type="number" min="1" step="1" />
        <small v-if="errors.interestOnlyMonths" class="field-error">{{ errors.interestOnlyMonths }}</small>
      </label>

      <template v-if="loan.type === 'balloon'">
        <label class="field">
          <span>Payment amortization term</span>
          <span class="input-pair">
            <input v-model.number="loan.balloonAmortizationValue" type="number" min="1" step="1" />
            <select v-model="loan.balloonAmortizationUnit">
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </span>
          <small v-if="errors.balloonAmortizationValue" class="field-error">{{ errors.balloonAmortizationValue }}</small>
        </label>
        <p class="field-help field-help--full">
          Regular payments use this longer amortization term. The remaining balance is due when the main loan term ends.
        </p>
      </template>
    </div>
  </fieldset>

  <section v-if="loan.type === 'variable'" class="dynamic-list" aria-labelledby="variable-rate-heading">
    <div class="section-heading-row">
      <div>
        <h3 id="variable-rate-heading">Variable-rate timeline</h3>
        <p>Enter the month when each new annual rate takes effect.</p>
      </div>
      <button class="button button--compact button--secondary" type="button" @click="addRateChange">
        Add rate change
      </button>
    </div>

    <div v-if="!loan.variableRateChanges.length" class="empty-inline">
      The starting rate applies for the full term until a change is added.
    </div>

    <div v-for="(change, index) in loan.variableRateChanges" :key="change.id" class="dynamic-row">
      <label class="field">
        <span>Effective month</span>
        <input v-model.number="change.startMonth" type="number" min="2" step="1" />
        <small v-if="errors[`variableRateChanges.${index}.startMonth`]" class="field-error">
          {{ errors[`variableRateChanges.${index}.startMonth`] }}
        </small>
      </label>

      <label class="field">
        <span>New annual rate</span>
        <span class="input-with-unit">
          <input v-model.number="change.rate" type="number" min="0" max="100" step="0.01" />
          <span>%</span>
        </span>
        <small v-if="errors[`variableRateChanges.${index}.rate`]" class="field-error">
          {{ errors[`variableRateChanges.${index}.rate`] }}
        </small>
      </label>

      <button class="button button--compact button--ghost dynamic-row__remove" type="button" @click="removeRateChange(index)">
        Remove
      </button>
    </div>
  </section>
</template>
