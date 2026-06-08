---
status: ready
area: dev
priority: p1
depends_on:
    - broadcast-03-poll-events-with-heartbeat
---

# Handle stale broadcast cursors

## Problem

Broadcast events are a delivery buffer, not permanent gameplay history. Old rows may be pruned, local browser cursors may survive across long absences or development resets, and a sleeping tab may ask for events after a cursor that is older than the retained channel history. If Heartbeat treats that cursor as normal, the client can miss changes and continue with stale local state.

The frontend needs an explicit way to know when incremental replay is no longer safe and a canonical REST reload is required.

## Proposed solution

Teach the broadcast Heartbeat response to distinguish normal incremental delivery from stale cursor recovery. For the initial ship-scoped implementation, the server should evaluate the requested cursor against the retained `private-ship.{shipId}` stream. If the cursor is before the oldest retained event for that channel, Heartbeat should return a reload-required response instead of pretending the incremental stream is complete.

The client should respond by reloading canonical state through REST, including the current ship, operational ship state, recent ship actions, and any view-specific resources that cannot be reconstructed from broadcasts. Only after the reload succeeds should the client accept the server-provided broadcast cursor.

A first-time or uninitialized cursor should be handled as initialization, not as a request to replay all retained events. The current implementation already returns the current channel tail cursor with no events for nonnumeric cursors so the client can begin live incremental delivery after its initial REST load.

The remaining work is stale cursor recovery after event retention is introduced. Add repository support for the oldest retained cursor per channel, define the Heartbeat response state for reload-required, and teach the live client to reload canonical REST state before accepting the server-provided cursor.

The response contract should make these states explicit enough for the browser to handle them without guessing from an empty event list.
