---
status: draft
area: dev
priority: p1
depends_on:
    - broadcast-01-add-event-outbox
---

# Publish ship broadcast events

## Problem

Ship action and ship state changes are the updates the bridge most needs, but they are not represented as first-class broadcast events. The current heartbeat path can send action payloads, while ship state refresh depends on ad hoc client invalidation. That split is fragile and is causing frontend synchronization problems as multiphase actions update both action progress and current ship state.

## Proposed solution

Publish broadcast events when ship actions and operational ship state change. Ship action updates may broadcast the full action record as a snapshot because the record is small and self-contained. Ship state updates should broadcast the operational state owned by the ship state table, not the full REST ship resource with cargo, systems, or embeds.

Related subsystem changes should use separate events or pull hints. For example, systems, cargo, navigation discoveries, and future DSP data should not be smuggled into the ship state event unless they are actually part of operational ship state.
