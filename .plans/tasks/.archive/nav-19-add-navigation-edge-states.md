---
status: done
area: navigation
priority: p1
depends_on:
    - nav-07-show-routes-toggle
---

# Add astrometric navigation edge state

## Problem

The bridge currently builds starfield line data directly inside the page
component. That was enough when the map only needed to show known user edges
and the latest scan result, but the next navigation states will add several
temporary edge states with different lifetimes.

A scan draft should preview the intended corridor before it is submitted. An
active scan should show the in-progress scan line even when discovered edges
are hidden. A completed scan may briefly highlight newly discovered edges, but
that highlight should disappear when the player starts another action. Jump
drafts, active jumps, completed jumps, and failed attempts need similar
navigation state with explicit lifetime rules.

These states combine two different canonical stores. Nav owns the persisted
user-edge graph and node data. Actions owns drafts, active actions, completed
actions, and failed actions. Putting action-aware selectors in the nav store
would make nav depend on actions, while actions already needs nav behavior to
reconcile discovered scan edges. That creates a runtime package cycle and a
WordPress script dependency cycle between `helm-nav` and `helm-actions`.

The map needs a read model that can combine nav and action data without
polluting either canonical store. It also needs to stay inexpensive to render
as the known graph grows. A player with a hundred known edges plus draft,
active, result, and failure edge states should not cause repeated ad hoc array
walks, unstable object identity, or unnecessary canvas churn on every bridge
render.

## Proposed solution

Introduce an astrometric navigation edge read model in the astrometric
package. The astrometric package may depend on both nav and actions because it
owns starfield presentation state. Nav must remain focused on canonical graph
state, and actions must remain focused on action lifecycle state.

Use the existing astrometric `Route` shape for canonical known route data, and
add a separate `RouteOverlay` shape for temporary scan and jump presentation
state. `RouteOverlay` extends `Route`, adds `type: scan | jump`, and may link
back to the displaced canonical route through `canonicalRouteId` and
`canonicalEdgeId`.

Known user edges should come from the nav datacore selectors. Draft, active,
result, and failed edge states may use action params and action results
because they are presentation facts, not canonical graph records.

Bridge should consume the astrometric read model and adapt it into starfield
presentation props. Known graph edges may still be hidden by the `Show routes`
preference, but draft, active, result, and failure states must remain
identifiable independently from that UI preference.

Navigation edge lifetime rules should be explicit:

-   Known user edges are persistent graph state.
-   Draft scan and draft jump edge states exist only while the matching draft
    exists.
-   Active scan and active jump edge states exist while the matching action is
    pending or running.
-   Scan result edge states identify the latest fulfilled or partial scan
    result only until a newer draft or action appears.
-   Jump result edge states identify the latest fulfilled jump as recent
    movement until a newer draft or action appears.
-   Failed scan and failed jump states identify the attempted edge for the
    latest failed action until a newer draft or action appears.

Use `@wordpress/data` selectors for canonical state and keep custom caching
out of this task. Derivation should be linear in the number of known edges and
the latest relevant action state for normal bridge inputs.

## Implemented

Added `useNavigationEdges()` in `@helm/astrometric`. The hook reads
`@helm/nav` user edges plus the current action draft and latest action from
`@helm/actions`, then returns `RouteState` with canonical `routes`, transient
`overlays`, and supplemental `nodes` for scan result positioning.

The implementation keeps canonical user edges as plain `Route` objects and
maps temporary state into `RouteOverlay` objects:

-   Known graph edges are canonical routes with `status: discovered`.
-   Draft scan and jump previews are overlays with `type: scan | jump` and
    `status: plotted`.
-   Pending or running scan and jump actions are overlays with
    `status: plotted`.
-   Fulfilled scan result edges are overlays with `type: scan` and
    `status: plotted`.
-   Fulfilled jump movement is an overlay with `type: jump` and
    `status: traveled`.
-   Failed scan and jump attempts are overlays with `status: blocked`.

Bridge now consumes `useNavigationEdges()` and passes canonical `routes` plus
`routeOverlays` to `StarField` separately. Bridge still hides canonical routes
when the `Show routes` preference is disabled, but overlays remain visible.
`StarField` applies overlay precedence while rendering: linked overlays
displace their canonical route by `canonicalRouteId`, so temporary scan and
jump state can take visual precedence without mutating the canonical route
list.

`@helm/actions` now allows `getLatestAction()` and `getDraft()` to filter by a
single action type or an array of action types. The filtering helper lives in
the actions store utilities.

The implementation must preserve package and script dependency boundaries:

-   `@helm/nav` must not import `@helm/actions`.
-   `@helm/actions` must not create a `helm-actions` to `helm-nav` script cycle
    with the astrometric read model.
-   Generated WordPress asset dependencies must not contain a `helm-nav` and
    `helm-actions` cycle.

Tests must cover known edges, draft states, active states, scan result
dismissal, jump result retention, failed states, UI-independent derivation,
and mixed sets with at least one hundred known edges. Package boundaries must
continue to avoid a nav to actions script dependency cycle.
