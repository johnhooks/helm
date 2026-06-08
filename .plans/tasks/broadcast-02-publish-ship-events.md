---
status: done
area: dev
priority: p1
depends_on:
    - broadcast-01-add-event-outbox
---

# Publish ship broadcast events

## Problem

Ship action and ship state changes are the updates the bridge most needs, but they are not represented as first-class broadcast events. The current heartbeat path can send action payloads, while ship state refresh depends on ad hoc client invalidation. That split is fragile and is causing frontend synchronization problems as multiphase actions update both action progress and current ship state.

## Proposed solution

Publish broadcast events when ship actions and operational ship state change. Producers should dispatch typed domain event objects through Helm's general event dispatcher instead of hand-assembling channel names, event types, and payload arrays at the call site. The event dispatcher should use the general `helm_event` WordPress action. Broadcasting should listen to that event stream and persist only events that implement the broadcastable contract.

Each broadcastable event class should live in the domain that owns the model being broadcast and receive that domain model in its constructor. Snapshot payloads should use the same domain resource classes as REST responses so REST and event serialization cannot drift.

The initial channel should be `private-ship.{shipId}` for both action and state events. Ship action updates should use `ship.action.updated`, reference the action with `resource_type = ship_action` and `resource_id = {actionId}`, and include the standard serialized action shape in the payload so the browser can upsert it directly.

Ship state updates should use `ship.state.updated`, reference the ship with `resource_type = ship` and `resource_id = {shipPostId}`, and include only the operational state owned by the ship state table. It should not include the full REST ship resource with cargo, systems, or embeds.

Related subsystem changes should use separate event types. For example, systems, cargo, navigation discoveries, and future DSP data should not be smuggled into the ship state event unless they are actually part of operational ship state. Each event type owns its payload contract, so producers do not need to store or choose a separate payload strategy.
