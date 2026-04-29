---
status: done
area: navigation
priority: p1
depends_on:
  - nav-01-hide-current-star-actions
---

# Wire Jump Trigger in Bridge UI

## Description

The jump ship action is fully implemented on the server — validator, handler,
resolver, REST endpoints, background processing, heartbeat updates, and WPUnit
coverage all exist. The client-side draft/active/complete cards are built and
the `JumpActionFill` is already mounted in the router. The only gap is that
players have no way to initiate a jump: the `Jump` item in the star context
menu is a disabled placeholder.

This task closes that gap. Once it ships, a player who has scanned a route
can right-click a destination, choose **Jump**, confirm the draft, and watch
the ship move. This is the first truly autonomous locomotion the player has —
scan alone only reveals the map; jump is what makes the map meaningful.

## Plan

Extend the star context menu so its existing **Jump** entry becomes a live
action. The bridge route already knows the player's current node, the
selected star, the distance, and (via the latest scan action's result) which
edges have been discovered. From that, it can answer: "is this star reachable
by a known route from where I am?" That boolean drives whether the Jump item
is enabled.

When enabled and clicked, the menu dispatches the same kind of draft-create
flow that scan uses, passing `type: 'jump'`. All downstream machinery
(draft card, submit, active countdown, completion) is already wired up and
will pick up the draft automatically.

When disabled, the menu surfaces a short, human-readable reason so the player
understands why — `route unknown`, `already here`, or similar — rather than
the current always-on `route unknown` placeholder.

## Requirements

- Jump menu item must be **enabled** only when a discovered route exists from
  the current node to the selected star.
- Jump menu item must be **disabled** when the selected star is the current
  node, or when no discovered route exists.
- Disabled state must communicate *why* via the menu item's `detail` text.
- An active action (scan or jump) in `pending` or `running` status must
  continue to suppress new draft creation, matching current scan behavior.
- Clicking Jump must draft an action with the same params shape the server
  handler already expects: `target_node_id`, `source_node_id`, `distance_ly`.
- No server, REST, contract, or card-component changes. This is purely a
  UI-wiring task in the bridge package.
- The existing scan wiring must not regress.
