---
status: draft
area: navigation
priority: p2
depends_on:
    - nav-07-show-routes-toggle
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
targets. Context menu actions, selection events, and jump cards all assume a
selected target has star metadata such as a title and spectral class.

This means waypoint travel is mechanically possible but not reachable through
the map UI. If waypoint markers are added without updating selection and action
presentation, the UI can also break when it tries to display a star title for
an empty waypoint.

## Proposed solution

Render known waypoint nodes on the starfield as a distinct marker layer sourced
from the same discovered-edge graph used by the route overlay. Waypoints should
appear only when the player knows them through discovered edges. They should not
be mixed into the star instance list or given fake star metadata.

Waypoint markers should be selectable map targets. Selecting a waypoint should
open the same navigation context menu surface as a star, but with waypoint-aware
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
-   Waypoints must be sourced from authorized datacore node records, not from
    transient scan action payloads.
-   Waypoint visibility must follow discovered edge knowledge. Unknown waypoints
    must not appear.
-   Selecting a waypoint must produce a node-target selection, not a fake
    `StarNode`.
-   The context menu must support waypoint targets with waypoint-specific labels.
-   Jump must be available for a waypoint when a direct known edge connects it to
    the current node and no action is already active.
-   Jump draft, active, and completed cards must display waypoint targets without
    calling star-only selectors that expect a title.
-   Scan Route should not be offered for waypoint targets in this task.
-   Existing star selection, star labels, and star context actions must continue
    to behave as they do today.
-   No backend jump contract changes.
