<template>
  <section class="seo-content" aria-labelledby="guide-heading">
    <div class="section-header">
      <p class="eyebrow">Calculator guide</p>
      <h2 id="guide-heading">How the loan repayment calculator works</h2>
      <p>
        The calculator builds a payment-by-payment schedule, applies interest before principal, caps the final payment to the amount due, and keeps escrow separate from the loan itself.
      </p>
    </div>

    <div class="guide-grid">
      <article>
        <h3>Model the loan contract</h3>
        <p>Choose a fixed, variable, interest-only, or balloon structure. Add fees, payment frequency, compounding, and the first payment date.</p>
      </article>
      <article>
        <h3>Test faster repayment</h3>
        <p>Add recurring, annual, or one-time principal payments and compare the result with the standard schedule.</p>
      </article>
      <article>
        <h3>Review the full cost</h3>
        <p>Loan payments, interest, escrow, upfront fees, and balloon amounts remain separate so the totals are easier to audit.</p>
      </article>
    </div>

    <div class="faq-list">
      <details>
        <summary>What is the difference between APR and APY?</summary>
        <p>APR is converted using the selected compounding frequency. APY already reflects annual compounding, so the calculator converts it directly to the selected payment frequency.</p>
      </details>
      <details>
        <summary>Do extra payments reduce interest?</summary>
        <p>Yes. Extra amounts are applied to principal after the scheduled interest and principal calculation, which can shorten payoff time and reduce later interest.</p>
      </details>
      <details>
        <summary>Are taxes and insurance counted as interest?</summary>
        <p>No. Property tax, insurance, HOA, PMI, and other escrow are shown as separate out-of-pocket costs and never added to loan interest.</p>
      </details>
      <details>
        <summary>How are variable-rate loans calculated?</summary>
        <p>The remaining balance is re-amortized whenever a new rate becomes effective. Payment changes and large jumps are reported in the results.</p>
      </details>
      <details>
        <summary>What is a balloon payment?</summary>
        <p>A balloon loan uses a longer amortization period to set regular payments but requires the remaining principal when the shorter contract term ends.</p>
      </details>
    </div>

    <p class="app-disclaimer">
      Results are estimates for planning and comparison. Lenders may use different day-count conventions, rounding, fees, or payment rules.
    </p>
  </section>
</template>
