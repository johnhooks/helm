---
status: draft
area: simulation
priority: p2
---

# Add a ship event ledger

## Problem

Ship actions record player intent and action lifecycle, but they are not a good source of truth for long-term ship history or aggregate stats. Action params and results are shaped for the UI and for resolver bookkeeping. They are often JSON-like, can change as action contracts evolve, and are awkward to query for totals such as distance traveled, completed jump legs, or core spent over time.

Ship state is also not the right place for history. It should describe the current state of the ship, such as its current node and active action. Incrementing counters directly on mutable state can answer simple totals, but it does not preserve the underlying facts behind those totals and makes later analytics, achievements, progression, and audits harder to build.

Helm needs a separate way to record meaningful ship state changes as historical facts without making action rows or mutable ship state carry that responsibility.

## Proposed solution

Add an append-only ship event ledger for significant ship state changes. The ledger should record what happened, which ship and owner it happened to, when it happened, and which action caused it when applicable. It should support typed event names such as `jump_leg_completed` and enough structured numeric fields to make common aggregates queryable without parsing action JSON.

Jump resolution should eventually emit ledger events when a leg completes. A jump leg event should be able to record the route edge traveled, distance in light years, core cost, starting node, ending node, and action id. The navigation graph remains the source of truth for route geometry, but event rows may store the numeric facts needed for analytics at the time the event is emitted.

The ledger should be designed as a general ship-history primitive, not as a jump-only table. Future actions should be able to emit events for scans, mining, combat, repairs, purchases, discoveries, and progression milestones. Ship state should continue to hold current state only, and ship actions should continue to hold action intent and lifecycle details.

## Requirements

-   Add a persistent append-only ledger for ship events.
-   Each event must include ship id, owner id, event type, occurred time, and optional action id.
-   Events must support queryable numeric facts for analytics, including distance traveled and core spent.
-   Events may include structured metadata for context that is not needed for common aggregate queries.
-   Jump leg completion should be the first event producer or the motivating fixture for the design.
-   A jump leg event should be able to record route edge id, from node id, to node id, distance in light years, core cost, and remaining core life.
-   The ledger must not replace current ship state updates or action lifecycle records.
-   Tests must cover appending events, querying events for a ship, preserving action links, and aggregating jump distance without reading action result JSON.
