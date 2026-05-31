---
status: draft
area: navigation
priority: p2
depends_on:
    - nav-22-wire-route-aware-jump-ui
---

# Add jump route preview

## Problem

Route-aware jump drafts are currently local-only. The astrometric UI can find a known path and draft the action params that the backend accepts, but it cannot show authoritative duration or core cost before the player confirms. The draft card either has to omit those values or guess from frontend formulas that are not yet wired to the backend formula contract.

The backend already has the canonical route data and the current ship systems needed to estimate a planned jump. It can load the submitted user edge route, validate the ordered route, calculate each leg's duration, and calculate each leg's core cost using the same systems used by action creation and resolution. Without a preview contract, the player gets less useful confirmation UI and future route draft work risks duplicating server behavior in the client.

The preview flow should not create an action, lock the ship, mutate ship state, or replace final validation. It should provide a best current estimate for a draft route. Action creation and resolution remain authoritative.

## Proposed solution

Add a backend jump route preview flow that accepts the same route-aware jump params as action creation: `from_node_id`, `target_node_id`, and ordered `route` edge IDs. The preview should validate and load the route once, walk the route in order, and return a route plan with per-leg distance, duration, and core cost plus totals for the whole route.

The route planning logic should be shared enough that the preview path does not load edges once for validation and again for calculation. A small jump route planner or preview service can produce a route DTO from a ship and params. The DTO should include directed legs so the UI does not need to infer leg direction from edge endpoints.

The astrometric jump draft UI can then request this preview after local draft creation or while rendering the draft card. The response should be treated as an estimate tied to the current ship state. If ship systems, power mode, core life, or route permissions change before confirmation, the create action endpoint must still validate and schedule from current server state.

## Open question

This task assumes a backend preview endpoint is the right short-term bridge. That may not be the right course. The longer-term plan is to have tight shared formulas with parity between PHP and JavaScript, where the backend remains authoritative and the frontend can calculate accurate previews without pinging the server for every draft state. Some of that work exists only as prototype logic in the Holodeck package, and there are still unknowns around ship state, power mode, loadout effects, and formula ownership.

Before implementing this task, decide whether to build this backend preview as an interim feature or instead prioritize wrapping up the formula system and implementing the full jump preview model in both PHP and JavaScript.

## Requirements

-   Add a REST preview endpoint for route-aware jump params.
-   The preview request must use `from_node_id`, `target_node_id`, and `route`.
-   The preview endpoint must require the same ship ownership permission as action creation.
-   Preview must not insert an action, set `current_action_id`, update `deferred_until`, mutate ship state, or mutate components.
-   Preview must validate route ownership and route continuity before returning estimates.
-   Preview should load the user edge route once and reuse the loaded edges for route walking and calculations.
-   The preview response must include per-leg edge id, from node id, to node id, distance in light years, duration, and core cost.
-   The preview response must include total distance, total duration, total core cost, first leg duration, and whether current core life is enough for the estimated full route.
-   Action creation and resolution must remain authoritative and continue to validate current server state.
-   The frontend draft card should render preview duration and core cost when the preview is available, and keep honest placeholders while it is loading or unavailable.
-   Tests must cover preview permissions, invalid routes, direct route previews, multi-leg route previews, no action creation side effects, and draft card rendering with and without preview data.
