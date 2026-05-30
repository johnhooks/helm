---
status: draft
area: navigation
priority: p2
depends_on:
    - nav-14-route-aware-jump-draft
    - nav-22-wire-route-aware-jump-ui
---

# Render multiphase jump progress

## Problem

Route-aware jumps now resolve across one or more backend phases, but the jump
cards still expect the old single-leg action shape. Active and completed jump
cards read fields such as `params.distance_ly`, `result.duration`, and
`result.core_cost`, while the server now stores the planned route in
`params.route` and appends completed leg outcomes under `result.phases`.

That means the UI cannot accurately show a multi-leg jump once it has been
submitted. It cannot tell the player which legs are complete, which leg is
waiting or running, how much route remains, or how the final result relates to
the submitted route. A long jump would look like one direct jump at best and
would render stale or missing values at worst.

## Proposed solution

Update jump action rendering to consume the multiphase jump contract produced
by the server. Before implementation, read
`src/Helm/ShipLink/Actions/Jump/Resolver.php` and the action lifecycle in
`src/Helm/ShipLink/ActionResolver.php`. The UI should treat `params.route` as
the ordered route input and `result.phases` as the ordered list of completed
leg outcomes. Route edge details should come from the navigation store, not
from client-supplied action result fields.

Active jump cards should show the submitted route, completed legs, current or
next leg, remaining route context, and the current `deferred_until` countdown.
The display should distinguish the original planned route from the current
phase wait, because later legs are scheduled only after earlier legs complete.

Completed and failed jump cards should summarize the route outcome using the
same route-plus-phases model. A fulfilled jump should show all completed legs
and final core state. A failed jump should preserve the route context and show
how far the ship progressed before the failure when that information is
available.

Astrometric overlays should also understand multiphase jump state. Draft and
active overlays should render the plotted route rather than a single direct
line to the final target. Completed overlays should be able to highlight the
traveled route legs by resolving `params.route` through known user edges.

## Requirements

-   Active jump cards read `params.route` and `result.phases` instead of the
    old single-leg jump result fields.
-   The UI aligns route edges and phases by array index.
-   The active card identifies completed legs, the current or next leg, and the
    final destination.
-   Remaining time is based on the current action `deferred_until`, not a
    whole-route duration field.
-   The UI distinguishes the initial planned route from current phase progress.
-   Completed jump cards summarize all completed route phases and final core
    state.
-   Failed jump cards keep route context visible and show partial progress when
    phases exist.
-   Astrometric overlays render route-aware jump drafts, active jumps, and
    completed jumps as route paths rather than single direct lines.
-   Tests cover active one-leg jumps, active multi-leg jumps, fulfilled
    multi-leg jumps, failed or partial route progress, and route overlay
    rendering.
