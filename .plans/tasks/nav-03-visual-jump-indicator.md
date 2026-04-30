---
status: ready
area: navigation
priority: p2
depends_on:
  - nav-02-wire-jump-trigger
  - nav-06-persist-scan-discoveries
---

# Visual Jump Indicator on Starfield

## Description

Once jump is wired up, players can jump directly to any star that shares one
known edge with their current node, but there is no way to see those direct
jump targets without right-clicking each star and reading the context menu.
The starfield renders every known star identically regardless of direct route
status.

This task adds a visual treatment to the starfield that marks stars
directly adjacent to the player's current node through a discovered user edge.
The player can scan the map visually and immediately see "I can jump to these
systems now." This is navigational feedback the game is missing today.

The indicator is colored to match the jump card's `sky` LCARS tone so that
visual identity flows from map to context menu to draft card to active
countdown to completion as a single color-coded story. Right-clicking a
sky-ringed star and choosing Jump should feel obviously connected.

Known path reachability is related but distinct. A target may be reachable
through multiple known edges without being directly jumpable in one leg. That
indirect state belongs to the jump draft and route-planning work in
`nav-14-route-aware-jump-draft`, not to this ring. This task marks one-edge
jumpability only.

## Plan

Starfield already supports set-based visual classifications. It accepts
`reachableNodeIds` and `visitedNodeIds` as `Set<number>` props and the
codebase includes an overlay component for per-star decoration. This task
follows the same pattern: a new `jumpableNodeIds` set computed by the
bridge, consumed by the starfield, and rendered as a subtle billboarded
ring around qualifying stars.

The ring approach (rather than recoloring the star body) is deliberate.
Star color already encodes spectral class (O/B/A/F/G/K/M) and must not be
overloaded. A thin concentric ring adds state without lying about the star
itself.

The set of jumpable stars must come from the canonical discovered edge graph in
datacore. Every known user edge that touches the current node contributes its
other endpoint to the set. Do not derive this set from the latest scan action
result.

## Requirements

- Stars directly adjacent to the player's current node through one known user
  edge must wear a distinct ring or halo on the starfield.
- Stars reachable only through an indirect known path must not receive this
  direct-jump ring.
- The indicator color must match the jump card's `sky` tone exactly; the
  hex value must come from a single source of truth so the LCARS CSS
  variable and the Three.js material cannot drift.
- The indicator must not overwrite or visually compete with the star's
  spectral color.
- The indicator must not hide or conflict with the existing selection
  highlight and the current-location marker. If a jumpable star is also
  selected, both treatments must remain legible.
- The indicator state must update reactively as scan results arrive, so a
  star becoming jumpable mid-session (after a scan completes) should gain
  the ring without a manual refresh.
- The current node itself must not receive the jumpable indicator.
- No change to the jump action's server or REST behavior.
