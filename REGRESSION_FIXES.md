# Regression fixes — 2026-10-13

The six previous failures are resolved. Node 22.18.0, full suite `node --test --test-reporter=spec tests/*.test.mjs`: 66 passed, 0 failed, including Docker API integration. No existing test was modified or relaxed.

## Changes

- Repaired accidental UTF-8/Windows-1252 decoding corruption in dist/core/model.js, dist/core/phases.js, dist/core/native-phases.js, dist/core/network.js, dist/studio.js, dist/features/diagrams/inspector.js, dist/features/operator/view.js and dist/features/simulation/view.js. Repaired text without replacing simulation logic.
- dist/core/network.js: execution metadata now reports 0.5.0 for legacy-only models and 0.6.0 if any operation uses native phase schema 2. This preserves the old result contract while identifying changed native semantics. JSON root schema stays at version 2.
- tests/phase-regressions.test.mjs: two additional tests cover legacy/native version identity through migration and UTF-8/mojibake regressions in edited source files.
- dist/features/help/view.js: removed obsolete failure notices, documented native/legacy semantics, reported passing tests and remaining limitations.
- NATIVE_PHASES_STATUS.md and EVENT_LOG_STATUS.md: retained historical failure reports with current resolution notices.
- REGRESSION_FIXES.md: this report.

## Limits

No browser interaction QA, deployment or GitHub push was performed. The complete event ledger requested previously is not implemented. Current trace retains its 2000-interval limit. Native distributions remain constant and bounded uniform; calendar and repair/resource limitations documented in Method & limits remain. A passing suite establishes the tested contracts, not production qualification of all native-phase behavior.
