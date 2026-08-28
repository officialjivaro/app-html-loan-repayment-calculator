# Loan Repayment Calculator

Complete Vue and Vite source for the Loan Repayment Calculator published by Nortune.

The normal production build creates the exact embedded runtime used at:

https://nortune.net/calculators/loan-repayment-calculator/app/

## Commands

- npm install: install the locked dependencies.
- npm run dev: start Vite for source development.
- npm test: run loan-math tests.
- npm run build: build and apply Nortune runtime integration.
- npm run verify:dist: compare dist with the checked-in Nortune runtime manifest.
- npm run qc: run tests, build, and exact parity verification.

The dist directory is intentionally committed so the repository contains both editable source and the reviewed built application. The runtime directory contains the deterministic Nortune HTML template, storage guard, accessibility enhancements, configuration, and authoritative file manifest.

Do not hand-edit dist. Update source or runtime inputs, run npm run qc, review the output, and synchronize the approved build with website-nortune-net.
