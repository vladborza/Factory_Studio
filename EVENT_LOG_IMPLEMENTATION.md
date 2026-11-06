# Complete event log — implementation stopped at compatibility failure

Date: 2026-10-13. Status: INCOMPLETE / NOT RELEASE READY. No publication or push.

## Validation

The first implementation passed all 79 tests (66 existing plus 13 new). Browser QA then confirmed a Web Worker run, PASS integrity display, event-type filtering, unit search, resource timeline, JSON/CSV downloads and saving/reopening a quality code in an isolated QA model.

Two more tests were added for forward travel following rework and codes named like object properties. After the corresponding changes, the final full-suite command failed in tests/v04.test.mjs:42, `Docker APIs integrate catalog, deterministic simulation and persistent revision-safe models`. The command was Node 22.18.0, `node --test --test-reporter=spec tests/*.test.mjs`.

The immediate change used null-prototype dictionaries for state/material/quality accounting to safely accept identifiers such as constructor. Those dictionary prototypes do not survive JSON transport. The existing Docker test compares the deserialized API response with the direct result via deepStrictEqual, exposing a result-contract incompatibility. HTTP simulation returned 200; the strict response comparison failed. Later persistence assertions in that test were not reached. The earlier green run is not certification of the current candidate.

Work stopped after this failure under user rule (6); no corrective changes or test reruns followed. No existing assertions were weakened. The next authorized repair must make the public result plain-JSON-compatible while retaining safe internal accounting, then rerun the whole suite.

## Candidate functionality already in the working tree

- Stable per-run unit IDs; monotonic event sequence; run_start contains the snapshot, settings and seed. All times are seconds.
- Arrival, transfer/delivery, phase start/end, operation completion, resource reserve/release with owner and quantity, block/unblock, starvation start/end, failure/repair, calendar ON/OFF, material consume/produce, unit good/scrap/final WIP and sample events.
- Inspection result, scrap, rework route, retest and downtime start/end. Inspection outcomes describe the existing station completion/scrap/routing logic, not an independent measurement/detection model. Passing inspection has no defect (code null). A failed inspection and its scrap/rework incident are separate records of the same outcome, not two defective units.
- Optional model.qualityCodes entries with code/name/class/severity/originStation; operation quality mappings scrapCode/reworkCode/downtimeCode; flow rework flag and reasonCode. Missing incident codes resolve to UNSPECIFIED and are counted in data-quality warnings. Old JSON remains valid; no root schema change.
- Explicit rework routes or returns to a station encountered earlier in the unit's route count as rework. Ordinary forward travel after that return does not create another incident. Legacy loop inference is a documented convention, not proof that a route is a quality failure.
- Complete state accounting for every operation and resource: busy, idle, blocked, starved, waiting-for-resource, waiting-for-material, down, off-shift. Capacity-normalized state seconds sum to the horizon. Active work takes priority over calendar OFF; unreserved pool capacity is idle/off-shift, not inferred starved. Retained pools inherit the owning channel's busy/down/phase-wait state. Source backlog remains WIP.
- Independent replay checks reserve/release ownership and capacity, terminal uniqueness and conservation, material balance, state-time coverage, code totals and numerical agreement for production/lead time/WIP/transit, costs/energy, operation counts/queue/waits, resource occupancy and outputs.
- Per-replication logs retained by replicate; low-level simulateNetwork retains its historical return shape unless called with third argument {audit:true}. Browser and Docker use replicate and thus request logging. Legacy trace remains capped at 2000 intervals; the separate complete ledger aborts above 500000 events instead of returning a truncated-success result.
- Results UI: replication selector, event type and unit/station/resource/code filtering, pagination (100 rows), details, integrity checks, code counts, SVG resource/operation timeline, full JSON and filtered CSV export. CSV protects formula-prefixed cells. Quality code editor is available under Results; adding codes uses a validated JSON list, assignments use selectors.

## Files changed in this task

- dist/core/event-log.js (new): quality validation, recorder, independent replay/integrity, CSV.
- dist/core/network.js: instrumentation, unit IDs/route history, state intervals, audit integration and logs for each replication.
- dist/core/model.js: optional quality metadata validation.
- dist/features/simulation/events.js (new): log controls, filters, integrity panel, timeline and exports.
- dist/features/simulation/view.js: results integration and quality configuration entry.
- dist/studio.js: bindings and model quality-code/route configuration.
- tests/event-log.test.mjs (new): 15 tests, including six reference models, corrupted reservations/terminals/material/state/code events, repeatability, seed variation, UNSPECIFIED, inspection/retest/rework BOM, native repair/calendar, replication/export, invalid configuration, forward-route rework semantics and object-property code names.
- dist/features/help/view.js: candidate behavior, semantics, limits and failure status.
- EVENT_LOG_IMPLEMENTATION.md and EVENT_LOG_STATUS.md: current status/report.
- event-log-preview.png: screenshot from the earlier browser QA; not evidence that the final compatibility test passed.

Other modified/untracked files in the repository predate this task and belong to the audit/native-phase work.

## Known limitations

The current candidate fails Docker result parity and must not be published. No durable experiment database, streaming logs or cryptographic tamper proofing. Logs are held in memory and can be large across 20 replications; Docker memory/time limits still apply. JSON export is needed to retain them after the session. The ledger supports replay checks but its final checkpoint is not a trusted digital signature; coordinated falsification is outside scope. Open phases/repairs at the horizon remain open and their units are WIP; no synthetic completion is invented. Zero-duration block/unblock pairs can occur at immediately available outputs. Quality severity/class are descriptive, not modifiers to routing or defect probabilities. Inspection results occur at operation completion, not independently at every internal inspect phase. No new optimization recommendation or confidence claim is introduced.
