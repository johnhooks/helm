---
status: draft
area: navigation
priority: p2
depends_on:
    - nav-22-wire-route-aware-jump-ui
---

# Render active route jump progress

## Problem

Route-aware jumps now resolve across one or more backend phases, but the active
jump UI still expects the old single-leg action shape. Active jump cards read
fields such as `params.distance_ly`, `result.duration`, and `result.core_cost`,
while the server now stores the planned route in `params.route` and appends
completed leg outcomes under `result.phases`.

That means the UI cannot accurately show a multi-leg jump while it is in
progress. It cannot tell the player which legs are complete, which leg is
currently waiting, how much route remains, or why the ship has advanced to an
intermediate node before the final destination. A long route jump would look
like one direct jump at best and would render stale or missing values at worst.

Existing local development databases may also contain jump actions written with
the previous params and result shape. Those rows can keep old cards rendering
for now, but they should not be treated as valid fixtures for the new active
route jump UI.

## Proposed solution

Update active jump rendering to consume the multiphase jump contract produced by
the server. The UI should treat `params.route` as the ordered route input and
`result.phases` as the ordered list of completed leg outcomes. Route edge
details should come from the navigation store, not from client-supplied action
result fields.

Represent astrometric route edges with a small semantic model:

-   `type`: `route`, `scan`, or `jump`, matching the route/action family.
-   `state`: route/action lifecycle context such as `idle`, `planned`,
    `active`, `complete`, or `failed`.
-   UI flags such as `selected` and hover remain separate from lifecycle state.

For the current implementation we may still use the narrower field names already
in the code, but the intended model is documented in
`docs/design/starmap-edges.md` and should guide any cleanup. Selected route
segments should keep the whole planned route visually connected. Only the
current active leg should use active animation and active line width. Completed
legs should recede, upcoming legs should remain selected/static, and hover
should brighten opacity without changing selection state.

Active jump cards and astrometric overlays should show the submitted route,
completed legs, the current or next leg, remaining route context, and the current
`deferred_until` countdown. The display should distinguish the original planned
route from the current phase wait, because later legs are scheduled only after
earlier legs complete.

When testing locally, clear or replace old jump action rows that use the
pre-route-aware shape so the UI is verified against the current backend
contract. The application does not need a production migration for that local
scratch data unless we later decide existing persisted actions must be
preserved across the change.

## Requirements

-   Active jump cards read `params.route` and `result.phases` instead of the
    old single-leg jump result fields.
-   The UI aligns route edges and phases by array index.
-   The active card identifies completed legs, the current or next leg, the
    ship's current node, and the final destination.
-   Remaining time is based on the current action `deferred_until`, not a
    whole-route duration field.
-   The UI distinguishes the initial planned route from current phase progress.
-   The UI makes intermediate node progress clear when a multi-leg jump has
    completed some legs but not the whole route.
-   Active astrometric overlays render the plotted route path and highlight
    completed versus pending legs.
-   Local testing uses current-shape route jump actions rather than stale
    pre-route-aware action rows.
-   Tests cover active one-leg jumps, active multi-leg jumps, intermediate node
    progress, route phase alignment, and active route overlay rendering.
