---
status: draft
area: dev
priority: p1
---

# Standardize multiphase action processing

## Problem

Multiphase actions do not have a clear processing contract. A resolver can leave an action non-final with a new `deferred_until`, but the action processor treats that as one completed unit of work and waits for a later queue pass. When processing is late, the next phase may be scheduled from processing time instead of game time, which stretches long-running actions.

## Proposed solution

Define the shared convention for multiphase actions. A resolver may continue to handle only one phase, but it must be able to leave the action ready again when more elapsed phases are due. The action processor should recognize a non-final action whose `deferred_until` is still in the past and process it again within safe batch and loop limits, or persist it with a backdated `deferred_until` so the normal queue claim path picks it up immediately.

Keep the queue model authoritative. Resolvers should report phase progress and the next due time; shared action lifecycle code should own claiming, releasing, broadcasts, retry safety, and final-state cleanup.
