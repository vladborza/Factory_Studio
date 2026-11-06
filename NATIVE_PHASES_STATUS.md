# Native operation phases — implementation stopped

> Update 2026-10-13: the six failures below have been repaired. Full suite: 66 passed, 0 failed, including two new regression tests. Existing assertions were not changed. Legacy execution retains engineVersion 0.5.0; models using native phases report 0.6.0. Browser interaction testing and the complete quality-event ledger remain outstanding. No deployment or push. The original stop report below is historical. See REGRESSION_FIXES.md.

Status: INCOMPLETE / NOT RELEASE READY. Date: 2026-10-12.

The user required work to stop if a correctness test failed. Implementation stopped after the first post-change full-suite invocation. No fixes or further tests were performed after that invocation. No deployment or GitHub push was performed.

## Test results

Node 22.18.0: baseline 55 passed / 0 failed. Post-change: 64 tests, 58 passed / 6 failed. Nine new tests were added; six passed and three failed. Three existing tests also failed.

Passing acceptance checks: one CNC requires 30 operator seconds and 130 machine seconds; two CNCs follow the independent 0-20 / 20-40 load and 120-130 / 140-150 unload schedule; resource event intervals show no double booking in these fixtures; automatic-phase repair holds the machine without the operator; four frozen pre-change simulation results match exactly before and after legacy phase migration.

Failed tests:
1. native constant/uniform distribution and provenance validation: expected Romanian validation text differs because of corrupted text encoding.
2. native deadlock/dangling-resource/capacity validation: stopped at the missing-resource message assertion because of corrupted text encoding; subsequent assertions in this test were not reached.
3. native direct/inherited warning: expected Romanian warning text not found; encoding corruption is visible in the edited source.
4. existing network invalid-reference validation: corrupted Romanian error text.
5. existing phase profile validation: corrupted Romanian error text.
6. existing replication statistics: engineVersion changed to 0.6.0 but the existing contract asserts 0.5.0.

These failures are not waived as cosmetic. The working tree is an incomplete candidate, not an accepted implementation. Passing individual numeric cases does not establish overall correctness.

## Candidate semantics (not released)

Operation-local phaseVersion 1 preserves the historical fraction-based execution, including random draw order. Migration explicitly creates a single legacy phase for old single-cycle operations; JSON root schema remains version 2. phaseVersion 2 opts into load, automatic, unload, walk/transfer, inspect and wait phases with independent seconds, constant/uniform distributions, required resources and duration provenance (MEASURED/SPEC/ASSUMPTION plus source note).

Technical resources assigned to the operation remain reserved for the sequence. Temporary phase resources are acquired atomically and released at every boundary. Inherited human demands are optionally added per phase; explicit and inherited demands add, with warnings. Automatic phases reject human reservations. MTBF/MTTR apply only during automatic phases in native mode; repair is the separate down state and retains active resources. Legacy failure semantics remain unchanged.

Deadlock rule: a resource reserved for an entire sequence anywhere in the model cannot also be requested temporarily by a native phase. This restrictive resource partition plus atomic acquisition prevents resource circular waits for admitted configurations. It does not solve finite-buffer/routing deadlocks, starvation, calendar closures or material shortages.

## Changed files this step

- dist/core/native-phases.js — new versioned phase schema, validation, migration, demand warnings, distributions.
- dist/core/phases.js — legacy/native dispatch.
- dist/core/model.js — migration and resource validation integration.
- dist/core/network.js — native phase execution, reservations, repair behavior, quantity-aware trace.
- dist/studio.js — candidate editor actions and native measurement guard.
- dist/features/diagrams/phases.js — phase editor fields and summary.
- dist/features/diagrams/inspector.js — demand warnings.
- dist/features/operator/view.js — native duration presentation.
- dist/features/simulation/view.js — phase/resource trace presentation.
- tests/native-phases.test.mjs — nine new tests.
- tests/fixtures/legacy-phase-baseline.json — frozen outputs captured before changes, including variation/failures, shared operator, Section 8 and rework.
- dist/features/help/view.js — incomplete implementation notice; previous audit documentation retained.
- NATIVE_PHASES_STATUS.md — this report.

The earlier ENGINE_AUDIT.md and characterization fixtures/tests remain prior-turn work, not new deliverables from this step.

## Remaining limitations / next authorized step

First repair file encodings without weakening assertions, resolve engine-version compatibility deliberately, then rerun all tests. Do not publish before a green suite. The editor has not been exercised in a browser. Constant and bounded uniform are the only native distributions; no repair crew, product-specific recipes or phase variable bindings. Native cycle/variation fields are not the phase-duration source of truth; UI consistency across all views still needs review. The final Method & limits documentation still needs a coherent rewrite after validation; it currently clearly marks this candidate as incomplete.
