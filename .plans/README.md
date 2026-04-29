# Project Board

This is the repo-native tracking document for Helm implementation tasks.
Each entry points to the full task file in `.plans/tasks/`.

## Active

No active task is recorded.

## Blocked

- [nav-03-visual-jump-indicator](tasks/nav-03-visual-jump-indicator.md) - Visual Jump Indicator on Starfield. `navigation` `p2` Blocked by: nav-06 must provide a stable datacore route graph for jumpable targets.
- [nav-04-visual-scan-indicator](tasks/nav-04-visual-scan-indicator.md) - Visual Scan Indicator on Starfield. `navigation` `p2` Blocked by: nav-03 and nav-06 must define the ring layer and route graph source first.
- [nav-07-show-routes-toggle](tasks/nav-07-show-routes-toggle.md) - Add a "Show routes" toggle to the viewport. `navigation` `p2` Blocked by: nav-06 must make discovered edges available from datacore.
- [test-02-research-stub-candidates](tasks/test-02-research-stub-candidates.md) - Research stub mocking for NavigationService and ActionProcessor tests. `testing` `p3` Blocked by: test-01 should land first so this research can evaluate the established stub pattern.

## Ready

- [dev-01-time-scale-constant](tasks/dev-01-time-scale-constant.md) - Add a time-scale constant for manual testing. `dev` `p2`
- [nav-06-persist-scan-discoveries](tasks/nav-06-persist-scan-discoveries.md) - Persist scan discoveries in the datacore. `navigation` `p1`
- [nav-11-enforce-waypoint-visibility](tasks/nav-11-enforce-waypoint-visibility.md) - Enforce waypoint visibility on the backend. `navigation` `p1`
- [nav-12-add-node-adjacency-path-selectors](tasks/nav-12-add-node-adjacency-path-selectors.md) - Add node adjacency path selectors. `navigation` `p2`
- [rest-01-add-response-schemas](tasks/rest-01-add-response-schemas.md) - Add response schemas to REST controllers. `rest` `p2`
- [test-01-refactor-scan-resolver-test](tasks/test-01-refactor-scan-resolver-test.md) - Refactor scan resolver test to stub navigation service. `testing` `p2`

## Draft

No draft task is recorded.

## Done

- [nav-01-hide-current-star-actions](tasks/nav-01-hide-current-star-actions.md) - Suppress Navigation Actions on the Current Star's Context Menu. `navigation` `p1`
- [nav-02-wire-jump-trigger](tasks/nav-02-wire-jump-trigger.md) - Wire Jump Trigger in Bridge UI. `navigation` `p1`
- [nav-05-slot-fill-context-menu-actions](tasks/nav-05-slot-fill-context-menu-actions.md) - Refactor Star Context Menu Actions to Slot Fill. `navigation` `p2`
- [nav-08-track-edge-discoveries-per-player](tasks/nav-08-track-edge-discoveries-per-player.md) - Track edge discoveries per player. `navigation` `p1`
- [nav-09-add-user-edge-datacore-queries](tasks/nav-09-add-user-edge-datacore-queries.md) - Add user edge datacore queries. `navigation` `p1`
- [nav-10-sync-user-edges-on-load](tasks/nav-10-sync-user-edges-on-load.md) - Sync user edges on load. `navigation` `p1`
