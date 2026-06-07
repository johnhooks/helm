# Project Board

This is the repo-native tracking document for current Helm implementation
tasks. Completed tasks are archived in `.plans/tasks/.archive/`.

## Active

## Blocked

-   [test-02-research-stub-candidates](tasks/test-02-research-stub-candidates.md) - Research stub mocking for NavigationService and ActionProcessor tests. `testing` `p3` Blocked by: test-01 should land first so this research can evaluate the established stub pattern.

## Ready

-   [dev-01-time-scale-constant](tasks/dev-01-time-scale-constant.md) - Add a time-scale constant for manual testing. `dev` `p2`
-   [nav-11-enforce-waypoint-visibility](tasks/nav-11-enforce-waypoint-visibility.md) - Enforce waypoint visibility on the backend. `navigation` `p3`
-   [nav-21-add-multiphase-route-scan](tasks/nav-21-add-multiphase-route-scan.md) - Add multiphase route scan. `navigation` `p2`
-   [rest-01-add-response-schemas](tasks/rest-01-add-response-schemas.md) - Add response schemas to REST controllers. `rest` `p2`
-   [test-01-refactor-scan-resolver-test](tasks/test-01-refactor-scan-resolver-test.md) - Refactor scan resolver test to stub navigation service. `testing` `p2`

## Draft

-   [actions-02-add-typed-action-contracts](tasks/actions-02-add-typed-action-contracts.md) - Add typed action contracts. `dev` `p2`
-   [actions-03-standardize-multiphase-processing](tasks/actions-03-standardize-multiphase-processing.md) - Standardize multiphase action processing. `dev` `p1`
-   [broadcast-01-add-event-outbox](tasks/broadcast-01-add-event-outbox.md) - Add a broadcast event outbox. `dev` `p1`
-   [broadcast-02-publish-ship-events](tasks/broadcast-02-publish-ship-events.md) - Publish ship broadcast events. `dev` `p1`
-   [broadcast-03-poll-events-with-heartbeat](tasks/broadcast-03-poll-events-with-heartbeat.md) - Poll broadcast events with heartbeat. `dev` `p1`
-   [broadcast-04-handle-stale-event-cursors](tasks/broadcast-04-handle-stale-event-cursors.md) - Handle stale broadcast cursors. `dev` `p1`
-   [broadcast-05-align-ship-state-resource](tasks/broadcast-05-align-ship-state-resource.md) - Align ship state resource serialization. `rest` `p3`
-   [dev-02-convert-js-tooling-to-pnpm](tasks/dev-02-convert-js-tooling-to-pnpm.md) - Convert JavaScript tooling to pnpm. `dev` `p1`
-   [errors-01-review-helm-error-api](tasks/errors-01-review-helm-error-api.md) - Review HelmError display API. `dev` `p3`
-   [nav-13-add-scan-result-reconciler](tasks/nav-13-add-scan-result-reconciler.md) - Add a scan result reconciler. `navigation` `p2`
-   [nav-16-show-active-scan-line](tasks/nav-16-show-active-scan-line.md) - Show active scan lines on the starfield. `navigation` `p2`
-   [nav-20-investigate-route-animation-performance](tasks/nav-20-investigate-route-animation-performance.md) - Investigate route animation performance. `navigation` `p2`
-   [nav-23-render-multiphase-jump-progress](tasks/nav-23-render-multiphase-jump-progress.md) - Render active route jump progress. `navigation` `p2`
-   [nav-24-render-completed-route-jumps](tasks/nav-24-render-completed-route-jumps.md) - Render completed route jumps. `navigation` `p2`
-   [nav-25-add-jump-route-preview](tasks/nav-25-add-jump-route-preview.md) - Add jump route preview. `navigation` `p2`
-   [nav-26-improve-route-path-card](tasks/nav-26-improve-route-path-card.md) - Improve route path card. `navigation` `p2`
-   [nav-27-move-jump-progress-to-navigation](tasks/nav-27-move-jump-progress-to-navigation.md) - Move jump progress to navigation. `navigation` `p1`
-   [nav-28-base-jumps-on-start-time](tasks/nav-28-base-jumps-on-start-time.md) - Base jump progress on start time. `navigation` `p1`
-   [sec-01-address-security-audit-findings](tasks/sec-01-address-security-audit-findings.md) - Address security audit findings. `dev` `p1`
-   [ship-01-add-ship-event-ledger](tasks/ship-01-add-ship-event-ledger.md) - Add a ship event ledger. `simulation` `p2`

## Ideas

-   [actions-04-research-processor-owned-resolution](tasks/actions-04-research-processor-owned-resolution.md) - Research processor-owned action resolution. `dev` `p2`
-   [actions-05-evaluate-overdue-phase-catchup](tasks/actions-05-evaluate-overdue-phase-catchup.md) - Evaluate overdue phase catchup. `dev` `p2`

## Done

-   [nav-22-wire-route-aware-jump-ui](tasks/nav-22-wire-route-aware-jump-ui.md) - Wire route-aware jump draft UI. `navigation` `p2`
