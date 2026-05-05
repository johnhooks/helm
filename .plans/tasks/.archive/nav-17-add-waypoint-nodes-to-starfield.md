---
status: done
area: navigation
priority: p2
depends_on:
    - nav-07-show-routes-toggle
    - nav-19-add-navigation-edge-states
---

# Add waypoint nodes to the starfield

## Problem

Known route edges can now draw through waypoint coordinates, but the waypoint
nodes themselves remain invisible. A player can see a line bend through empty
space without seeing the navigation point that makes the corridor meaningful.
That makes the chart harder to read and hides an important part of the
navigation model.

Waypoints are first-class graph nodes. The design allows ships to jump to a
known waypoint when a discovered edge connects the current node to that
waypoint. The backend jump validation is node-based and does not require the
target to be a star. The frontend, however, only renders stars as selectable
targets. Astrometric menu actions, selection events, and jump cards all assume a
selected target has star metadata such as a title and spectral class.

This means waypoint travel is mechanically possible but not reachable through
the map UI. If waypoint markers are added without updating selection and action
presentation, the UI can also break when it tries to display a star title for
an empty waypoint.

## Proposed solution

Render known waypoint nodes through the same high-performance instanced node
renderer that draws stars, sourced from the same discovered-edge graph used by
the route overlay. Waypoints should appear only when the player knows them
through discovered edges. They should not be given fake star metadata, but they
should share the star renderer's interaction and selection pipeline.

The renderer should use one component for map node instances and keep separate
internal instanced meshes for stars and waypoints. Stars keep the existing
sphere geometry, spectral coloring, radius scaling, labels, and selection ring
behavior. Waypoints use their own small, fixed-size, non-spectral instanced
geometry and color. This keeps waypoint rendering cheap and avoids a separate
always-mounted Drei `Billboard`/`Html` marker layer.

Waypoint markers should be selectable map targets. Selecting a waypoint should
open the same `AstrometricMenu` surface as a star, but with waypoint-aware
copy and action data. A direct known edge from the current node to the waypoint
should enable Jump. Scan Route should remain star-targeted unless a separate
task defines scanning from or toward waypoints in the bridge UI.

The action and log presentation must handle waypoint targets without requiring
a star title. A waypoint target can use a stable fallback label such as
`Waypoint #123` until the game has a naming or discovery-label system.

Requirements:

-   Render waypoint nodes referenced by known user edges as visible markers in
    the starfield.
-   Waypoint markers must use a visual treatment distinct from stars and should
    not reuse spectral color.
-   Waypoints must render inside the same node-instance renderer as stars, using
    a separate internal instanced mesh rather than a separate marker component.
-   Waypoint rendering must not add always-mounted Drei `Billboard` or `Html`
    elements per waypoint.
-   Waypoints must be sourced from authorized datacore node records, not from
    transient scan action payloads.
-   Waypoint visibility must follow discovered edge knowledge. Unknown waypoints
    must not appear.
-   Selecting a waypoint must produce a node-target selection, not a fake
    `StarNode`.
-   `AstrometricMenu` must support waypoint targets with waypoint-specific labels.
-   Jump must be available for a waypoint when a direct known edge connects it to
    the current node and no action is already active.
-   Jump draft, active, and completed cards must display waypoint targets without
    calling star-only selectors that expect a title.
-   Scan Route should not be offered for waypoint targets in this task.
-   Existing star selection, star labels, and star context actions must continue
    to behave as they do today.
-   No backend jump contract changes.

## Implementation plan

Keep the implementation centered on node targets. Stars are one kind of node
target with catalog metadata. Waypoints are another kind of node target with
only graph geometry and a generated label. The bridge and shell should be able
to ask for target identity, position, label, and node id without pretending
that every selectable thing is a star.

Extend the astrometric type surface with a small map-node or node-target shape
that can represent both catalog-backed stars and discovered waypoint nodes from
`NavNode` records. The starfield should pass stars and waypoints into one
instanced node renderer. Selection events should distinguish star targets from
waypoint targets, but rendering and pointer handling should be centralized so
both target kinds share the same raycast, hover, label, and selection flow.

Derive visible waypoints in the bridge from the same known graph data used by
`useNavigationEdges()`. A waypoint is visible when its node id appears in at
least one known user edge and the corresponding node record has
`type: waypoint`. Star nodes referenced by edges should continue to render only
through the existing star list. Waypoint markers should follow the existing
Show routes preference because they are part of the discovered route chart.
The first implementation should tie them to the discovered graph, not to scan
result payloads.

Replace the star-only instance renderer with `NodeInstances`, a unified
map-node instance renderer. Since waypoints now use the same clean sphere
geometry as stars, stars and waypoints should share one `instancedMesh`.
Waypoints should remain visually distinct through a fixed non-spectral color,
fixed scale, and selected waypoint overlay treatment rather than by pretending
to be stars or by adding a separate marker component. The component should own
hover detection, selection, and labels for both kinds.

Waypoint scale should be fixed or lightly derived from viewport settings, not
from stellar radius. Route lines already resolve endpoint coordinates through
`nodePositions`, so the unified node renderer should use the same waypoint
coordinates or an equivalent derived lookup instead of creating a second source
of truth.

Keep labels cheap. Existing star labels should behave as they do today.
Waypoint labels may appear for hovered or selected waypoints, and may follow the
existing Show labels preference if implemented without causing continuous
renders. Avoid always-mounted DOM labels for every waypoint unless they are
proven not to break demand rendering.

Generalize the bridge selection state from `StarSelectEvent` to a node target
selection. The selected target should carry `nodeId`, `position`, `kind`,
`label`, and the canvas screen position. Star selections can adapt the existing
`StarNode` data into that shape. Waypoint selections can adapt the known
`NavNode` record and use a stable fallback label such as `Waypoint #123`.
The selected overlay anchor must use the selected target position, not only a
selected star lookup.

Replace the star-specific bridge menu with `AstrometricMenu`, because the
context is the astrometric viewport rather than the selected star. Generalize
the menu props in bridge and shell from star-only props to astrometric target
props. The menu title should use the target label. Star targets can keep
spectral class as the subtitle. Waypoint targets should use a waypoint subtitle
or no subtitle, but must not require star metadata.

Keep `JumpAstrometricAction` node-based. It should check direct adjacency
between `currentNodeId` and `target.nodeId`, draft a jump with
`target_node_id`, `source_node_id`, and `distance_ly`, and use the target label
only for presentation. It should continue to disable itself for the current
node, unknown direct edges, and active actions.
`ScanRouteAstrometricAction` should return null for waypoint targets in this
task, even though the long-term navigation model allows waypoint scanning.

Update jump action card presentation so draft, active, and complete cards can
render a waypoint target without star metadata. The first pass can resolve
target names through a shared target-label helper that looks up a star by node
id when one exists and otherwise formats `Waypoint #123`. Avoid adding route or
waypoint naming systems in this task.

## Acceptance criteria

-   A discovered edge from a star to a waypoint draws both the known route line
    and a visible waypoint marker at the waypoint coordinates.
-   A discovered edge between two waypoints draws visible markers for both
    endpoints when their node records are present in datacore.
-   Unknown waypoints do not render and are not selectable.
-   Waypoint markers follow the Show routes preference with the known route
    chart.
-   Selecting a waypoint opens `AstrometricMenu` with a waypoint
    label and no star spectral subtitle.
-   The waypoint astrometric menu offers Jump only when a direct known edge connects
    the current node to the waypoint and no action is active.
-   The waypoint astrometric menu does not offer Scan Route.
-   Drafting a waypoint jump writes the waypoint node id to
    `target_node_id`.
-   Jump draft, active, and complete cards render waypoint targets without
    crashing or showing an empty star title.
-   Existing star markers, selection rings, labels, context actions, and route
    lines keep their current behavior.
-   The starfield does not add a separate waypoint marker component with
    always-mounted Drei `Billboard` or `Html` elements.
-   Adding one waypoint does not switch the canvas into continuous rendering or
    materially increase idle GPU usage.
-   Package dependencies still flow through astrometric and shell presentation
    code without making `@helm/nav` depend on `@helm/actions`.

## Test notes

Add astrometric coverage for unified node renderer inputs, waypoint instance
selection events, selected waypoint overlay anchoring, and unchanged star
selection behavior. Add a regression test or lightweight render check that
waypoints do not mount per-waypoint `Billboard`/`Html` marker elements. Add
bridge coverage for deriving waypoint targets from known edge nodes, hiding
unknown waypoints, and rendering `AstrometricMenu` for waypoints. Add shell coverage
for Jump and Scan Route astrometric actions with star and waypoint targets,
including active-action disablement. Add jump card coverage for waypoint labels
on draft, active, and complete states.
