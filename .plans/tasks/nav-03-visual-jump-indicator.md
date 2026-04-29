---
status: blocked
area: navigation
priority: p2
depends_on:
  - nav-02-wire-jump-trigger
  - nav-06-persist-scan-discoveries
blocked_by: nav-06 must provide a stable datacore route graph for jumpable targets.
---

# Visual Jump Indicator on Starfield

## Description

Once jump is wired up (see task 01), players can jump to any star they have
a discovered route to — but there is no way to see which stars those are
without right-clicking each one and reading the context menu. The starfield
renders every known star identically regardless of route status.

This task adds a visual treatment to the starfield that marks stars
reachable by a discovered route from the player's current node. The player
can scan the map visually and immediately see "I have paths to these
systems." This is navigational feedback the game is missing today.

The indicator is colored to match the jump card's `sky` LCARS tone so that
visual identity flows from map → context menu → draft card → active
countdown → completion as a single color-coded story. Right-clicking a
sky-ringed star and choosing Jump should feel obviously connected.

## Plan

Starfield already supports set-based visual classifications — it accepts
`reachableNodeIds` and `visitedNodeIds` as `Set<number>` props and the
codebase includes an overlay component for per-star decoration. This task
follows the same pattern: a new `jumpableNodeIds` set computed by the
bridge, consumed by the starfield, and rendered as a subtle billboarded
ring around qualifying stars.

The ring approach (rather than recoloring the star body) is deliberate —
star color already encodes spectral class (O/B/A/F/G/K/M) and must not be
overloaded. A thin concentric ring adds state without lying about the star
itself.

The set of jumpable stars is derived from the same scan result the bridge
is already reading to render route lines. Every edge on the current action's
result that touches the current node contributes its other endpoint to the
set.

## Requirements

- Stars reachable by a discovered route from the player's current node must
  wear a distinct ring or halo on the starfield.
- The indicator color must match the jump card's `sky` tone exactly; the
  hex value must come from a single source of truth so the LCARS CSS
  variable and the Three.js material cannot drift.
- The indicator must not overwrite or visually compete with the star's
  spectral color.
- The indicator must not hide or conflict with the existing selection
  highlight and the current-location marker. If a jumpable star is also
  selected, both treatments must remain legible.
- The indicator state must update reactively as scan results arrive — a
  star becoming jumpable mid-session (after a scan completes) should gain
  the ring without a manual refresh.
- The current node itself must not receive the jumpable indicator.
- No change to the jump action's server or REST behavior.
