---
status: blocked
area: navigation
priority: p2
depends_on:
  - nav-06-persist-scan-discoveries
blocked_by: nav-06 must make discovered edges available from datacore.
---

# Add a "Show routes" toggle to the viewport

## Problem

The starfield renders stars but never draws the edges that connect them.
A player who has spent hours scanning routes has no way to look at the map
and see the shape of the network they've uncovered. The only way to tell
whether two systems are linked is to right-click one of them, and even that
only answers the narrow question "is there a known route from my current
node to this target?" — not the structure of the broader graph.

The context menu hints at the data (Jump enables once a route exists), and
nav-03 will add per-star rings for jumpable targets, but neither surfaces
the edges themselves. The player's mental model of the sector stays stuck
inside the action history.

## Proposed solution

Add a "Show routes" toggle to the viewport config dropdown at
`resources/packages/bridge/src/components/viewport-config.tsx`, alongside
the existing "Jump range" and "Labels" toggles. When enabled, the
starfield draws every known edge from the datacore as a thin line between
its two node endpoints. Lines use the LCARS `sky` tone so the visual
identity flows with the jumpable-star ring from nav-03 and the jump card
family.

- Default state is off. The player opts in.
- Route lines render under the star sprites so stars stay the primary
  visual element.
- Every edge the datacore knows about renders, not only edges touching the
  current node. The toggle shows the graph, not a jump preview.
- Lines are static. No hover affordances, no click targets, no highlight
  on selection in this task.
- Toggle state persists using the same mechanism as the existing viewport
  config values (`starSize`, `jumpRangeOnly`, `showLabels`).

Depends on nav-06. Until edges live in the datacore there is no stable
source for this layer, and this task should read the datacore edge graph
only — no fallback reads from `action.result` on the actions store.
