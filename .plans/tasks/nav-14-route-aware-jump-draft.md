---
status: draft
area: navigation
priority: p2
depends_on:
  - nav-12-add-node-adjacency-path-selectors
---

# Add route-aware jump drafts

## Problem

The client can now distinguish a direct known edge from an indirect known path,
but the jump UI still treats "route known" as a simple yes or no. That is too
small for the navigation model. A selected star may be reachable through
multiple discovered edges, and the player needs to understand that known route
before committing to movement.

Route planning should not become a separate player-facing concept from
jumping. In Helm, planning a route is the pre-jump phase while the jump action
is still a draft. Splitting that into a separate action such as "Plot Course"
would add ceremony without matching the action model. The player intent is
still "jump there." The draft needs to show whether that jump is one direct leg
or a longer known route.

## Proposed solution

Make the `jump` draft route-aware. The star context action should be able to
open a jump draft for a selected target when the target is reachable through
the known edge graph. Direct targets remain a simple one-edge jump. Indirect
targets enter the same jump draft flow, but the draft card presents the known
path as a route plan before submission.

The draft should use `findKnownPath` as its source of truth. It should show the
ordered route, total known distance, hop count, and next node when the selected
target is reachable indirectly. It should not describe an indirect route as a
single immediate jump. If the server still only supports one-edge jump actions
when this task lands, the draft should make that limitation explicit and submit
only the next direct leg. Full multi-hop route following can land later without
changing the player-facing concept.

Scan eligibility remains separate. A target can be reachable through an
indirect known path and still be scannable if there is no direct edge from the
current node to that target.

## Requirements

- The context menu should treat `Jump` as the route-planning entry point for
  both direct and indirectly reachable targets.
- Direct jumps should continue to use direct adjacency through one known user
  edge.
- Indirect known paths should draft a jump route plan rather than introducing a
  separate `Plot Course` action.
- The draft UI must display total known route distance, hop count, and next
  node for indirect paths.
- The draft UI must distinguish a direct one-edge jump from an indirect known
  route.
- If submit only starts the next leg, the draft must make that behavior clear.
- Scan Route visibility must continue to use direct adjacency, not known-path
  reachability.
- Tests must cover direct jump drafts, indirect route-plan drafts, unreachable
  targets, and the interaction between indirect reachability and scan
  eligibility.
