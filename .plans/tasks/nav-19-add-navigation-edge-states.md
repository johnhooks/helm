---
status: active
area: navigation
priority: p1
depends_on:
    - nav-07-show-routes-toggle
---

# Add navigation edge states

## Problem

The bridge currently builds starfield line data directly inside the page
component. That was enough when the map only needed to show known user edges
and the latest scan result, but the next navigation states will add several
temporary edge states with different lifetimes.

A scan draft should preview the intended corridor before it is submitted. An
active scan should show the in-progress scan line even when discovered edges
are hidden. A completed scan may briefly highlight the newly discovered edges,
but that highlight should disappear when the player starts another action.
Jump drafts, active jumps, and completed jumps need similar navigation state,
with their own rules for whether the edge describes intent, an operation in
progress, or a recent movement.

These are not all routes. Some are persisted graph edges. Some are action
previews. Some are transient action status facts. Treating them all as route
data in `BridgePage` makes the lifetime rules hard to test and easy to break
as more states are added.

The map also needs to stay inexpensive to render as the known graph grows. A
player with a hundred known edges plus several draft, active, and result edge
states should not cause repeated ad hoc array walks, unstable object
identity, or unnecessary canvas churn on every bridge render.

## Proposed solution

Introduce a nav-store navigation edge state model that describes which
node-to-node edges or intents matter to navigation right now and why. Use
`NavigationEdgeType` as the discriminant so the code can distinguish known
graph edges, scan draft intent, scan progress, scan result state, jump draft
intent, jump progress, and jump result state without overloading route
language.

The derivation should live in the nav datastore rather than inside
`BridgePage`. Nav already owns the known user-edge graph and can use registry
selectors to read draft and ship action state from the actions store. The
selector should return semantic navigation edge data and the node ids needed to
locate those edges. `BridgePage` should remain the integration point that
adapts navigation edge states into astrometric presentation props.

Navigation edge lifetime rules should be explicit:

-   Known user edges are persistent graph state. They may remain available from
    selectors even when the UI has hidden known edge rendering.
-   Draft scan and draft jump edge states exist only while the matching draft
    exists.
-   Active scan and active jump edge states exist while the matching action is
    pending or running, and the UI should be able to render them independently
    of `Show routes`.
-   Scan result edge states identify the latest fulfilled or partial scan result
    only until a newer draft or action appears.
-   Jump result edge states may identify the latest fulfilled jump as recent
    traveled movement, but the replacement rule must be explicit.
-   Failed scan and jump actions may identify the last failed edge attempt so
    the UI can show what failed. That failure state should be temporary and
    replaced by a newer draft or action.

The model should preserve authority boundaries. Known user edges come from the
nav datacore. Draft and active edge states can use action params and active
action results because they are operation indicators, not canonical graph
records.
Completed scan result edge states should prefer discovered edge ids and
canonical user-edge graph data when available. They should fall back only where
a separate task explicitly keeps transitional scan result payloads.

Performance should be good enough for the near-term graph size without adding
custom caching machinery. The implementation should lean on selector
composition and `@wordpress/data` caching. Smaller selectors should expose
stable pieces of state, and the navigation edge selector should compose those
pieces so repeated reads reuse cached results when inputs have not changed. The
derivation should still be linear in the number of known edges and relevant
actions, avoid nested scans over the full graph for each edge state, and
generate stable ids. Position lookup should stay outside the nav selector, but
the selector should return the node ids it needs so bridge can avoid fetching
or merging unrelated node data.

Requirements:

-   Add a `NavigationEdgeType` union.
-   Add a `NavigationEdge` shape that records source node id, target node id,
    edge state type, optional canonical edge id, optional source action id,
    optional action status, and whether the source is graph, draft, or action
    data.
-   Add nav selectors that derive navigation edge states from known user edges,
    current drafts, relevant ship actions, and current node id.
-   Use registry selectors for action and draft state rather than making the
    bridge component assemble cross-store state by hand.
-   Keep known user-edge states separate from draft, active, and result states.
-   Active scan and active jump states must be identifiable independently from
    any UI preference that hides known edge rendering.
-   Temporary scan result states must be dismissed when a newer draft or action
    appears.
-   Draft scan and draft jump states must disappear when the draft is cleared or
    submitted.
-   Jump result retention must be captured as an explicit rule, even if the
    first implementation keeps only the latest fulfilled jump.
-   Failed scan and failed jump states must identify the attempted edge for the
    latest failed action until a newer draft or action appears.
-   Avoid treating scan action result edge payloads as canonical graph data.
-   Use selector composition and `@wordpress/data` caching rather than custom
    cache layers.
-   Derivation should be O(edges + relevant actions) for normal bridge inputs.
-   Navigation edge ids must be stable so selector and UI adapters can avoid
    unnecessary churn.
-   Tests must cover known edges, draft states, active states, scan result
    dismissal, jump result retention, UI-independent derivation, and mixed sets
    of at least one hundred known edges.
