---
status: draft
area: navigation
priority: p2
depends_on:
    - nav-07-show-routes-toggle
---

# Show active scan lines on the starfield

## Problem

The starfield can now show discovered routes from the persisted user-edge
graph, but it still gives no spatial feedback for a scan that is currently in
progress. When a player starts a route scan, the action log shows the countdown,
but the map itself does not show which two points are being scanned between.

That absence makes active scanning feel disconnected from the viewport. It is
also easy to confuse known route lines with scan work, because a running scan
does not have an edge yet. The client only knows the source node and target
node from the scan action params until the scan resolves and writes discovered
edges into datacore.

The active scan visualization therefore needs to be separate from the known
route graph. It should communicate "the ship is scanning this corridor now"
without pretending that the route has already been discovered.

## Proposed solution

Draw a temporary animated scan line on the starfield while a `scan_route`
action is pending or running. The line connects the action's
`source_node_id` and `target_node_id` using node positions, not an edge id.
It should render even when the "Show routes" toggle is off, because it is an
active operation indicator rather than part of the discovered route overlay.

The active scan line should use the scan card's `lilac` tone, be partially
transparent, and have a subtle throbbing or pulsing animation so it reads as
work in progress. If motion reduction is requested, the same line should render
as a static highlighted scan line.

When the scan leaves pending or running state, the active scan line should
disappear. If the scan discovers routes, those routes should then appear through
the datacore-backed known-route layer when "Show routes" is enabled.

Requirements:

-   Pending and running `scan_route` actions draw a temporary line between their
    source and target nodes.
-   The line must be based on node positions and must not require or invent an
    edge record.
-   The target star position should come from the star map when available. The
    source position may need to come from datacore when the ship is at a waypoint.
-   The active scan line renders independently of the "Show routes" toggle.
-   The line uses the LCARS `lilac` tone and an opacity profile distinct from
    discovered route lines.
-   The line has a subtle throbbing or pulsing animation during normal motion
    settings and a static fallback when reduced motion is requested.
-   Completed, partial, fulfilled, and failed scan actions must not keep showing
    the active scan line.
-   The active scan line must not be clickable and must not introduce route hover
    or selection affordances.
-   No server or scan action contract changes.
