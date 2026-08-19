# Route scan private state stacked PR plan

## Purpose

The route scan systems-state spike lives on `spike/multiphase-route-scan` as a
reference implementation. Its central storage decision was reversed by
`tasks/actions-06-store-private-action-state.md`. Private progress for one
running action belongs on that action, not in a `ship_state.systems_state`
blob. Rebuild the work as smaller stacked PRs against the action-owned model,
mining the spike for its lifecycle shape, validator hardening, public result
contract, and test scenarios.

## Proposed stack

### PR 1: Add private action runtime state

Task: `tasks/actions-06-store-private-action-state.md`

Goal: let long-running actions persist private runtime state without changing
route scan behavior yet.

Scope:

-   Add a private runtime state field to ship actions (schema and model).
-   Repository handling for reading and writing the field.
-   Keep runtime state out of REST resources and broadcasts by default.
-   Focused tests for persistence, dirty tracking, and non-exposure.

### PR 2: Move route scan bookkeeping to action runtime state

Task: `tasks/nav-21-add-multiphase-route-scan.md`

Goal: make the scan action's private runtime state authoritative for active
route scan progress.

Scope:

-   Handler captures `from_node_id` into params at creation and initializes
    private cycle state.
-   Validator checks source and target nodes exist and target is in scan
    range.
-   Resolver advances private cycle state instead of reading resume progress
    from the public result.
-   No-discovery cycles stay non-final and schedule the next checkpoint from
    the scan start anchor.
-   Discovery checkpoints append public route data to `result` while the scan
    can continue; terminal states retain accumulated discoveries.

### PR 3: Clean public route scan action contract

Goal: settle the public result shape once private state has moved.

Scope:

-   Result holds public route data directly, not nested under a `route_scan`
    key.
-   Remove rolls, probabilities, and cycle logs from public output.
-   Remove duplicate fields derivable from params, path, and status.
-   Update backend tests and REST/action resource expectations.
-   Leave JS/UI contract updates for a follow-up if needed.

### PR 4: Clean up Navigation scan API

Goal: settle the one-checkpoint scan API after the runtime model is proven.

Scope:

-   Remove `ScanResult` if no longer needed.
-   Keep the one-hop scan phase flow explicit in `NavigationService`,
    `NavComputer`, and CLI helpers.
-   Avoid mixing gameplay behavior changes with the migration unless
    required.

### PR 5: Documentation and task cleanup

Goal: align planning docs with the final implementation.

Scope:

-   Mark `actions-06` and `nav-21` done with outcomes.
-   Decide whether to keep this plan or archive it.
-   Delete `spike/multiphase-route-scan` once nothing left to mine.

## Guiding model

-   `ship_action.params` is the historical command receipt.
-   `ship_action` private runtime state is authoritative private progress for
    that action.
-   `ship_action.status` and `ship_action.result` are public lifecycle and
    outcome.
-   `ship_state` holds only facts that remain true independently of any one
    action.
