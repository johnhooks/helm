---
status: draft
area: navigation
priority: p2
depends_on:
    - nav-22-wire-route-aware-jump-ui
    - nav-23-render-multiphase-jump-progress
---

# Render completed route jumps

## Problem

Completed and failed jump cards still describe jumps as a single direct leg.
That no longer matches the backend route jump contract. A submitted jump may
finish after several route phases, may fail after partial progress, or may leave
a useful history of which legs completed before the terminal outcome.

If the completed card keeps reading the old single-leg fields, players will not
be able to understand what actually happened. A fulfilled multi-hop route could
look like a direct jump to the final target, and a failed route could hide how
far the ship progressed before stopping. The astrometric view also needs to show
the traveled route rather than a single line to the destination.

## Proposed solution

Update completed and failed jump rendering to use the same route-plus-phases
model as active route jumps. The UI should resolve `params.route` through known
navigation edges, align those edges with `result.phases` by index, and summarize
the terminal outcome from the completed phase data.

Fulfilled jump cards should show the planned route, all completed legs, the
final destination, total traveled route distance, elapsed or per-leg timing when
available, and final ship or core state reported by the backend. Failed or
partial jump cards should preserve the route context, show completed legs, show
where the ship stopped when that can be inferred, and surface the backend error
or failure reason without implying that skipped legs were traveled.

Completed astrometric overlays should render the route path that was actually
traveled. For fulfilled jumps that should be the full route. For failed or
partial jumps it should distinguish completed legs from untraveled planned legs
when both are available.

## Requirements

-   Completed jump cards read `params.route` and `result.phases` instead of the
    old single-leg jump result fields.
-   Fulfilled jump cards summarize all completed route phases and final ship or
    core state.
-   Fulfilled jump cards show total traveled distance as the sum of completed
    route legs.
-   Failed or partial jump cards keep route context visible and show partial
    progress when phases exist.
-   Failed or partial jump cards do not present uncompleted planned legs as
    traveled legs.
-   The UI aligns route edges and phases by array index and handles missing edge
    details gracefully.
-   Completed astrometric overlays render traveled route paths rather than a
    single direct line.
-   Stale local action rows with the old jump shape are cleared or replaced
    before validating the completed-card behavior locally.
-   Tests cover fulfilled one-leg jumps, fulfilled multi-leg jumps, failed route
    jumps, partial route progress, missing edge details, and completed route
    overlay rendering.
